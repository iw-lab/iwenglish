/**
 * codex-text-qa.mjs — 원고 교차검증 (GPT/Spark, 텍스트 전용) 2026-06-17
 *
 * 목적: 신규 생활영어 시드(원고)를 Claude와 독립적으로 GPT(gpt-5.3-codex-spark)로
 *       교차검증. 이미지 입력 없음(Spark는 비전 미지원) → 순수 텍스트 검수.
 *       영어 문법·한글 번역 정확도·CEFR 레벨 적합성·퀴즈 타당성·서사 일관성·메타대사·연령 적합성.
 *
 * Spark = 정규 codex와 별도 quota → 정규 주간 한도 0%여도 동작 (CLAUDE.md HARD 룰).
 *
 * 사용:
 *   node scripts/codex-text-qa.mjs                       # data/seed_pending 전수
 *   node scripts/codex-text-qa.mjs --dir data/seed       # 다른 디렉터리
 *   node scripts/codex-text-qa.mjs daily-100-the-special-gift  # 특정 책(들)
 *   node scripts/codex-text-qa.mjs --limit 5 --conc 3
 *
 * codex hang 방어: spawn + 하드 타임아웃 SIGKILL + 재시도. conc=3 + stagger 900ms.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const TMP = join(ROOT, ".tqa-tmp");
const SCHEMA_PATH = join(TMP, "_schema.json");

// ── CLI ─────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = argv[i + 1];
  return v && !v.startsWith("--") ? v : true;
};
const DIR = String(flag("dir", "data/seed_pending"));
const SEED = join(ROOT, DIR);
const REPORT = join(ROOT, "scripts", `.text-qa-report.json`);
const MODEL = String(flag("model", "gpt-5.3-codex-spark"));
const CONC = Number(flag("conc", 3));
const EFFORT = String(flag("effort", "medium"));
const FORCE = !!flag("force", false);
const LIMIT = flag("limit", null) ? Number(flag("limit", null)) : null;
const STAGGER_MS = 900;
const HARD_TIMEOUT_MS = 220000;
const RETRIES = 2;

const OPT_KEYS = new Set(["dir", "model", "conc", "effort", "limit"]);
const cleanTargets = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith("--")) { const key = a.slice(2); if (OPT_KEYS.has(key)) i++; continue; }
  cleanTargets.push(a);
}
const ALL = cleanTargets.length === 0 || cleanTargets.includes("all");

// ── 구조화 출력 스키마 ───────────────────────────────────────────
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    english_errors: { type: "array", items: { type: "string" } },     // 문법/철자/어색한 표현 ("p3: 'He go' → 'He goes'")
    translation_issues: { type: "array", items: { type: "string" } }, // 한글 번역 오역/누락/어색
    level_fit: { type: "string", enum: ["too_easy", "appropriate", "too_hard"] },
    level_note: { type: "string" },
    quiz_issues: { type: "array", items: { type: "string" } },        // 본문으로 못 푸는 문항/오답 처리
    narrative_issues: { type: "array", items: { type: "string" } },   // 서사 비약·인물 이름/성별 드리프트·논리 모순
    meta_dialogue: { type: "array", items: { type: "string" } },      // "다음 권/N화" 등 메타 언급
    inappropriate: { type: "array", items: { type: "string" } },      // 연령 부적합
    severity: { type: "string", enum: ["none", "low", "high"] },
    verdict: { type: "string", enum: ["PASS", "FAIL"] },
    summary: { type: "string" },
  },
  required: ["english_errors", "translation_issues", "level_fit", "level_note", "quiz_issues", "narrative_issues", "meta_dialogue", "inappropriate", "severity", "verdict", "summary"],
};

// ── 원고 → 검수용 텍스트 ─────────────────────────────────────────
function buildManuscript(j) {
  const lines = [];
  lines.push(`TITLE: ${j.title}  (KO: ${j.title_ko || ""})`);
  lines.push(`CEFR LEVEL: ${j.level} | STAGE: ${j.stage} | AGE BAND: ${j.ageBand}`);
  lines.push(`SUMMARY(KO): ${j.summary_ko || ""}`);
  lines.push("");
  lines.push("PAGES (English / Korean translation):");
  (j.pages || []).forEach((p, pi) => {
    (p.sentences || []).forEach((s, si) => {
      lines.push(`  p${pi + 1}.s${si + 1}: EN: ${s.text}`);
      lines.push(`         KO: ${s.translation_ko || ""}`);
    });
  });
  if (Array.isArray(j.quiz) && j.quiz.length) {
    lines.push("");
    lines.push("QUIZ (question in Korean, about the English story; verify the marked answer index is correct):");
    j.quiz.forEach((q, qi) => {
      const opts = (q.options || q.choices || []).map((o, oi) => `[${oi}] ${typeof o === "string" ? o : o.text}`).join("  ");
      const ans = q.answerIndex ?? q.answer ?? q.correct;
      lines.push(`  Q${qi + 1}: ${q.question_ko || q.question || q.prompt || ""}`);
      lines.push(`        options: ${opts}`);
      lines.push(`        marked answer index: ${ans}${q.explain_ko ? `  (explain: ${q.explain_ko})` : ""}`);
    });
  }
  return lines.join("\n");
}

function buildPrompt(j) {
  return `You are an expert ESL editor and Korean-English translator reviewing a children's English picture book manuscript for publication. Review the manuscript below and report ONLY genuine problems.

The book targets CEFR level ${j.level} (stage ${j.stage}, ages ${j.ageBand}). Vocabulary and sentence complexity should match that level.

Check, reporting findings as short strings (cite the page like "p3.s1"):
- english_errors: real grammar, spelling, agreement, tense, article, or clearly unnatural-for-a-native-child phrasing. Do NOT flag correct simple sentences.
- translation_issues: Korean translation that changes the English meaning, drops information, or is unnatural Korean. Honorifics should be child-friendly (해요체).
- level_fit: is vocabulary/grammar appropriate, too_easy, or too_hard for ${j.level}? Put detail in level_note.
- quiz_issues: any quiz question NOT answerable from the text, or whose marked answer is wrong, or whose options are ambiguous.
- narrative_issues: story logic gaps, or character NAME/GENDER inconsistency within this one book (e.g. a character called "he" then "she", or a name that changes), or a page that contradicts another.
- meta_dialogue: any reference to "next book / volume / chapter / series" inside the story text (chapter-style headings are fine).
- inappropriate: anything unsafe or not age-appropriate for ${j.ageBand}.

Set severity="high" (and verdict="FAIL") ONLY if there is a real grammatical error, a wrong quiz answer, a meaning-changing mistranslation, age-inappropriate content, or meta-dialogue. Level mismatch or minor awkwardness = "low". Clean = "none" and verdict="PASS". Use empty arrays for categories with no findings. Be precise; do not invent problems. Write summary in Korean (1 sentence). Return ONLY the JSON.

=== MANUSCRIPT ===
${buildManuscript(j)}`;
}

// ── codex 1회 호출 (텍스트 전용, 이미지 없음) ────────────────────
function runCodex({ prompt, outPath }) {
  try { if (existsSync(outPath)) unlinkSync(outPath); } catch { /* noop */ }
  return new Promise((resolve) => {
    const args = [
      "exec", "--skip-git-repo-check",
      "-m", MODEL,
      "-c", `model_reasoning_effort="${EFFORT}"`,
      "--output-schema", SCHEMA_PATH,
      "-o", outPath,
    ];
    const child = spawn("codex", args, { stdio: ["pipe", "ignore", "ignore"], detached: true });
    let done = false;
    const finish = (ok) => { if (done) return; done = true; clearTimeout(killer); resolve(ok); };
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
    const m = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : raw);
  } catch { return null; }
}

