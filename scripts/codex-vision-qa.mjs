/**
 * codex-vision-qa.mjs — Codex(GPT) 비전 교차검증 QA 엔진 (2026-06-13)
 *
 * 목적: 그림책 일러스트를 Claude(Opus) 단독이 아니라 **다른 모델 family인 Codex(GPT)**로도
 *       독립 검수한다. 두 축을 한 호출에 검사:
 *   A) 해부학 — 사람(손가락 5/팔 2/다리 2) + 동물(종별 다리 수·날개/물갈퀴·부유/중복 사지)
 *   B) 캐릭터 일관성 — 표지(앵커 -i) + 정본 char 텍스트 대비 종/색 드리프트 (흰 고양이→노랑 고양이)
 *
 * 교차검증 원칙: 모델 다양성이 핵심. Claude끼리는 오류 상관 → 반드시 GPT(Codex) 사용.
 *               판정은 Opus(전수 Read)와 Codex(이 스크립트) 둘 다 HIGH면 고신뢰.
 *
 * 실측 주의(브릿지 스킬):
 *   - 프롬프트는 **stdin**으로. `-i FILE...` variadic이라 positional 프롬프트가 파일 인자로 먹힘.
 *   - `-i` 반복 전달(콤마 X). 첫 -i = 앵커(표지), 둘째 -i = 검수 대상 페이지.
 *   - 구조화 출력은 `--output-schema` + `-o <file>`로 받는다.
 *   - codex가 가끔 hang → 하드 타임아웃 SIGKILL + 재시도.
 *
 * 사용:
 *   node scripts/codex-vision-qa.mjs all                 # 전수
 *   node scripts/codex-vision-qa.mjs the-clockmakers-cat # 특정 책(들)
 *   옵션: --conc 3 --effort medium --force --limit N --covers-only
 *   리포트: scripts/.vision-qa-report.json (resumable — 이미 검사한 컷 skip)
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { STORYBOOK_PLAN } from "./storybook-plan.mjs";

const ROOT = process.cwd();
const SEED = join(ROOT, "data", "seed");
const PUB = join(ROOT, "public", "seed");
const TMP = join(ROOT, ".vqa-tmp");
const REPORT = join(ROOT, "scripts", ".vision-qa-report.json");
const SCHEMA_PATH = join(TMP, "_schema.json");

// ── CLI ─────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = argv[i + 1];
  return v && !v.startsWith("--") ? v : true;
};
const CONC = Number(flag("conc", 3));
const EFFORT = String(flag("effort", "medium")); // low|medium|high|xhigh
const FORCE = !!flag("force", false);
const LIMIT = flag("limit", null) ? Number(flag("limit", null)) : null;
const COVERS_ONLY = !!flag("covers-only", false);
const STAGGER_MS = 900;
const HARD_TIMEOUT_MS = 220000;
const RETRIES = 2;

// 옵션 키/값 토큰을 전부 걷어내고 순수 타겟 slug만 추출
const OPT_KEYS = new Set(["conc", "effort", "limit"]);
const cleanTargets = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith("--")) {
    const key = a.slice(2);
    if (OPT_KEYS.has(key)) i++; // 값 토큰 skip
    continue;
  }
  cleanTargets.push(a);
}
const ALL = cleanTargets.length === 0 || cleanTargets.includes("all");

// ── 정본 char 맵 ────────────────────────────────────────────────
const JUN = "Jun: a cheerful Korean boy about 8 years old, short tousled black hair, round friendly face, red t-shirt, blue shorts (same look every page)";
const charMap = new Map();
for (const b of STORYBOOK_PLAN) if (b.slug && b.char) charMap.set(b.slug, b.char);
// EXTRA plan은 동적 import(있으면)
try {
  const extra = (await import("./storybook-extra-books.mjs")).EXTRA_STORYBOOK_PLAN || [];
  for (const b of extra) if (b.slug && b.char) charMap.set(b.slug, b.char);
} catch { /* noop */ }

