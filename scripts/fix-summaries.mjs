/**
 * summary_ko 끝에 새어든 영어 메타 괄호 제거.
 *   "…반복해요. (very short repeated sentences, total 27 words.)" → "…반복해요."
 *   node scripts/fix-summaries.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SEED = join(process.cwd(), "data", "seed");
const TRAILING_ASCII_PAREN = /\s*\([^)]*[A-Za-z][^)]*\)\s*$/u;

let fixed = 0;
for (const name of readdirSync(SEED)) {
  if (!/^daily-\d+-.+\.json$/.test(name)) continue;
  const file = join(SEED, name);
  const book = JSON.parse(readFileSync(file, "utf8"));
  const before = book.summary_ko || "";
  if (!TRAILING_ASCII_PAREN.test(before)) continue;
  const after = before.replace(TRAILING_ASCII_PAREN, "").trim();
  book.summary_ko = after;
  writeFileSync(file, `${JSON.stringify(book, null, 2)}\n`);
  fixed++;
  console.log(`✅ ${book.slug}`);
  console.log(`   - ${before}`);
  console.log(`   + ${after}`);
  if (/[A-Za-z]/.test(after)) console.log(`   ⚠️ 여전히 영어 잔존: "${after}"`);
}
console.log(`\nsummary 정리 ${fixed}건`);
