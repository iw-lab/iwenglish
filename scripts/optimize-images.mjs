/**
 * public/seed 의 대용량 PNG 일러스트(평균 ~3.6MB)를 웹용 WebP 로 압축.
 * - 가로 1280px 리사이즈 + q82 → 장당 ~150~300KB (리더 전환 매끄럽게, 대역폭 ↓)
 * - cover.png/pN.png → cover.webp/pN.webp 동일 위치 생성
 *   node scripts/optimize-images.mjs [conc]
 */
import { spawn } from "node:child_process";
import { readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const PUB = join(process.cwd(), "public", "seed");
const Q = 82;
const W = 1280;

function toWebp(png) {
  const out = png.replace(/\.png$/, ".webp");
  return new Promise((resolve) => {
    const child = spawn(
      "cwebp",
      ["-quiet", "-q", String(Q), "-resize", String(W), "0", png, "-o", out],
      { stdio: "ignore" },
    );
    child.on("exit", () => resolve(existsSync(out) ? out : null));
    child.on("error", () => resolve(null));
  });
}

function allPngs() {
  const list = [];
  for (const slug of readdirSync(PUB)) {
    const dir = join(PUB, slug);
    if (!statSync(dir).isDirectory()) continue;
    for (const f of readdirSync(dir)) {
      if (f.endsWith(".png")) list.push(join(dir, f));
    }
  }
  return list;
}

async function pool(items, conc, fn) {
  let i = 0,
    done = 0;
  const worker = async () => {
    while (i < items.length) {
      const it = items[i++];
      const r = await fn(it);
      done++;
      if (r) console.log(`✅ ${done}/${items.length} ${r.split("/seed/")[1]}`);
      else console.log(`⚠️ 실패 ${it.split("/seed/")[1]}`);
    }
  };
  await Promise.all(Array.from({ length: conc }, worker));
}

const conc = Number(process.argv[2]) || 8;
const pngs = allPngs();
console.log(`🗜️  ${pngs.length}장 PNG → WebP (q${Q}, ${W}px), 동시 ${conc}`);
await pool(pngs, conc, toWebp);
console.log("🎉 압축 완료");