// ── 스키마 ──────────────────────────────────────────────────────
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    subjects: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          kind: { type: "string" }, // human|animal|object
          label: { type: "string" }, // e.g. "white cat", "girl"
          limbs: { type: "string" }, // 관찰한 사지 수 서술 ("4 legs, tail, 0 wings")
          anatomy_ok: { type: "boolean" },
        },
        required: ["kind", "label", "limbs", "anatomy_ok"],
      },
    },
    anatomy_pass: { type: "boolean" },
    expected_character_present: { type: "boolean" },
    matches_reference: { type: "boolean" }, // 표지/정본과 종·색 일치 (cover면 true)
    color_or_species_drift: { type: "boolean" }, // 흰고양이→노랑 등
    drift_detail: { type: "string" },
    text_in_image: { type: "boolean" },
    severity: { type: "string", enum: ["none", "low", "high"] },
    verdict: { type: "string", enum: ["PASS", "FAIL"] },
    summary: { type: "string" },
  },
  required: [
    "subjects", "anatomy_pass", "expected_character_present", "matches_reference",
    "color_or_species_drift", "drift_detail", "text_in_image", "severity", "verdict", "summary",
  ],
};

function buildPrompt({ charDesc, isCover, pageText, summary }) {
  const refLine = isCover
    ? "The attached single image is the book COVER (the canonical look). There is no separate reference; set matches_reference=true."
    : "IMAGE 1 is the REFERENCE = the book cover (canonical character look). IMAGE 2 is the PAGE under review. Judge the PAGE.";
  const ctx = pageText
    ? `\nNARRATIVE CONTEXT — this page's text reads: "${pageText}". The whole book is about: "${summary || ""}". A color/outfit/form change that the story EXPLAINS is INTENDED, NOT drift — e.g. a green leaf turning red/gold in autumn, a character wearing pajamas at bedtime or a uniform for sport, a seed growing into a sprout then a flower, day turning to night. ONLY set color_or_species_drift=true for an UNEXPLAINED change of the character's identity/species/base color that the text does not account for.`
    : "";
  return `You are a strict visual QA inspector for a children's picture book illustration (soft watercolor style; painterly hands are OK as long as the count is right).
${refLine}
The MAIN CHARACTER is intended to be: "${charDesc}".${ctx}

Inspect and report LITERALLY what is actually drawn in the page:

A) ANATOMY of every character:
 - Humans: each visible hand shows at most 5 fingers (flag a clear 6th finger, fused clump, or missing fingers), exactly 2 arms and 2 legs, no floating/extra/duplicated limbs, face not grossly malformed.
 - Animals: leg count must be natural for the species — cat/dog/fox/turtle/bear/mouse/squirrel/rabbit = 4 legs; bird/penguin/duck/owl = 2 legs + 2 wings (a penguin has 2 flippers, NOT 3); fish = fins, no legs; insect = its natural count. FLAG an animal with 3 or 5 legs, a bird/penguin with 3 wings or flippers, two heads, floating or duplicated limbs.
 Set anatomy_pass=false if ANY real anatomy error exists.

B) CHARACTER CONSISTENCY (page vs the intended description${isCover ? "" : " and the reference cover"}):
 - SAME SPECIES (a cat stays a cat, not a dog/rabbit).
 - SAME COLOR & markings — e.g. a WHITE cat must NOT appear YELLOW/orange/grey; a "grey tabby kitten" must stay grey; a "yellow duckling" must stay yellow.
 - Same signature outfit/props.
 Set color_or_species_drift=true and explain in drift_detail if the page main character differs in species or color from the intended description${isCover ? "" : " or the reference"}.

Also: text_in_image=true if any letters/words/numbers are drawn inside the illustration.

severity="high" if any real anatomy error OR species/color drift; "low" if minor or you are unsure; "none" if clean. verdict="FAIL" iff severity="high". Be precise; do not invent problems that are not visibly there. Return ONLY the JSON.`;
}

