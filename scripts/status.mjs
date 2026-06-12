/**
 * 자산 현황 도구 — data/seed(시드 JSON) ↔ public/seed(자산) 전권 대조 스캔.
 *
 *   node scripts/status.mjs                  # 전권 요약 테이블 + 컬렉션 합계
 *   node scripts/status.mjs --missing-only   # 문제(결손·경고) 있는 권만
 *   node scripts/status.mjs --json           # 기계용 JSON (stdout)
 *   node scripts/status.mjs --book <slug>    # 한 권 상세(결손 파일 목록 포함)
 *
 * 권별 7개 축:
 *   ① cover    — cover.webp / cover.png 유무 (prod 은 webp 만 배포 → webp 없으면 결손)
 *   ② pages    — p{i}.webp 개수 / pages 수 (png 만 있으면 +Np 로 별도 표시, webp 없으면 결손)
 *   ③ audio    — audio/p{i}-s{j}.mp3 개수 / 총 문장 수
 *   ④ WT       — wordTimings 있는 문장 수 / 총 문장 수 (경고)
 *   ⑤ quiz     — 문항 수 (0이면 경고)
 *   ⑥ dict     — 본문 고유단어 중 public/dict.json 수록 비율 (경고)
 *   ⑦ w-mp3    — 본문 고유단어 중 public/seed/_words/<word>.mp3 보유 비율
 *
 * 결손(❌·exit 1) = cover.webp + p{i}.webp + 문장 mp3 부재 + 단어 mp3 부재(전권 고유 단어 기준 1회).
 * 경고(⚠️)       = wordTimings 미비 · quiz 0 · dict 미수록.
 * exit code: 결손 0 → 0, 있으면 1.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

const ROOT = process.cwd();
const SEED = join(ROOT, "data", "seed");
const PUB = join(ROOT, "public", "seed");
const WORDS_DIR = join(PUB, "_words");
const DICT_FILE = join(ROOT, "public", "dict.json");

// ── CLI 인자 ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const asJson = args.includes("--json");
const missingOnly = args.includes("--missing-only");
const bookIdx = args.indexOf("--book");
const bookSlug = bookIdx >= 0 ? args[bookIdx + 1] : null;
if (bookIdx >= 0 && !bookSlug) {
  console.error("사용법: node scripts/status.mjs --book <slug>");
  process.exit(2);
}

// ── 공유 자산 1회 로드 ───────────────────────────────────────────────────
const dict = existsSync(DICT_FILE)
  ? JSON.parse(readFileSync(DICT_FILE, "utf8"))
  : {};
const wordMp3 = new Set(
  existsSync(WORDS_DIR)
    ? readdirSync(WORDS_DIR)
        .filter((f) => f.endsWith(".mp3"))
        .map((f) => f.slice(0, -4))
    : [],
);

const listDir = (dir) => (existsSync(dir) ? new Set(readdirSync(dir)) : new Set());

/** 본문 토큰화 — src/lib/utils.ts tokenizeWords/normalizeWord 복제 (원본 변경 시 동기화).
 *  dict.json 키·_words mp3 파일명이 이 기준(하이픈·아포스트로피 보존)으로 생성됨. */