// ── 작업 목록 ────────────────────────────────────────────────────
function listBooks() {
  return readdirSync(SEED)
    .filter((f) => f.endsWith(".json") && f !== "_words.json")
    .map((f) => JSON.parse(readFileSync(join(SEED, f), "utf8")))
    .filter((j) => j && j.slug);
}

// ── 메인 ────────────────────────────────────────────────────────
mkdirSync(TMP, { recursive: true });
writeFileSync(SCHEMA_PATH, JSON.stringify(SCHEMA));
const report = existsSync(REPORT) ? JSON.parse(readFileSync(REPORT, "utf8")) : {};

let books = listBooks();
if (!ALL) books = books.filter((b) => cleanTargets.includes(b.slug));
if (LIMIT) books = books.slice(0, LIMIT);

const pending = books.filter((b) => FORCE || !report[b.slug]);
console.log(`📖 원고 교차검증 (${MODEL}) · 책 ${books.length} · 미검수 ${pending.length} · conc=${CONC} effort=${EFFORT} dir=${DIR}`);
if (!pending.length) { console.log("✅ 검수할 책 없음(모두 완료)"); printSummary(); process.exit(0); }

let idx = 0, ok = 0, fail = 0, high = 0;
const startedAt = Date.now();
const save = () => writeFileSync(REPORT, JSON.stringify(report, null, 1));