// ── 이미지 경로 해결 (png 우선, 없으면 webp→png 변환) ─────────────
function resolvePng(slug, file) {
  const png = join(PUB, slug, `${file}.png`);
  if (existsSync(png)) return png;
  const webp = join(PUB, slug, `${file}.webp`);
  if (existsSync(webp)) {
    const out = join(TMP, `${slug}__${file}.png`);
    if (!existsSync(out)) {
      const r = spawnSyncQuiet("dwebp", [webp, "-o", out]);
      if (!r || !existsSync(out)) return null;
    }
    return out;
  }
  return null;
}
function spawnSyncQuiet(cmd, args) {
  try { return spawnSync(cmd, args, { stdio: "ignore" }); } catch { return null; }
}

// ── codex 1회 호출 ──────────────────────────────────────────────
function runCodexVision({ anchorPng, pagePng, prompt, outPath }) {
  // 🔴 이전 실행의 묵은 out 파일이 남아 있으면, codex 호출이 실패(한도·hang)해도
  //    existsSync(outPath)=true 라서 거짓 성공으로 옛 verdict가 반환됨 → 호출 직전 반드시 삭제.
  try { if (existsSync(outPath)) unlinkSync(outPath); } catch { /* noop */ }
  return new Promise((resolve) => {
    const args = [
      "exec", "--skip-git-repo-check",
      "-c", `model_reasoning_effort="${EFFORT}"`,
      "--output-schema", SCHEMA_PATH,
      "-o", outPath,
    ];
    if (anchorPng) args.push("-i", anchorPng);
    args.push("-i", pagePng);

    const child = spawn("codex", args, { stdio: ["pipe", "ignore", "ignore"], detached: true });
    let done = false;
    const finish = (ok) => {
      if (done) return; done = true;
      clearTimeout(killer);
      resolve(ok);
    };
    const killer = setTimeout(() => {
      try { process.kill(-child.pid, "SIGKILL"); } catch { try { child.kill("SIGKILL"); } catch { /* noop */ } }
      finish(false);
    }, HARD_TIMEOUT_MS);
    child.on("error", () => finish(false));
    child.on("exit", () => finish(existsSync(outPath)));
    try { child.stdin.write(prompt); child.stdin.end(); } catch { /* noop */ }
  });
}

function parseVerdict(outPath) {
  try {
    const raw = readFileSync(outPath, "utf8").trim();
    // -o 파일은 순수 JSON(구조화 출력). 혹시 코드펜스 섞이면 추출.
    const m = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : raw);
  } catch { return null; }
}

// ── 작업 목록 빌드 ──────────────────────────────────────────────
function listBooks() {
  return readdirSync(SEED)
    .filter((f) => f.endsWith(".json") && f !== "_words.json")
    .map((f) => {
      const j = JSON.parse(readFileSync(join(SEED, f), "utf8"));
      const pageTexts = (j.pages || []).map((p) => (p.sentences || []).map((s) => s.text).join(" "));
      return { slug: j.slug, title: j.title, collection: j.collection, pages: j.pages?.length || 0, pageTexts, summary: j.summary_ko || j.title };
    });
}
function charFor(book) {
  if (book.collection === "daily" || /^daily-/.test(book.slug)) return JUN;
  return charMap.get(book.slug) || "the main character shown on the cover (keep species, color and outfit consistent)";
}

// ── 메인 ────────────────────────────────────────────────────────
mkdirSync(TMP, { recursive: true });
writeFileSync(SCHEMA_PATH, JSON.stringify(SCHEMA));
const report = existsSync(REPORT) ? JSON.parse(readFileSync(REPORT, "utf8")) : {};

let books = listBooks();
if (!ALL) books = books.filter((b) => cleanTargets.includes(b.slug));
if (LIMIT) books = books.slice(0, LIMIT);

