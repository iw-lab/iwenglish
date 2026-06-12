/**
 * 콘텐츠 파이프라인 단계별 게이트(postcondition 검증) — **검증만** 수행.
 * 외부 API·codex 호출 없음. 미달 항목 나열 후 exit 1.
 *
 *   node scripts/pipeline-gates.mjs <gate> [--books slug1,slug2]
 *
 * gates:
 *   worddict     본문 고유단어가 data/seed/_words.json 에 모두 등재(meaning_ko 보유)?
 *   words-audio  고유단어 mp3 가 public/seed/_words/ 에 모두 존재? (0바이트=결손)
 *   audio        모든 문장 mp3 실존(0바이트 제외) + wordTimings 존재?
 *   covers       cover.png 또는 cover.webp 존재?
 *   pages        p1..pN 이 pages 수만큼? (50KB 미만 png = codex hang 잔재 잘린 파일 → 결손)
 *   webp         모든 페이지·표지에 webp 존재? (png만 있으면 prod 미배포 → 결손)
 *   dups         책 내/책 간 MD5 동일 이미지 쌍 적발 (daily+스토리북 등 data/seed 전권)
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SEED = join(ROOT, "data", "seed");
const PUB = join(ROOT, "public", "seed");
const DICT_FILE = join(SEED, "_words.json");
const WORDS_AUDIO = join(PUB, "_words");
const TRUNC_PNG = 50 * 1024; // 이 미만 png = 잘린 파일(과거 codex hang 잔재 실사례)
const MAX_LINES = 150; // 미달 나열 상한(폭주 방지)

// ── src/lib/utils.ts 의 tokenizeWords/normalizeWord/wordAudioBase 복제 ──
// (.mjs 를 tsx 없이 node 단독 실행하기 위함 — 원본 변경 시 동기화 필요)
const tokenizeWords = (text) =>
  text.match(/[A-Za-z0-9']+(?:[-'][A-Za-z0-9']+)*/g) ?? [];
const normalizeWord = (w) =>
  w.toLowerCase().replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "");
const wordAudioBase = (w) => normalizeWord(w).replace(/[^a-z0-9]+/gi, "_");

const fileSize = (p) => (existsSync(p) ? statSync(p).size : -1);
const kb = (n) => `${Math.round(n / 1024)}KB`;
const md5 = (p) => createHash("md5").update(readFileSync(p)).digest("hex");

