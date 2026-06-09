/**
 * 시각 전수검사용 매니페스트 생성기.
 * data/seed 의 daily-13~24 책 → 각 페이지의 문장 + PNG 경로를 JSON 으로 stdout 출력.
 * Workflow QA 가 args 로 받아 에이전트별 fan-out 에 사용.
 *   node scripts/qa-manifest.mjs            # daily-13~24 전부
 *   node scripts/qa-manifest.mjs 16 24      # daily-16~24 만
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SEED = join(ROOT, "data", "seed");
const PUB = join(ROOT, "public", "seed");

const lo = Number(process.argv[2]) || 13;
const hi = Number(process.argv[3]) || 24;

const num = (slug) => {
  const m = slug.match(/^daily-(\d+)-/);
  return m ? Number(m[1]) : -1;
};

const books = readdirSync(SEED)
  .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
  .map((f) => JSON.parse(readFileSync(join(SEED, f), "utf8")))
  .filter((b) => b.collection === "daily")
  .filter((b) => num(b.slug) >= lo && num(b.slug) <= hi)
  .sort((a, b) => num(a.slug) - num(b.slug))
  .map((b) => ({
    slug: b.slug,
    title: b.title,
    pages: b.pages.map((p, i) => {
      const png = join(PUB, b.slug, `p${i + 1}.png`);
      const webp = join(PUB, b.slug, `p${i + 1}.webp`);
      return {
        page: i + 1,
        sentence: p.sentences.map((s) => s.text).join(" "),
        img: existsSync(png) ? png : existsSync(webp) ? webp : png,
        exists: existsSync(png) || existsSync(webp),
      };
    }),
  }));

process.stdout.write(JSON.stringify({ books }, null, 0));