// 작업 단위 = {slug, file, isCover, charDesc}
const jobs = [];
for (const b of books) {
  const charDesc = charFor(b);
  const cover = resolvePng(b.slug, "cover");
  jobs.push({ slug: b.slug, file: "cover", isCover: true, charDesc, cover, summary: b.summary });
  if (!COVERS_ONLY) {
    for (let i = 1; i <= b.pages; i++) jobs.push({ slug: b.slug, file: `p${i}`, isCover: false, charDesc, cover, pageText: b.pageTexts[i - 1] || "", summary: b.summary });
  }
}
const pending = jobs.filter((j) => FORCE || !report[`${j.slug}/${j.file}`]);
console.log(`📚 책 ${books.length} · 컷 ${jobs.length} · 미검사 ${pending.length} · conc=${CONC} effort=${EFFORT}`);
if (!pending.length) { console.log("✅ 검사할 컷 없음(모두 완료)"); printSummary(); process.exit(0); }

let idx = 0, ok = 0, fail = 0, high = 0;
const startedAt = Date.now();
function save() { writeFileSync(REPORT, JSON.stringify(report, null, 1)); }

async function worker(wid) {
  await new Promise((r) => setTimeout(r, wid * STAGGER_MS)); // 워커 진입 stagger 1회 — OAuth refresh race 회피
  while (true) {
    const job = pending[idx++];
    if (!job) return;
    const key = `${job.slug}/${job.file}`;
    const pagePng = job.isCover ? job.cover : resolvePng(job.slug, job.file);
    if (!pagePng) { report[key] = { error: "no-image", verdict: "SKIP" }; save(); continue; }
    const anchorPng = job.isCover ? null : job.cover;
    const prompt = buildPrompt({ charDesc: job.charDesc, isCover: job.isCover, pageText: job.pageText, summary: job.summary });
    const outPath = join(TMP, `out__${job.slug}__${job.file}.json`);

    let verdict = null;
    for (let attempt = 0; attempt <= RETRIES && !verdict; attempt++) {
      const success = await runCodexVision({ anchorPng, pagePng, prompt, outPath });
      if (success) verdict = parseVerdict(outPath);
      if (!verdict && attempt < RETRIES) await new Promise((r) => setTimeout(r, 1500));
    }
    if (!verdict) { report[key] = { error: "codex-failed", verdict: "ERROR" }; fail++; }
    else {
      report[key] = verdict;
      if (verdict.verdict === "FAIL" || verdict.severity === "high") high++;
      ok++;
    }
    save();
    const n = ok + fail;
    if (n % 5 === 0 || verdict?.severity === "high") {
      const flag = verdict?.severity === "high" ? `  🔴 HIGH ${key}: ${verdict.summary?.slice(0, 90)}` : "";
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      console.log(`[${n}/${pending.length}] ok=${ok} fail=${fail} high=${high} ${elapsed}s${flag}`);
    }
  }
}

await Promise.all(Array.from({ length: CONC }, (_, i) => worker(i)));
save();
console.log(`\n=== 완료: 검사 ${ok} · 실패 ${fail} · HIGH ${high} ===`);
printSummary();

function printSummary() {
  const highs = Object.entries(report).filter(([, v]) => v && (v.verdict === "FAIL" || v.severity === "high"));
  const drift = highs.filter(([, v]) => v.color_or_species_drift);
  const anat = highs.filter(([, v]) => v.anatomy_pass === false);
  const txt = Object.entries(report).filter(([, v]) => v && v.text_in_image);
  console.log(`\n📋 HIGH ${highs.length}건  (해부학 ${anat.length} · 종/색드리프트 ${drift.length} · 텍스트박힘 ${txt.length})`);
  for (const [k, v] of highs.slice(0, 60)) {
    console.log(`  🔴 ${k}  [${v.anatomy_pass === false ? "ANAT " : ""}${v.color_or_species_drift ? "DRIFT" : ""}]  ${(v.summary || v.drift_detail || "").slice(0, 100)}`);
  }
}
