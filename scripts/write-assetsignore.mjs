/**
 * .open-next/assets/.assetsignore 생성 — Cloudflare Workers Assets 업로드 제외 목록.
 *
 * 왜 필요한가(2026-08-25 실측):
 *  - 콘텐츠 파이프라인은 그림을 **png 원본 + webp 변환본** 둘 다 public/seed 에 남긴다.
 *    앱이 실제로 쓰는 건 webp 뿐이다(content.generated 의 coverUrl 352개 전부 .webp,
 *    book.json 이미지 참조도 전부 .webp — png 참조 0건).
 *  - 그런데 public/ 전체가 그대로 업로드 대상이 되어, 참조되지 않는 png 3,460장(11GB)이
 *    같이 올라갔고 **총 파일 수가 20,488개로 wrangler 의 상한 20,000(MAX_ASSET_COUNT_DEFAULT)을
 *    넘겨 배포 자체가 막혔다.**
 *  - 앱 아이콘(icon-192.png 등)은 매니페스트가 참조하므로 제외하지 않는다 —
 *    seed 하위 png 만 뺀다.
 *
 * 빌드 산출물 폴더는 매번 새로 만들어지므로 cf:build 단계에서 이 스크립트가 다시 쓴다.
 */
import { existsSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ASSETS = join(process.cwd(), ".open-next", "assets");
if (!existsSync(ASSETS)) {
  console.error("✗ .open-next/assets 없음 — opennextjs-cloudflare build 뒤에 실행하세요.");
  process.exit(1);
}

const IGNORE = ["# 자동 생성 (scripts/write-assetsignore.mjs)", "seed/**/*.png", ""].join("\n");
writeFileSync(join(ASSETS, ".assetsignore"), IGNORE);

// 실제로 몇 개가 빠지고 몇 개가 남는지 세어 보고한다 — 상한에 다시 다가가면 알아야 한다.
let total = 0;
let ignored = 0;
const walk = (dir, rel = "") => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, rel ? `${rel}/${name}` : name);
    else {
      total++;
      if ((rel === "seed" || rel.startsWith("seed/")) && name.endsWith(".png")) ignored++;
    }
  }
};
walk(ASSETS);

const LIMIT = 20000;
const remaining = total - ignored;
console.log(
  `✅ .assetsignore — 전체 ${total.toLocaleString()} · 제외 ${ignored.toLocaleString()}(seed png) · 업로드 ${remaining.toLocaleString()} / 상한 ${LIMIT.toLocaleString()}`,
);
if (remaining > LIMIT) {
  console.error(
    `✗ 업로드 대상 ${remaining.toLocaleString()} 이 상한 ${LIMIT.toLocaleString()} 초과 — 배포가 실패한다. 제외 규칙을 늘리거나 콘텐츠를 줄이세요.`,
  );
  process.exit(1);
}
if (remaining > LIMIT * 0.9)
  console.warn(`⚠️ 상한의 90% 초과 — 책을 더 추가하기 전에 자산 정리가 필요하다.`);