async function worker(wid) {
  await new Promise((r) => setTimeout(r, wid * STAGGER_MS));
  while (true) {
    const b = pending[idx++];
    if (!b) return;
    const prompt = buildPrompt(b);
    const outPath = join(TMP, `out__${b.slug}.json`);
    let verdict = null;
    for (let attempt = 0; attempt <= RETRIES && !verdict; attempt++) {
      const success = await runCodex({ prompt, outPath });
      if (success) verdict = parseVerdict(outPath);
      if (!verdict && attempt < RETRIES) await new Promise((r) => setTimeout(r, 1500));
    }
    if (!verdict) { report[b.slug] = { error: "codex-failed", verdict: "ERROR" }; fail++; }
    else {
      report[b.slug] = verdict;
      if (verdict.verdict === "FAIL" || verdict.severity === "high") high++;
      ok++;
    }
    save();
    const n = ok + fail;
    const flag = verdict?.severity === "high" ? `  🔴 ${b.slug}: ${(verdict.summary || "").slice(0, 80)}` : "";
    if (n % 5 === 0 || verdict?.severity === "high") {
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      console.log(`[${n}/${pending.length}] ok=${ok} fail=${fail} high=${high} ${elapsed}s${flag}`);
    }
  }
}

await Promise.all(Array.from({ length: CONC }, (_, i) => worker(i)));
save();
console.log(`\n=== 완료: 검수 ${ok} · 실패 ${fail} · HIGH ${high} ===`);
printSummary();

function printSummary() {
  const entries = Object.entries(report);
  const highs = entries.filter(([, v]) => v && (v.verdict === "FAIL" || v.severity === "high"));
  const errs = entries.filter(([, v]) => v && v.error);
  const cnt = (k) => entries.reduce((a, [, v]) => a + ((v && Array.isArray(v[k])) ? v[k].length : 0), 0);
  console.log(`\n📋 HIGH/FAIL ${highs.length}건 · codex실패 ${errs.length}`);
  console.log(`   영어오류 ${cnt("english_errors")} · 번역이슈 ${cnt("translation_issues")} · 퀴즈이슈 ${cnt("quiz_issues")} · 서사이슈 ${cnt("narrative_issues")} · 메타대사 ${cnt("meta_dialogue")} · 부적합 ${cnt("inappropriate")}`);
  const tooHard = entries.filter(([, v]) => v && v.level_fit === "too_hard");
  const tooEasy = entries.filter(([, v]) => v && v.level_fit === "too_easy");
  console.log(`   레벨: too_hard ${tooHard.length} · too_easy ${tooEasy.length}`);
  for (const [k, v] of highs.slice(0, 80)) {
    console.log(`  🔴 ${k}  ${(v.summary || "").slice(0, 110)}`);
  }
}
