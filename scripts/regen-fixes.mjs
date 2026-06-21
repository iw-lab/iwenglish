/**
 * 전수검사 확정 결함 타깃 재생성 — codex $imagegen, conc=1(오염·한도 안전).
 * gen-book-images.mjs 의 STYLE/povFor/visualLevel/sceneFromPage/runCodex/md5-dedup 로직을 이식하되,
 * 결함 종류별 NEG 오버라이드:
 *   - prop  : 백지 prop 방지(포스터·보드·카드·화면을 컬러풀 장식으로 채움, 단 읽을 수 있는 글자는 금지)
 *   - style : 수채화 강제(애니/만화/플랫 금지)
 *   - corrupt/anatomy : 기본 NEG (anatomy는 5손가락 강조 추가)
 *
 * 사용:  node scripts/regen-fixes.mjs [conc=1]
 */
import { spawn } from "node:child_process";
import { readFileSync, readdirSync, existsSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { PLAN, CAST } from "./daily-expansion-plan.mjs";

const ROOT = process.cwd();
const SEED = join(ROOT, "data", "seed");
const PUB = join(ROOT, "public", "seed");
const RES = "1536x1024";
const PER_TIMEOUT = 480000;
const RETRY = Math.max(1, Number(process.env.GEN_RETRY ?? 3));

// ── 확정 결함 목록 (전수검사 7/8 그룹 + 사용자 신고). 그룹6 미검수(사용자 승인 skip) ──
const DEFECTS = [
  // 사용자 신고 (daily-10/p6 6손가락은 이미 정상 재생성 완료)
  { slug: "daily-140-the-festival-plan", page: 1, kind: "prop" }, // 오염(생일이미지)→축제포스터
  // blank-prop (백지 prop) — 슬러그는 실제 디렉토리명으로 확정
  { slug: "daily-91-the-rainy-game", page: 7, kind: "prop" },
  { slug: "daily-139-the-mentor-program", page: 12, kind: "prop" },
  { slug: "daily-147-the-time-capsule", page: 7, kind: "prop" },
  { slug: "daily-140-the-festival-plan", page: 4, kind: "prop" },
  { slug: "daily-140-the-festival-plan", page: 6, kind: "prop" },
  { slug: "daily-134-the-school-radio", page: 6, kind: "prop" },
  { slug: "daily-134-the-school-radio", page: 8, kind: "prop" },
  { slug: "daily-134-the-school-radio", page: 9, kind: "prop" },
  { slug: "daily-142-the-invention-fair", page: 7, kind: "prop" },
  { slug: "daily-142-the-invention-fair", page: 12, kind: "prop" },
  { slug: "daily-150-the-graduation-plan", page: 3, kind: "prop" },
  { slug: "daily-150-the-graduation-plan", page: 6, kind: "prop" },
  { slug: "daily-95-the-tree-house", page: 3, kind: "prop" },
  { slug: "daily-89-the-surprise-party", page: 9, kind: "prop" },
  { slug: "daily-145-the-kindness-campaign", page: 11, kind: "prop" },
  { slug: "daily-145-the-kindness-campaign", page: 12, kind: "prop" },
  { slug: "daily-90-the-class-trip", page: 7, kind: "prop" },
  // 그룹3 추가
  { slug: "daily-69-the-morning-bus", page: 4, kind: "prop" },
  { slug: "daily-77-waiting-for-the-train", page: 1, kind: "prop" },
  { slug: "daily-149-the-coding-club", page: 4, kind: "prop" },
  // 손상 이미지
  { slug: "daily-70-my-breakfast", page: 7, kind: "corrupt" },
  // 화풍 이상치
  { slug: "daily-98-the-art-class", page: 4, kind: "style" },
];

// ── 헬퍼 이식 ──
const md5 = (p) => createHash("md5").update(readFileSync(p)).digest("hex");
const HASHES = new Map();
function buildHashMap() {
  if (!existsSync(PUB)) return;
  for (const slug of readdirSync(PUB)) {
    let files;
    try { files = readdirSync(join(PUB, slug)); } catch { continue; }
    for (const f of files) {
      if (!/\.(png|webp)$/i.test(f)) continue;
      const fp = join(PUB, slug, f);
      try { HASHES.set(md5(fp), fp); } catch { /* noop */ }
    }
  }
}

const CAST_BY_SLUG = Object.fromEntries(
  PLAN.map((p) => [p.slug, p.cast.map((c) => CAST[c]).filter(Boolean)]),
);
const STYLE =
  "Soft watercolor children's picture-book illustration, warm gentle light, cozy storybook mood, painterly, wholesome, friendly, full background scene.";
const POV_JUN =
  "Main character Jun: a cheerful Korean boy ~8, short tousled black hair, round friendly face, red t-shirt, blue shorts. Same look every page.";
function povFor(b) {
  const cast = CAST_BY_SLUG[b.slug];
  if (!cast || cast.length === 0) return POV_JUN;
  if (cast.length === 1) return `Main character ${cast[0]}. Keep the exact same look every page.`;
  return (
    `Recurring characters (keep each one's look IDENTICAL on every page): ${cast.join("; ")}. ` +
    `Draw ONLY the characters that appear in the scene described below; do not add extra people.`
  );
}
const STAGE_VISUAL = {
  1: "Stage 1 visual difficulty: one clear action, one main object, uncluttered background, close or medium shot, very easy for young learners to read.",
  2: "Stage 2 visual difficulty: simple everyday scene with 2-3 objects, clear left-to-right action, gentle classroom or home details.",
  3: "Stage 3 visual difficulty: cause-and-effect scene, 3-4 meaningful objects, visible emotion, slightly richer background details.",
  4: "Stage 4 visual difficulty: sequential problem-solving moment, clear foreground action plus supporting background clues, balanced medium-wide composition.",
  5: "Stage 5 visual difficulty: richer B1 story moment with community context, multiple readable visual clues, layered but calm composition.",
  6: "Stage 6 visual difficulty: advanced B1 spread-like scene with planning, reflection, or cause/effect; more environmental detail while keeping the child protagonist readable.",
};
const visualLevel = (b) =>
  STAGE_VISUAL[b.stage] ?? "General picture-book visual difficulty: clear child-centered story scene.";
const stripQuotes = (s) => s.replace(/[""]/g, '"');
const sceneFromPage = (p) =>
  p.sentences.map((s) => stripQuotes(s.text)).join(" ").slice(0, 280);

// 결함 종류별 NEG
const NEG_BASE =
  "5-finger hands, natural pose. NOT cartoon/anime/manga/chibi, no big anime eyes, NOT sticker on white, NOT comic panel. NOT Chinese/Greek/Roman/Japanese-samurai, NOT historical costume. Korean modern everyday setting.";
const NEG = {
  prop:
    "Any poster, sign, board, banner, paper, card, screen or chalkboard shown MUST be filled edge-to-edge with a cheerful colorful hand-painted decorative design (drawings, festive shapes, patterns, bunting, balloons, stars, simple pictures) — it must clearly NOT be blank, NOT empty white, NOT a plain blank sheet. Use ONLY decorative pictures/abstract marks, NO readable words, letters or numbers. " + NEG_BASE,
  style:
    "STRICT: no text/letters in image. The whole image MUST be a soft hand-painted watercolor picture-book illustration — absolutely NOT anime, NOT cartoon, NOT cel-shaded, NOT flat digital, NOT manga. " + NEG_BASE,
  corrupt: "STRICT: no text/letters in image. " + NEG_BASE,
  anatomy:
    "STRICT: no text/letters in image. Every hand has EXACTLY five fingers, drawn cleanly and correctly; no extra fingers, no fused fingers. " + NEG_BASE,
};

function runCodex({ dir, out, prompt, anchor, salt }) {
  return new Promise((resolve) => {
    const args = ["exec", "--full-auto", "--add-dir", dir, "--skip-git-repo-check"];
    if (anchor && existsSync(anchor)) args.push("--image", anchor);
    const saltLine = salt
      ? `\n[unique:${salt}] 이 이미지는 다른 모든 페이지와 시각적으로 분명히 다른 새 그림이어야 함. 캐시·기존 generated_images 파일을 절대 재사용하지 말 것.`
      : "";
    args.push(
      "--",
      `$imagegen 다음 조건으로 그림책 일러스트 1장 생성 후 반드시 아래 경로에 PNG로 저장.\n${prompt}${saltLine}\n저장 경로: ${out}\n해상도: ${RES}\n작업 규칙(중요): $imagegen 도구를 즉시 1회만 호출하고, 생성 즉시 위 경로에 저장 후 바로 종료할 것.\n- 생성된 이미지를 열어 검사·재평가·재생성하지 말 것. 사소한 결점이 보여도 그대로 저장.\n- 기존 generated_images나 다른 책의 이미지를 복사·재사용하지 말 것. 반드시 새로 생성.\n- 스킬 reference 문서나 image_gen.py CLI fallback을 읽거나 사용하지 말 것.\n- 질문·승인 대기 금지. 도구가 서버 오류를 반환한 경우에만 1회 재시도.`,
    );
    const child = spawn("codex", args, { detached: true, stdio: ["ignore", "pipe", "pipe"] });
    let outBuf = "";
    const killTree = (sig) => {
      try { process.kill(-child.pid, sig); } catch { try { child.kill(sig); } catch { /* noop */ } }
    };
    let lastData = Date.now();
    const silent = setInterval(() => {
      if (Date.now() - lastData > 240000) { clearInterval(silent); killTree("SIGTERM"); setTimeout(() => killTree("SIGKILL"), 1500).unref(); }
    }, 15000);
    child.stdout.on("data", (d) => { lastData = Date.now(); outBuf += d.toString(); });
    child.stderr.on("data", (d) => { lastData = Date.now(); outBuf += d.toString(); });
    const t = setTimeout(() => { killTree("SIGTERM"); setTimeout(() => killTree("SIGKILL"), 1500).unref(); }, PER_TIMEOUT);
    const fin = () => { clearTimeout(t); clearInterval(silent); resolve(existsSync(out)); };
    child.on("exit", fin);
    child.on("error", fin);
  });
}

function loadBook(slug) {
  for (const f of readdirSync(SEED)) {
    if (!f.endsWith(".json") || f.startsWith("_")) continue;
    const b = JSON.parse(readFileSync(join(SEED, f), "utf8"));
    if (b.slug === slug) return b;
  }
  return null;
}

async function fixOne(def) {
  const b = loadBook(def.slug);
  if (!b) { console.log(`❌ ${def.slug} seed 없음`); return false; }
  const p = b.pages[def.page - 1];
  if (!p) { console.log(`❌ ${def.slug} p${def.page} 없음`); return false; }
  const dir = join(PUB, b.slug);
  const out = join(dir, `p${def.page}.png`);
  const webp = out.replace(/\.png$/, ".webp");
  const cover = join(dir, "cover.png");
  const label = `${b.slug} p${def.page} [${def.kind}]`;
  for (const f of [out, webp]) {
    if (existsSync(f)) { try { HASHES.delete(md5(f)); } catch {} try { unlinkSync(f); } catch {} }
  }
  const neg = NEG[def.kind] ?? NEG.corrupt;
  const prompt = `${STYLE}\n${povFor(b)}\n${visualLevel(b)}\nScene: ${sceneFromPage(p)}\nMatch cover characters and art style exactly.\n${neg}`;
  for (let a = 1; a <= RETRY; a++) {
    const salt = `fix-${b.slug}-p${def.page}-a${a}-${Math.floor(Math.random() * 1e6)}`;
    const ok = await runCodex({ dir, out, prompt, anchor: cover, salt });
    if (!ok) { console.log(`↻ ${label} 생성실패 ${a}/${RETRY}`); continue; }
    let h;
    try { h = md5(out); } catch { console.log(`↻ ${label} 저장누락 ${a}/${RETRY}`); continue; }
    if (HASHES.has(h) && HASHES.get(h) !== out) {
      console.log(`🚫 ${label} 중복오염(=${HASHES.get(h)}) 폐기 ${a}/${RETRY}`);
      try { unlinkSync(out); } catch {}
      continue;
    }
    HASHES.set(h, out);
    console.log(`✅ ${label}`);
    return true;
  }
  console.log(`⚠️ ${label} 미생성(재시도 소진)`);
  return false;
}

async function main() {
  const conc = Math.max(1, Number(process.argv[2] ?? 1));
  buildHashMap();
  console.log(`[regen-fixes] 대상 ${DEFECTS.length}건, conc=${conc}, retry=${RETRY}`);
  let idx = 0, ok = 0, fail = 0;
  const worker = async () => {
    while (idx < DEFECTS.length) {
      const d = DEFECTS[idx++];
      await new Promise((r) => setTimeout(r, 900));
      const r = await fixOne(d);
      if (r) ok++; else fail++;
    }
  };
  await Promise.all(Array.from({ length: Math.min(conc, DEFECTS.length) }, worker));
  console.log(`[regen-fixes] 완료 — 성공 ${ok} / 실패 ${fail}`);
}
main();
