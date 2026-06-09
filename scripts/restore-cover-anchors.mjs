/**
 * 페이지 일러스트 캐릭터 일관용 anchor 복원.
 * cover.webp 만 있고 cover.png 가 없는 daily 책의 cover.png 를 복원(dwebp).
 * (배포 후 png 정리되었어도 추가 페이지 생성 시 anchor 필요)
 *   node scripts/restore-cover-anchors.mjs
 */
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const PUB = join(process.cwd(), "public", "seed");
let restored = 0;
let already = 0;
for (const d of readdirSync(PUB)) {
  if (!/^daily-\d+-/.test(d)) continue;
  const dir = join(PUB, d);
  const png = join(dir, "cover.png");
  const webp = join(dir, "cover.webp");
  if (existsSync(png)) {
    already++;
    continue;
  }
  if (existsSync(webp)) {
    const r = spawnSync("dwebp", [webp, "-o", png], { stdio: "ignore" });
    if (r.status === 0) {
      restored++;
      console.log(`🔁 anchor 복원 ${d}`);
    } else {
      console.log(`⚠️ dwebp 실패 ${d} (status ${r.status})`);
    }
  }
}
console.log(`anchor 복원 ${restored}개 · 이미 png ${already}개`);
