/**
 * 라이브 앱 UI 정찰 — 시연영상 조작 순서를 짜기 위한 셀렉터/스크린샷 수집.
 * mp3 코덱이 필요하므로 번들 크로미엄이 아니라 실제 Chrome(channel:"chrome")을 쓴다.
 *   node scripts/demo-video/explore.mjs [outDir]
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.BASE || "https://echotale.simssijjang-d79.workers.dev";
const OUT = (process.argv[2] || "./.demo-scout") + "/";
fs.mkdirSync(OUT, { recursive: true });

const dump = async (page, name) => {
  await page.screenshot({ path: `${OUT}${name}.png` });
  const els = await page.evaluate(() => {
    const pick = (el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return null;
      return {
        tag: el.tagName.toLowerCase(),
        text: (el.innerText || "").trim().slice(0, 42),
        aria: el.getAttribute("aria-label") || undefined,
        title: el.getAttribute("title") || undefined,
        box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      };
    };
    return [...document.querySelectorAll("button,a,select,input,[role=button],[role=tab]")]
      .map(pick)
      .filter(Boolean);
  });
  fs.writeFileSync(`${OUT}${name}.json`, JSON.stringify(els, null, 1));
  console.log(`\n── ${name} ── (${els.length})`);
  for (const e of els) {
    console.log(
      `  ${e.tag.padEnd(6)} ${JSON.stringify(e.text).padEnd(34)}` +
        `${e.aria ? " aria=" + JSON.stringify(e.aria) : ""}${e.title ? " title=" + JSON.stringify(e.title.slice(0, 30)) : ""}`,
    );
  }
};

const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--autoplay-policy=no-user-gesture-required", "--hide-scrollbars"],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
page.on("console", (m) => m.type() === "error" && console.log("  [err]", m.text().slice(0, 120)));

await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await dump(page, "01-home");

for (let i = 0; i < 6; i++) {
  const next = page.locator("button", { hasText: /다음|시작|건너뛰|바로/ }).first();
  if (await next.count().catch(() => 0)) {
    await next.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(800);
  } else break;
}
await dump(page, "02-after-onboarding");

for (const [path, name] of [
  ["/book/green-frog-hop", "03-book-detail"],
  ["/read/green-frog-hop", "04-reader"],
  ["/learn", "05-learn"],
  ["/progress", "06-progress"],
]) {
  await page.goto(BASE + path, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(2500);
  await dump(page, name);
}

console.log("\n산출:", OUT);
await browser.close();
