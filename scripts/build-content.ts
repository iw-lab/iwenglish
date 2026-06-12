/**
 * 빌드 타임 콘텐츠 컴파일 — data/seed + public/seed 를 읽어
 * src/data/content.generated.ts 로 인라인(번들 포함).
 * → 런타임 fs 불필요 = Cloudflare Edge/Workers 에서도 동작.
 *
 *   pnpm seed:content   (build 전 자동 실행: prebuild)
 */
import {
  readFileSync,
  readdirSync,
  writeFileSync,
  existsSync,
  statSync,
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

function main() {
  const books = readdirSync(SEED_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .sort()
    .map((f) => {
      const b = JSON.parse(readFileSync(join(SEED_DIR, f), "utf8"));
      validateBook(b, f);
      return b;
    });

  const dictFile = join(SEED_DIR, "_words.json");
  const dict = existsSync(dictFile)
    ? JSON.parse(readFileSync(dictFile, "utf8"))
    : {};

  const assets = walkAssets(PUBLIC_SEED);

  const banner = `// 자동 생성됨 — 수정하지 마세요. (scripts/build-content.ts)
// data/seed + public/seed 를 빌드 타임에 인라인 → 런타임 fs 불필요(Edge 호환).
import type { SeedBook, SeedWord } from "@/lib/data/staticBooks";
`;
  const body =
    banner +
    `\nexport const SEED_BOOKS = ${JSON.stringify(books)} as unknown as SeedBook[];\n` +
    `\nexport const SHARED_DICT = ${JSON.stringify(dict)} as Record<string, SeedWord>;\n` +
    `\nexport const ASSET_SET = new Set<string>(${JSON.stringify(assets)});\n`;

  writeFileSync(OUT, body);

  // 정적 사전(단어 탭 시 /api/word 대신 1회 fetch·캐시 → Functions 0)
  // 핵심단어(책별 수기 뜻)도 머지 — 공유 사전보다 우선
  const merged: Record<string, unknown> = { ...dict };
  for (const b of books)
    for (const [k, w] of Object.entries(
      (b as { words?: Record<string, unknown> }).words ?? {},
    ))
      merged[k] = w;
  writeFileSync(PUBLIC_DICT, JSON.stringify(merged));

  console.log(
    `✅ content.generated.ts — 책 ${books.length} · 사전 ${Object.keys(dict).length} · 자산 ${assets.length}`,
  );
  console.log(`✅ public/dict.json — ${Object.keys(merged).length} 단어(정적)`);
}

main();
