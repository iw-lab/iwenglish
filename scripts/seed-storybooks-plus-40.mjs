/**
 * 자유주제 그림책 추가 40권 생성.
 *
 * 현재 자유주제 그림책 60권(레벨별 15권)에 preA1/A1/A2/B1 각 10권을 더해
 * 최종 100권(레벨별 25권)으로 맞춘다.
 *
 *   node scripts/seed-storybooks-plus-40.mjs
 *   node scripts/seed-storybooks-plus-40.mjs --force
 */
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { EXTRA_STORYBOOKS } from "./storybook-extra-books.mjs";

const SEED = join(process.cwd(), "data", "seed");
const FORCE = process.argv.includes("--force");

let written = 0;
let skipped = 0;

for (const b of EXTRA_STORYBOOKS) {
  const file = join(SEED, `${b.slug}.json`);
  if (existsSync(file) && !FORCE) {
    console.log(`↩︎ 있음 ${b.slug}`);
    skipped++;
    continue;
  }

  const book = {
    slug: b.slug,
    title: b.title,
    title_ko: b.title_ko,
    level: b.level,
    ageBand: b.ageBand,
    summary_ko: b.summary_ko,
    pages: b.pages,
    words: {},
    quiz: b.quiz,
  };

  writeFileSync(file, `${JSON.stringify(book, null, 2)}\n`);
  const words = b.pages.reduce(
    (sum, p) =>
      sum +
      p.sentences.reduce(
        (s, x) => s + (x.text.match(/[A-Za-z']+/g) ?? []).length,
        0,
      ),
    0,
  );
  console.log(`✅ ${b.slug}  ${b.level}  ${b.pages.length}p ${words}w`);
  written++;
}

console.log(`\n자유주제 그림책 추가 완료: 작성 ${written}권 · 건너뜀 ${skipped}권`);