const tokenize = (text) =>
  (text.normalize("NFKC").replace(/[‘’]/g, "'").match(/[A-Za-z0-9']+(?:[-'][A-Za-z0-9']+)*/g) ?? [])
    .map((w) => w.toLowerCase().replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, ""))
    .filter(Boolean);
/** 단어 mp3 파일명 베이스 — utils.ts wordAudioBase 복제 (tae's → tae_s) */
const wordAudioBase = (w) => w.replace(/[^a-z0-9]+/gi, "_");

// ── 권별 스캔 ────────────────────────────────────────────────────────────
function scanBook(file) {
  const b = JSON.parse(readFileSync(join(SEED, file), "utf8"));
  const dir = join(PUB, b.slug);
  const files = listDir(dir);
  const audioFiles = listDir(join(dir, "audio"));

  // ① cover
  const cover = files.has("cover.webp")
    ? "webp"
    : files.has("cover.png")
      ? "png"
      : "missing";

  // ② 페이지 이미지 (webp 기준, png 폴백 별도 표시)
  const pageTotal = b.pages.length;
  let pageWebp = 0;
  let pagePngOnly = 0;
  const pageMissing = [];
  for (let i = 1; i <= pageTotal; i++) {
    if (files.has(`p${i}.webp`)) pageWebp++;
    else if (files.has(`p${i}.png`)) {
      pagePngOnly++;
      pageMissing.push(`p${i}.webp (png만 있음)`);
    } else pageMissing.push(`p${i}.webp`);
  }

  // ③④ 문장 오디오 + wordTimings + 본문 고유단어
  let sentTotal = 0;
  let audioOk = 0;
  let wtOk = 0;
  const audioMissing = [];
  const bodyWords = new Set();
  b.pages.forEach((p, pi) =>
    (p.sentences ?? []).forEach((s, si) => {
      sentTotal++;
      const mp3 = s.audio ? basename(s.audio) : `p${pi + 1}-s${si + 1}.mp3`;
      if (audioFiles.has(mp3)) audioOk++;
      else audioMissing.push(`audio/${mp3}`);
      if (Array.isArray(s.wordTimings) && s.wordTimings.length > 0) wtOk++;
      for (const w of tokenize(s.text ?? "")) bodyWords.add(w);
    }),
  );

  // ⑥⑦ 사전·단어 mp3 커버리지
  const noDict = [];
  const noMp3 = [];
  for (const w of bodyWords) {
    if (!(w in dict)) noDict.push(w);
    if (!wordMp3.has(wordAudioBase(w))) noMp3.push(w);
  }

  // ⑤ quiz
  const quiz = Array.isArray(b.quiz) ? b.quiz.length : 0;

  // 결손(자산 부재) / 경고(품질 미비)
  const missing =
    (cover === "webp" ? 0 : 1) + (pageTotal - pageWebp) + audioMissing.length;
  const warns = [];
  if (wtOk < sentTotal) warns.push(`wordTimings ${wtOk}/${sentTotal}`);
  if (quiz === 0) warns.push("quiz 0");
  if (noDict.length) warns.push(`dict 미수록 ${noDict.length}`);

  return {
    slug: b.slug,
    level: b.level ?? "?",
    stage: b.stage ?? null,
    collection: b.collection === "daily" ? "daily" : "storybook",
    cover,
    pageTotal,
    pageWebp,
    pagePngOnly,
    sentTotal,
    audioOk,
    wtOk,
    quiz,
    wordTotal: bodyWords.size,
    dictOk: bodyWords.size - noDict.length,
    mp3Ok: bodyWords.size - noMp3.length,
    missing,
    warns,
    detail: { pageMissing, audioMissing, noDict, noMp3 },
  };
}

// ── 전권 수집 ────────────────────────────────────────────────────────────
const seedFiles = readdirSync(SEED).filter(
  (f) => f.endsWith(".json") && !f.startsWith("_"),
);

if (bookSlug && !seedFiles.includes(`${bookSlug}.json`)) {
  console.error(`❌ 시드 없음: data/seed/${bookSlug}.json`);
  process.exit(2);
}

const dailyNum = (slug) => {
  const m = slug.match(/^daily-(\d+)-/);
  return m ? Number(m[1]) : Infinity;
};

let books = (bookSlug ? [`${bookSlug}.json`] : seedFiles).map(scanBook);
books.sort((a, b) => {
  if (a.collection !== b.collection) return a.collection === "daily" ? -1 : 1;
  const d = dailyNum(a.slug) - dailyNum(b.slug);
  return d || a.slug.localeCompare(b.slug);
});

const icon = (b) => (b.missing > 0 ? "❌" : b.warns.length ? "⚠️" : "✅");

// ── 합계 ────────────────────────────────────────────────────────────────
const allNoMp3 = new Set(books.flatMap((b) => b.detail.noMp3));
const allNoDict = new Set(books.flatMap((b) => b.detail.noDict));
const assetMissing = books.reduce((s, b) => s + b.missing, 0);
const totalMissing = assetMissing + allNoMp3.size; // 단어 mp3 는 전권 고유 1회만 집계
const byCollection = {};
const byLevel = {};
for (const b of books) {
  const c = (byCollection[b.collection] ??= { books: 0, missing: 0, warn: 0 });
  c.books++;
  c.missing += b.missing;
  if (b.warns.length) c.warn++;
  byLevel[b.level] = (byLevel[b.level] ?? 0) + 1;
}
const summary = {
  books: books.length,
  byCollection,
  byLevel,
  assetMissing,
  wordMp3Missing: allNoMp3.size,
  dictUncovered: allNoDict.size,
  totalMissing,
  ok: books.filter((b) => icon(b) === "✅").length,
  warn: books.filter((b) => icon(b) === "⚠️").length,
  bad: books.filter((b) => b.missing > 0).length,
};

const shown = missingOnly ? books.filter((b) => icon(b) !== "✅") : books;

// ── 출력 ────────────────────────────────────────────────────────────────
if (asJson) {
  process.stdout.write(JSON.stringify({ summary, books: shown }, null, 0));
  process.exit(totalMissing > 0 ? 1 : 0);
}

const pct = (ok, total) => (total ? `${Math.round((ok / total) * 100)}%` : "-");
const pad = (s, n) => String(s).padEnd(n);
const rpad = (s, n) => String(s).padStart(n);

if (bookSlug) {
  const b = books[0];
  const d = b.detail;
  console.log(`${icon(b)} ${b.slug} — ${b.collection} · ${b.level}${b.stage ? ` · stage ${b.stage}` : ""}`);
  console.log(`  cover  : ${b.cover === "webp" ? "✅ webp" : b.cover === "png" ? "⚠️ png만 (webp 결손)" : "❌ 없음"}`);
  console.log(`  pages  : webp ${b.pageWebp}/${b.pageTotal}${b.pagePngOnly ? ` (+png만 ${b.pagePngOnly})` : ""}`);
  console.log(`  audio  : ${b.audioOk}/${b.sentTotal}`);
  console.log(`  WT     : ${b.wtOk}/${b.sentTotal}`);
  console.log(`  quiz   : ${b.quiz}문항`);
  console.log(`  dict   : ${b.dictOk}/${b.wordTotal} (${pct(b.dictOk, b.wordTotal)})`);
  console.log(`  w-mp3  : ${b.mp3Ok}/${b.wordTotal} (${pct(b.mp3Ok, b.wordTotal)})`);
  if (d.pageMissing.length) console.log(`  ❌ 페이지 결손: ${d.pageMissing.join(", ")}`);
  if (d.audioMissing.length) console.log(`  ❌ 오디오 결손: ${d.audioMissing.join(", ")}`);
  if (d.noDict.length) console.log(`  ⚠️ dict 미수록: ${d.noDict.join(", ")}`);
  if (d.noMp3.length) console.log(`  ❌ 단어 mp3 없음: ${d.noMp3.join(", ")}`);
  console.log(`\n결손 ${b.missing + d.noMp3.length} · 경고 ${b.warns.length}`);
  process.exit(b.missing + d.noMp3.length > 0 ? 1 : 0);
}

const W = Math.max(...shown.map((b) => b.slug.length), 4);
console.log(
  `${pad("", 2)} ${pad("slug", W)} ${pad("lvl", 5)} ${pad("st", 2)} ${pad("cover", 5)} ${rpad("pages", 9)} ${rpad("audio", 7)} ${rpad("WT", 7)} ${rpad("quiz", 4)} ${rpad("dict", 5)} ${rpad("w-mp3", 5)}`,
);
for (const b of shown) {
  const pages = `${b.pageWebp}/${b.pageTotal}${b.pagePngOnly ? `+${b.pagePngOnly}p` : ""}`;
  console.log(
    `${icon(b)} ${pad(b.slug, W)} ${pad(b.level, 5)} ${pad(b.stage ?? "-", 2)} ${pad(b.cover === "webp" ? "✅" : b.cover === "png" ? "⚠️png" : "❌", 5)} ${rpad(pages, 9)} ${rpad(`${b.audioOk}/${b.sentTotal}`, 7)} ${rpad(`${b.wtOk}/${b.sentTotal}`, 7)} ${rpad(b.quiz, 4)} ${rpad(pct(b.dictOk, b.wordTotal), 5)} ${rpad(pct(b.mp3Ok, b.wordTotal), 5)}`,
  );
}

console.log(`\n── 합계 ──────────────────────────────────────`);
for (const [c, v] of Object.entries(byCollection))
  console.log(`  ${pad(c, 9)} ${rpad(v.books, 3)}권 · 자산결손 ${v.missing} · 경고권 ${v.warn}`);
console.log(
  `  레벨      ${Object.entries(byLevel)
    .map(([l, n]) => `${l} ${n}`)
    .join(" · ")}`,
);
console.log(
  `  상태      ✅ ${summary.ok} · ⚠️ ${summary.warn} · ❌ ${summary.bad} (전체 ${summary.books}권)`,
);
console.log(
  `  결손 합계 ${totalMissing} (자산 ${assetMissing} + 단어mp3 ${allNoMp3.size}) · dict 미수록 단어 ${allNoDict.size}`,
);
process.exit(totalMissing > 0 ? 1 : 0);