function loadAllBooks() {
  return readdirSync(SEED)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .map((f) => JSON.parse(readFileSync(join(SEED, f), "utf8")))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/** 책의 본문 고유단어(정규화) → 첫 등장 slug 맵 */
function collectWords(books) {
  const map = new Map(); // word -> first slug
  for (const b of books)
    for (const p of b.pages)
      for (const s of p.sentences)
        for (const t of tokenizeWords(s.text)) {
          const w = normalizeWord(t);
          if (w && !map.has(w)) map.set(w, b.slug);
        }
  return map;
}

/** 책의 이미지 베이스명 목록: cover, p1..pN */
const imageBases = (b) => ["cover", ...b.pages.map((_, i) => `p${i + 1}`)];

// ───────────────────────── gates ─────────────────────────
// 각 게이트는 미달 항목 문자열 배열을 반환 (빈 배열 = 통과)

function gateWorddict(books) {
  if (!existsSync(DICT_FILE)) return [`사전 파일 없음: ${DICT_FILE}`];
  const dict = JSON.parse(readFileSync(DICT_FILE, "utf8"));
  const fails = [];
  for (const [w, slug] of collectWords(books)) {
    // gen-word-dict.ts 의 완료 기준과 동일: 항목 + meaning_ko 보유
    if (!dict[w]?.meaning_ko) fails.push(`미등재: "${w}" (예: ${slug})`);
  }
  return fails;
}

function gateWordsAudio(books) {
  const fails = [];
  for (const [w, slug] of collectWords(books)) {
    const f = join(WORDS_AUDIO, `${wordAudioBase(w)}.mp3`);
    const size = fileSize(f);
    if (size < 0) fails.push(`mp3 없음: "${w}" (예: ${slug})`);
    else if (size === 0) fails.push(`mp3 0바이트: "${w}" (예: ${slug})`);
  }
  return fails;
}

function gateAudio(books) {
  const fails = [];
  for (const b of books) {
    const items = [];
    b.pages.forEach((p, pi) =>
      p.sentences.forEach((s, si) => {
        const id = `p${pi + 1}-s${si + 1}`;
        const rel = s.audio || `/seed/${b.slug}/audio/${id}.mp3`;
        if (fileSize(join(ROOT, "public", rel)) <= 0) items.push(`${id} mp3`);
        if (!(Array.isArray(s.wordTimings) && s.wordTimings.length > 0))
          items.push(`${id} wordTimings`);
      }),
    );
    if (items.length)
      fails.push(
        `${b.slug}: ${items.length}건 결손 — ${items.slice(0, 8).join(", ")}${items.length > 8 ? " …" : ""}`,
      );
  }
  return fails;
}

function gateCovers(books) {
  const fails = [];
  for (const b of books) {
    const ok =
      fileSize(join(PUB, b.slug, "cover.png")) > 0 ||
      fileSize(join(PUB, b.slug, "cover.webp")) > 0;
    if (!ok) fails.push(`${b.slug}: cover 없음`);
  }
  return fails;
}

function gatePages(books) {
  const fails = [];
  for (const b of books) {
    const items = [];
    for (let i = 1; i <= b.pages.length; i++) {
      const png = fileSize(join(PUB, b.slug, `p${i}.png`));
      const webp = fileSize(join(PUB, b.slug, `p${i}.webp`));
      if (png >= 0 && png < TRUNC_PNG)
        // webp 가 있어도 잘린 png 에서 파생된 webp 는 오염 의심 → 결손 취급
        items.push(`p${i}.png 잘림(${kb(png)})`);
      else if (png < 0 && webp <= 0) items.push(`p${i} 없음`);
    }
    if (items.length)
      fails.push(`${b.slug}: ${items.join(", ")} (전체 ${b.pages.length}p)`);
  }
  return fails;
}

function gateWebp(books) {
  const fails = [];
  for (const b of books) {
    const items = imageBases(b).filter(
      (base) => fileSize(join(PUB, b.slug, `${base}.webp`)) <= 0,
    );
    if (items.length)
      fails.push(`${b.slug}: webp 없음 — ${items.join(", ")}`);
  }
  return fails;
}

function gateDups(books, allBooks) {
  // scan-storybook-dups.mjs 로직 일반화: STORYBOOK_PLAN 대신 data/seed 전권 대상.
  // 해시는 항상 "전권" 수행 — --books 필터 시에도 책 간(대상 외 책과의) 중복을 놓치지 않기 위함.
  const byHash = new Map(); // hash -> [{slug, base}]
  for (const b of allBooks) {
    for (const base of imageBases(b)) {
      // webp 우선(최종 배포 자산), 없으면 png — 원본 스캐너와 동일
      const webp = join(PUB, b.slug, `${base}.webp`);
      const png = join(PUB, b.slug, `${base}.png`);
      const f = existsSync(webp) ? webp : existsSync(png) ? png : null;
      if (!f) continue;
      const h = md5(f);
      if (!byHash.has(h)) byHash.set(h, []);
      byHash.get(h).push({ slug: b.slug, base });
    }
  }
  const target =
    books.length === allBooks.length ? null : new Set(books.map((b) => b.slug));
  return [...byHash.values()]
    .filter((g) => g.length > 1 && (!target || g.some((x) => target.has(x.slug))))
    .map((g) => `동일 MD5: ${g.map((x) => `${x.slug}/${x.base}`).join("  ==  ")}`);
}

const GATES = {
  worddict: gateWorddict,
  "words-audio": gateWordsAudio,
  audio: gateAudio,
  covers: gateCovers,
  pages: gatePages,
  webp: gateWebp,
  dups: gateDups,
};

// ───────────────────────── main ─────────────────────────
const args = process.argv.slice(2);
const gate = args[0];
let filterSlugs = null;
const bi = args.indexOf("--books");
if (bi !== -1) {
  filterSlugs = (args[bi + 1] || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!filterSlugs.length) {
    console.error("❌ --books 에 slug 목록 필요 (slug1,slug2)");
    process.exit(2);
  }
}
if (!gate || !GATES[gate]) {
  console.error(
    `사용법: node scripts/pipeline-gates.mjs <gate> [--books slug1,slug2]\n게이트: ${Object.keys(GATES).join(" | ")}`,
  );
  process.exit(2);
}

const allBooks = loadAllBooks();
let books = allBooks;
if (filterSlugs) {
  const bySlug = new Map(allBooks.map((b) => [b.slug, b]));
  const unknown = filterSlugs.filter((s) => !bySlug.has(s));
  if (unknown.length) {
    console.error(`❌ 알 수 없는 slug: ${unknown.join(", ")}`);
    process.exit(2);
  }
  books = filterSlugs.map((s) => bySlug.get(s));
}

const fails = GATES[gate](books, allBooks);
if (fails.length) {
  console.log(`❌ GATE ${gate} FAIL — ${fails.length}건 (대상 ${books.length}권)`);
  for (const line of fails.slice(0, MAX_LINES)) console.log(`  - ${line}`);
  if (fails.length > MAX_LINES) console.log(`  … 외 ${fails.length - MAX_LINES}건`);
  process.exit(1);
}
console.log(`✅ GATE ${gate} OK (대상 ${books.length}권)`);
