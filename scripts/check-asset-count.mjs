/**
 * 배포 자산 개수 점검 — wrangler 상한(MAX_ASSET_COUNT_DEFAULT = 20,000)에 걸리기 전에 알린다.
 *
 * ⚠️ 제외 규칙의 정본은 **public/.assetsignore** 하나다(빌드가 public/ 을 그대로
 * .open-next/assets/ 로 복사하므로 거기서 그대로 동작한다). 이 스크립트는 규칙을
 * 새로 쓰지 않고 **결과만 센다** — 규칙을 두 곳에 두면 한쪽만 고쳐져 갈라진다.
 *
 * 배경(2026-08-25): 책이 352권까지 늘면서 자산이 20,488개가 됐다. png 3,460장은
 * public/.assetsignore 가 이미 걸러 주고 있어 실제 업로드는 17,028개지만, 상한까지
 * 여유가 크지 않다. 책을 더 넣기 전에 숫자를 보고 알 수 있어야 한다.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ASSETS = join(process.cwd(), ".open-next", "assets");
const LIMIT = 20000;

if (!existsSync(ASSETS)) {
  console.error("✗ .open-next/assets 없음 — opennextjs-cloudflare build 뒤에 실행하세요.");
  process.exit(1);
}

const ignoreFile = join(ASSETS, ".assetsignore");
if (!existsSync(ignoreFile)) {
  console.error(
    "✗ .open-next/assets/.assetsignore 가 없다 — public/.assetsignore 가 사라졌거나 복사되지 않았다. 그대로 배포하면 참조되지 않는 png 수천 장이 함께 올라간다.",
  );
  process.exit(1);
}

// 지금 쓰는 규칙은 `seed/**/*.png` 한 줄뿐이라 그것만 해석한다.
// 규칙이 늘어나면 여기도 같이 늘려야 한다(그때 이 검사가 과소평가하지 않도록).
const rules = readFileSync(ignoreFile, "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"));
const onlyKnownRule = rules.length === 1 && rules[0] === "seed/**/*.png";

let total = 0;
let ignored = 0;
const walk = (dir, rel = "") => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, rel ? `${rel}/${name}` : name);
    else {
      total++;
      if (rel.startsWith("seed") && name.endsWith(".png")) ignored++;
    }
  }
};
walk(ASSETS);

const remaining = total - ignored;
console.log(
  `✅ 자산 개수 — 전체 ${total.toLocaleString()} · 제외 ${ignored.toLocaleString()}(seed png) · 업로드 ${remaining.toLocaleString()} / 상한 ${LIMIT.toLocaleString()}`,
);
if (!onlyKnownRule)
  console.warn(
    `⚠️ .assetsignore 규칙이 바뀌었다(${rules.join(", ")}) — 이 스크립트의 계산식도 맞춰 고치세요. 지금 수치는 신뢰할 수 없다.`,
  );
if (remaining > LIMIT) {
  console.error(`✗ 업로드 대상이 상한을 넘는다 — 배포가 실패한다.`);
  process.exit(1);
}
if (remaining > LIMIT * 0.9)
  console.warn(`⚠️ 상한의 90% 초과 — 책을 더 추가하기 전에 자산 정리가 필요하다.`);
