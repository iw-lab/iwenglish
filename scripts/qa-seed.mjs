/**
 * 전권 시드 콘텐츠 기계 검수 — 스키마/퀴즈/텍스트룰/레벨사다리/dict 커버리지.
 *   node scripts/qa-seed.mjs [--json] [--book <slug>]
 * 읽기 전용(외부 API 호출 없음). ERROR > 0 이면 exit 1.
 *
 * 임계값은 전권 실측 기반(2026-06):
 *  - 스토리북 단어수 밴드: preA1 20~90 / A1 40~135 / A2 80~215 / B1 200~340
 *  - daily 단어수 밴드: stage별 평균(28/42/59/68/102/201) ±60%
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED = join(ROOT, "data", "seed");
const DICT = join(ROOT, "public", "dict.json");

// ---------- CLI ----------
const argv = process.argv.slice(2);
const asJson = argv.includes("--json");
const bookArg = argv.includes("--book") ? argv[argv.indexOf("--book") + 1] : null;

// ---------- 상수 ----------
const LEVELS = new Set(["preA1", "A1", "A2", "B1"]);
const REQUIRED = ["slug", "title", "title_ko", "level", "ageBand", "summary_ko", "pages", "words", "quiz"];
// 스토리북 레벨별 총 단어수 밴드(실측 p10~max 기반 느슨하게)
const STORY_BAND = { preA1: [20, 90], A1: [40, 135], A2: [80, 215], B1: [200, 340] };
// daily stage별 평균 ±60%
const DAILY_AVG = { 1: 28, 2: 42, 3: 59, 4: 68, 5: 102, 6: 201 };

const enWordCount = (s) => (s.match(/[A-Za-z']+/g) || []).length;
// src/lib/utils.ts tokenizeWords/normalizeWord 정합 — dict.json 키가 하이픈·아포스트로피 보존(grown-ups 등)
const tokensLower = (s) =>
  (s.normalize("NFKC").replace(/[‘’]/g, "'").match(/[A-Za-z0-9']+(?:[-'][A-Za-z0-9']+)*/g) || [])
    .map((w) => w.toLowerCase().replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, ""))
    .filter(Boolean);

// ---------- 사전 ----------
let dictKeys = new Set();
try {
  const dict = JSON.parse(readFileSync(DICT, "utf8"));
  dictKeys = new Set(Object.keys(dict).map((k) => k.toLowerCase()));
} catch (e) {
  console.error(`dict.json 로드 실패: ${e.message} — words 커버리지 검사 생략`);
}

// ---------- 권별 검사 ----------
const files = readdirSync(SEED)
  .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
  .filter((f) => !bookArg || f === `${bookArg}.json`)
  .sort();

if (bookArg && files.length === 0) {
  console.error(`--book ${bookArg}: data/seed/${bookArg}.json 없음`);
  process.exit(1);
}

const results = [];

