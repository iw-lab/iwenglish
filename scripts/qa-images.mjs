/**
 * 이미지 완전성 검사 — 각 daily 책의 표지 + 전 페이지 webp(또는 png) 존재 확인.
 *   node scripts/qa-images.mjs
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SEED = join(process.cwd(), "data", "seed");
const PUB = join(process.cwd(), "public", "seed");
const has = (slug, file) => existsSync(join(PUB, slug, file));
const num = (s) => Number(s.match(/^daily-(\d+)/)[1]);

const books = readdirSync(SEED)
  .filter((f) => /^daily-\d+-.+\.json$/.test(f))
  .map((f) => JSON.parse(readFileSync(join(SEED, f), "utf8")))
  .sort((a, b) => num(a.slug) - num(b.slug));

const missCover = [];
const missPages = [];
for (const b of books) {
  if (!(has(b.slug, "cover.webp") || has(b.slug, "cover.png"))) missCover.push(b.slug);
  const miss = [];
  b.pages.forEach((p, i) => {
    const n = i + 1;
    if (!(has(b.slug, `p${n}.webp`) || has(b.slug, `p${n}.png`))) miss.push(n);
  });
  if (miss.length) missPages.push(`${b.slug}: p${miss.join(",")} (총 ${b.pages.length}p)`);
}

let webp = 0, png = 0;
for (const b of books)
  for (const f of readdirSync(join(PUB, b.slug)))
    if (f.endsWith(".webp")) webp++;
    else if (f.endsWith(".png")) png++;

console.log(`책 ${books.length}권 · 이미지 webp ${webp} · png ${png}`);
console.log(`\n표지 누락 ${missCover.length}권: ${missCover.join(", ") || "없음 ✅"}`);
console.log(`\n페이지 누락 ${missPages.length}권:`);
if (missPages.length) missPages.forEach((x) => console.log("  🔴 " + x));
else console.log("  없음 ✅");
