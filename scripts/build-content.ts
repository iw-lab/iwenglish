/**
 * 빌드 타임 콘텐츠 컴파일.
 * - 무거운 본문(pages·sentences·wordTimings·quiz)은 책별 정적 자산
 *   public/seed/<slug>/book.json 으로 분리(워커 번들에서 제외 → 3MiB 한도 회피).
 * - 가벼운 메타데이터(+공유사전)만 src/data/content.generated.ts 로 인라인.
 * 리더는 런타임에 book.json 을 fetch(ReaderLoader). 서재/상세/사전은 메타로 동작.
 *
 *   pnpm seed:content   (build 전 자동 실행: prebuild)
 */
import {
  readFileSync,
  readdirSync,
  writeFileSync,
  existsSync,
  statSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SEED_DIR = join(ROOT, "data", "seed");
const PUBLIC_SEED = join(ROOT, "public", "seed");
const OUT = join(ROOT, "src", "data", "content.generated.ts");
const PUBLIC_DICT = join(ROOT, "public", "dict.json");

function walkAssets(dir: string, base = "/seed"): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = `${base}/${name}`;
    if (statSync(full).isDirectory()) out.push(...walkAssets(full, rel));
    else if (/\.(png|jpg|jpeg|webp|mp3|wav)$/i.test(name)) out.push(rel);
  }
  return out;
}

/** 시드 fail-fast 검증 — 깨진 권은 슬러그 명시 에러로 즉시 중단 */
function validateBook(
  b: {
    slug?: string;
    pages?: { sentences?: { text?: string }[] }[];
    quiz?: { options?: string[]; answerIndex?: number }[];
  } & Record<string, unknown>,
  file: string,
) {
  const slug = b.slug || file;
  const fail = (msg: string): never => {
    throw new Error(`시드 검증 실패 [${slug}] (${file}): ${msg}`);
  };
  for (const k of ["slug", "title", "title_ko", "level", "ageBand", "summary_ko", "words", "quiz"])
    if (b[k] == null || b[k] === "") fail(`필수 필드 누락: ${k}`);
  if (!Array.isArray(b.pages) || b.pages.length === 0) fail("pages 빈 배열");
  b.pages!.forEach((p, pi) => {
    if (!Array.isArray(p.sentences) || p.sentences.length === 0)
      fail(`page ${pi + 1} sentences 빈 배열`);
  });
  (b.quiz ?? []).forEach((q, qi) => {
    const n = q.options?.length ?? 0;
    if (typeof q.answerIndex !== "number" || q.answerIndex < 0 || q.answerIndex >= n)
      fail(`quiz ${qi + 1} answerIndex(${q.answerIndex}) 범위 초과 (options ${n}개)`);
  });
}

type Seed = {
  slug: string;
  title: string;
  title_ko: string;
  level: string;
  ageBand: string;
  summary_ko: string;
  stage?: number;
  collection?: string;
  pages: { sentences: { text: string; translation_ko: string; audio?: string; wordTimings?: unknown[] }[] }[];
  words: Record<string, unknown>;
  quiz: Record<string, unknown>[];
};