for (const f of files) {
  const fileSlug = f.replace(/\.json$/, "");
  const errors = []; // 배포를 막아야 하는 진짜 결함
  const warns = []; // 점검 권장
  const E = (m) => errors.push(m);
  const W = (m) => warns.push(m);

  let b;
  try {
    b = JSON.parse(readFileSync(join(SEED, f), "utf8"));
  } catch (e) {
    results.push({ slug: fileSlug, errors: [`JSON 파싱 실패 — ${e.message}`], warns: [], words: 0 });
    continue;
  }

  // --- 1. 스키마 ---
  for (const k of REQUIRED) if (b[k] === undefined) E(`필수필드 누락 '${k}'`);
  if (b.slug && b.slug !== fileSlug) E(`slug '${b.slug}' ↔ 파일명 '${fileSlug}' 불일치`);
  if (b.level !== undefined && !LEVELS.has(b.level)) E(`level '${b.level}' 유효하지 않음(preA1|A1|A2|B1)`);

  const isDaily = b.collection === "daily" || /^daily-\d+-/.test(fileSlug);
  if (isDaily) {
    if (b.collection !== "daily") E(`daily책 collection 누락/불일치('${b.collection}')`);
    if (!Number.isInteger(b.stage) || b.stage < 1 || b.stage > 6) E(`daily책 stage 누락/범위밖(${b.stage})`);
  } else {
    if (b.stage !== undefined) E(`스토리북에 stage(${b.stage}) 잘못 존재`);
  }
  if (!Array.isArray(b.pages) || b.pages.length === 0) E(`pages 비어있음`);

  // --- 2. 퀴즈 ---
  const quiz = Array.isArray(b.quiz) ? b.quiz : [];
  if (quiz.length !== 5) W(`퀴즈 ${quiz.length}문항(권장 5)`);
  quiz.forEach((q, i) => {
    const tag = `q${i + 1}`;
    if (q.type !== "mc") W(`${tag}: type '${q.type}'(≠mc)`);
    if (!Array.isArray(q.options) || q.options.length !== 4) E(`${tag}: 보기 ${q.options?.length ?? 0}개(≠4)`);
    else if (new Set(q.options.map((o) => String(o).trim())).size !== 4) E(`${tag}: 중복 보기 — ${JSON.stringify(q.options)}`);
    if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex >= (q.options?.length ?? 4))
      E(`${tag}: answerIndex ${q.answerIndex} 범위밖`);
    if (!String(q.question_ko ?? "").trim()) E(`${tag}: question_ko 빈값`);
    if (!String(q.explain_ko ?? "").trim()) E(`${tag}: explain_ko 빈값`);
  });

  // --- 3. 텍스트 룰 ---
  let totalWords = 0;
  const sentSeen = new Map(); // text -> 횟수 (책 내 완전 동일 문장)
  const bookTokens = new Set();
  (b.pages || []).forEach((p, pi) => {
    const sents = p.sentences || [];
    if (sents.length === 0) E(`p${pi + 1}: 문장 0개`);
    sents.forEach((s, si) => {
      const loc = `p${pi + 1}-s${si + 1}`;
      const text = s.text ?? "";
      const trans = s.translation_ko ?? "";
      if (!text.trim()) E(`${loc}: text 빈값`);
      if (!trans.trim()) E(`${loc}: translation_ko 빈값`);
      if (/[가-힣]/.test(text)) E(`${loc}: 본문에 한글 혼입 — "${text.slice(0, 50)}"`);
      const enInTrans = (trans.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || []).length;
      if (enInTrans > 2) E(`${loc}: translation_ko에 영문 ${enInTrans}단어 잔존 — "${trans.slice(0, 50)}"`);
      if (/\*\*/.test(text) || /\*\*/.test(trans)) E(`${loc}: 마크다운 ** 발견`);
      const dashes = (text.match(/—/g) || []).length;
      if (dashes > 1) W(`${loc}: em-dash ${dashes}회 — "${text.slice(0, 40)}…"`);
      if (text.trim()) sentSeen.set(text, (sentSeen.get(text) || 0) + 1);
      totalWords += enWordCount(text);
      for (const t of tokensLower(text)) bookTokens.add(t);
    });
  });
  for (const [t, c] of sentSeen)
    if (c > 1) W(`동일 문장 ${c}회 반복 — "${t.slice(0, 45)}…"`);

  // --- 4. 레벨 사다리 (WARN) ---
  if (isDaily) {
    const avg = DAILY_AVG[b.stage];
    if (avg) {
      const [lo, hi] = [Math.round(avg * 0.4), Math.round(avg * 1.6)];
      if (totalWords < lo || totalWords > hi)
        W(`단어수 ${totalWords} — stage${b.stage} 밴드(${lo}~${hi}) 벗어남`);
    }
  } else if (STORY_BAND[b.level]) {
    const [lo, hi] = STORY_BAND[b.level];
    if (totalWords < lo || totalWords > hi)
      W(`단어수 ${totalWords} — ${b.level} 밴드(${lo}~${hi}) 벗어남`);
  }

  // --- 5. dict.json 커버리지 (WARN) ---
  if (dictKeys.size > 0) {
    const missing = [...bookTokens].filter((w) => !dictKeys.has(w)).sort();
    if (missing.length > 0)
      W(`dict.json 미등재 ${missing.length}단어: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? " …" : ""}`);
  }

  results.push({ slug: fileSlug, errors, warns, words: totalWords, level: b.level, stage: b.stage ?? null, quiz: quiz.length });
}

// ---------- 출력 ----------
const errBooks = results.filter((r) => r.errors.length > 0);
const warnBooks = results.filter((r) => r.warns.length > 0);
const totalErr = results.reduce((s, r) => s + r.errors.length, 0);
const totalWarn = results.reduce((s, r) => s + r.warns.length, 0);
const summary = {
  books: results.length,
  errorBooks: errBooks.length,
  warnBooks: warnBooks.length,
  errors: totalErr,
  warns: totalWarn,
};

if (asJson) {
  console.log(JSON.stringify({ summary, books: results.filter((r) => r.errors.length || r.warns.length) }, null, 2));
} else {
  console.log(`\n===== qa-seed: ${results.length}권 검수 =====`);
  for (const r of results) {
    if (!r.errors.length && !r.warns.length) continue;
    console.log(`\n📖 ${r.slug} (${r.stage ? `daily st${r.stage}` : r.level}, ${r.words}단어)`);
    r.errors.forEach((m) => console.log(`  🔴 ERROR ${m}`));
    r.warns.forEach((m) => console.log(`  🟡 WARN  ${m}`));
  }
  console.log(`\n===== 요약 =====`);
  console.log(`총 ${summary.books}권 · ERROR ${totalErr}건(${errBooks.length}권) · WARN ${totalWarn}건(${warnBooks.length}권)`);
  if (totalErr === 0) console.log(`✅ 배포를 막을 결함 없음`);
}

process.exit(totalErr > 0 ? 1 : 0);
