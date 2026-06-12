/**
 * 그림책 일러스트 바이트중복(MD5) 스캔 — codex thread-cache 혼입 적발.
 * 책 내/책 간 동일 md5 페이지를 찾아 보고(시각 QA가 놓치는 '느슨한 중복' 보완).
 *   node scripts/scan-storybook-dups.mjs
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { STORYBOOK_PLAN } from "./storybook-plan.mjs";

const PUB = join(process.cwd(), "public", "seed");
const md5 = (p) => createHash("md5").update(readFileSync(p)).digest("hex");

const byHash = new Map(); // hash -> [ {slug,file} ]
let scanned = 0;
for (const b of STORYBOOK_PLAN) {
  const seed = JSON.parse(readFileSync(join(process.cwd(), "data", "seed", b.slug + ".json"), "utf8"));
  const files = ["cover", ...seed.pages.map((_, i) => `p${i + 1}`)];
  for (const base of files) {
    // webp 우선(최종 자산), 없으면 png
    const webp = join(PUB, b.slug, base + ".webp");
    const png = join(PUB, b.slug, base + ".png");
    const f = existsSync(webp) ? webp : existsSync(png) ? png : null;
    if (!f) continue;
    const h = md5(f);
    if (!byHash.has(h)) byHash.set(h, []);
    byHash.get(h).push({ slug: b.slug, file: base, path: f });
    scanned++;
  }
}

const dups = [...byHash.values()].filter((a) => a.length > 1);
console.log(`🔍 스캔 ${scanned}컷 · 바이트중복 그룹 ${dups.length}개`);
for (const g of dups) {
  console.log("  ⚠️ 동일: " + g.map((x) => `${x.slug}/${x.file}`).join("  ==  "));
}
if (!dups.length) console.log("  ✅ 중복 0 — 깨끗");
console.log("DUP_SCAN_DONE");
