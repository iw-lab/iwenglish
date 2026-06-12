/**
 * 그림책 50권 codex 교차검수 — 4청크 병렬 codex exec, 각 청크 JSON 리포트 작성.
 * 텍스트 검수(이미지 아님)라 OAuth race 무관, 병렬 자유.
 *   node scripts/codex-review-storybooks.mjs
 * 출력: scripts/.codex-review/chunk-{n}.json  → 병합 scripts/.codex-review/all.json
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { STORYBOOK_PLAN } from "./storybook-plan.mjs";

const ROOT = process.cwd();
const OUTDIR = join(ROOT, "scripts", ".codex-review");
mkdirSync(OUTDIR, { recursive: true });
const PER_TIMEOUT = 600000; // 10분
const CHUNKS = 4;

const slugs = STORYBOOK_PLAN.map((b) => b.slug);
const chunks = Array.from({ length: CHUNKS }, () => []);
slugs.forEach((s, i) => chunks[i % CHUNKS].push(s));

function prompt(list, outPath) {
  return `You are a STRICT bilingual (English + Korean) editor reviewing GRADED EFL picture books for Korean elementary students (CEFR preA1 < A1 < A2 < B1). Cross-check another writer's work.

Review ONLY these book files (read each from data/seed/<slug>.json):
${list.map((s) => "- data/seed/" + s + ".json").join("\n")}

For EACH book check:
1) English grammar / naturalness errors (article, tense, agreement, awkward phrasing).
2) Level fit: vocabulary & grammar must match the file's "level". Flag TOO HARD (e.g. B1 idiom in a preA1 book) or TOO EASY/too short for the level.
3) Korean "translation_ko": accuracy vs the English, and natural child-friendly Korean (not stiff/literal). Flag mistranslations.
4) Quiz: each item's answerIndex must be actually correct given the story; options plausible; questions clear in Korean.
5) Editor rules: meta-narration (mentions of book/page/level), markdown ** , em-dash overuse, summary_ko containing English, repeated sentence openings.

Severity: "high" = wrong/misleading (grammar error, wrong quiz answer, mistranslation). "med" = level mismatch or unnatural. "low" = style nit.

Write your findings as VALID JSON ONLY to the file ${outPath} (overwrite). Schema:
[ { "slug": "...", "where": "p3 | quiz#2 | summary | global", "severity": "high|med|low", "issue": "...", "suggestion": "concrete fix" } ]
If a book is clean, add nothing for it. Do NOT write prose outside the JSON file. Keep suggestions concrete and minimal.`;
}

function runChunk(idx) {
  const list = chunks[idx];
  const outPath = join(OUTDIR, `chunk-${idx}.json`);
  try { if (existsSync(outPath)) writeFileSync(outPath, ""); } catch {}
  const args = ["exec", "--full-auto", "--add-dir", ROOT, "--skip-git-repo-check", "--", prompt(list, outPath)];
  return new Promise((resolve) => {
    const child = spawn("codex", args, { stdio: "ignore", cwd: ROOT });
    const timer = setTimeout(() => { try { child.kill("SIGKILL"); } catch {} }, PER_TIMEOUT);
    const fin = () => {
      clearTimeout(timer);
      let ok = false;
      try { JSON.parse(readFileSync(outPath, "utf8")); ok = true; } catch {}
      console.log(`청크 ${idx} (${list.length}권) ${ok ? "✅ JSON ok" : "⚠️ JSON 없음/깨짐"}`);
      resolve(ok);
    };
    child.on("exit", fin);
    child.on("error", fin);
  });
}

console.log(`🔎 codex 교차검수 ${slugs.length}권 → ${CHUNKS}청크 병렬`);
const oks = await Promise.all(chunks.map((_, i) => new Promise((r) => setTimeout(() => runChunk(i).then(r), i * 1000))));

// 병합
const all = [];
for (let i = 0; i < CHUNKS; i++) {
  const p = join(OUTDIR, `chunk-${i}.json`);
  try { const arr = JSON.parse(readFileSync(p, "utf8")); if (Array.isArray(arr)) all.push(...arr); } catch {}
}
writeFileSync(join(OUTDIR, "all.json"), JSON.stringify(all, null, 2));
const bySev = all.reduce((m, x) => ((m[x.severity] = (m[x.severity] || 0) + 1), m), {});
console.log(`병합 ${all.length}건 ${JSON.stringify(bySev)} → scripts/.codex-review/all.json`);
console.log(`청크성공 ${oks.filter(Boolean).length}/${CHUNKS}`);
console.log("CODEX_REVIEW_DONE");