function main() {
  const files = readdirSync(SEED_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .sort();
  const books: Seed[] = files.map((f) => {
    const b = JSON.parse(readFileSync(join(SEED_DIR, f), "utf8"));
    validateBook(b, f);
    return b;
  });

  const dictFile = join(SEED_DIR, "_words.json");
  const dict = existsSync(dictFile)
    ? JSON.parse(readFileSync(dictFile, "utf8"))
    : {};

  const assetSet = new Set(walkAssets(PUBLIC_SEED));
  const img = (slug: string, file: string) => {
    const rel = `/seed/${slug}/${file}`;
    return assetSet.has(rel) ? rel : "";
  };
  const enWords = (t: string) => t.match(/[A-Za-z']+/g)?.length ?? 0;

  const meta: Record<string, unknown>[] = [];

  for (const b of books) {
    const wordCount = b.pages.reduce(
      (sum, p) => sum + p.sentences.reduce((s, sen) => s + enWords(sen.text), 0),
      0,
    );
    // 책별 풀 콘텐츠(해석된 URL 포함) → 정적 자산
    const fullBook = {
      id: b.slug,
      slug: b.slug,
      title: b.title,
      title_ko: b.title_ko,
      level: b.level,
      ageBand: b.ageBand,
      coverUrl: img(b.slug, "cover.webp") || img(b.slug, "cover.png"),
      summary_ko: b.summary_ko,
      wordCount,
      stage: b.stage,
      collection: b.collection,
      pages: b.pages.map((p, pi) => ({
        id: `${b.slug}-p${pi + 1}`,
        pageNo: pi + 1,
        spread: `p${pi + 1}`,
        imageUrl: img(b.slug, `p${pi + 1}.webp`) || img(b.slug, `p${pi + 1}.png`),
        sentences: p.sentences.map((s, si) => ({
          id: `${b.slug}-p${pi + 1}-s${si + 1}`,
          ord: si,
          text: s.text,
          translation_ko: s.translation_ko,
          audioUrl: s.audio && assetSet.has(s.audio) ? s.audio : null,
          wordTimings: s.wordTimings ?? [],
        })),
      })),
      quiz: b.quiz.map((q, i) => ({ ...q, id: `${b.slug}-q${i + 1}`, ord: i })),
    };
    const dir = join(PUBLIC_SEED, b.slug);
    if (existsSync(dir)) writeFileSync(join(dir, "book.json"), JSON.stringify(fullBook));

    meta.push({
      id: b.slug,
      slug: b.slug,
      title: b.title,
      title_ko: b.title_ko,
      level: b.level,
      ageBand: b.ageBand,
      coverUrl: fullBook.coverUrl,
      summary_ko: b.summary_ko,
      wordCount,
      stage: b.stage,
      collection: b.collection,
      pageCount: b.pages.length,
      quizCount: b.quiz.length,
      words: b.words ?? {},
    });
  }

  const banner = `// 자동 생성됨 — 수정하지 마세요. (scripts/build-content.ts)
// 메타데이터만 인라인. 무거운 본문은 public/seed/<slug>/book.json (런타임 fetch).
import type { BookMeta, SeedWord } from "@/lib/data/staticBooks";
`;
  const body =
    banner +
    `\nexport const SEED_BOOKS_META = ${JSON.stringify(meta)} as unknown as BookMeta[];\n` +
    `\nexport const SHARED_DICT = ${JSON.stringify(dict)} as Record<string, SeedWord>;\n`;
  writeFileSync(OUT, body);

  // 정적 사전(단어 탭 시 /api/word 대신 1회 fetch·캐시 → Functions 0)
  const merged: Record<string, unknown> = { ...dict };
  for (const b of books)
    for (const [k, w] of Object.entries(b.words ?? {})) merged[k] = w;
  writeFileSync(PUBLIC_DICT, JSON.stringify(merged));

  // 시드에서 빠진 책의 잔여 book.json 정리(보류/삭제된 책이 서재에 안 뜨도록)
  const liveSlugs = new Set(books.map((b) => b.slug));
  if (existsSync(PUBLIC_SEED))
    for (const name of readdirSync(PUBLIC_SEED)) {
      const bj = join(PUBLIC_SEED, name, "book.json");
      if (!liveSlugs.has(name) && existsSync(bj)) rmSync(bj);
    }

  const metaBytes = JSON.stringify(meta).length + JSON.stringify(dict).length;
  console.log(
    `✅ content.generated.ts — 책 ${books.length} · 사전 ${Object.keys(dict).length} · 인라인 ${(metaBytes / 1e6).toFixed(2)}MB(본문 분리)`,
  );
  console.log(`✅ book.json ${books.length}권 · public/dict.json ${Object.keys(merged).length} 단어`);
}

main();
