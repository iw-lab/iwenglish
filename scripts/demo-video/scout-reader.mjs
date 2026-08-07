/**
 * 리더 정찰 — 쉐도잉 하이라이트 색·치팅 차단 화면을 실제로 찍어서 확인한다.
 *   node scripts/demo-video/scout-reader.mjs <outDir>
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.BASE || "http://localhost:3210";
const SLUG = process.env.SLUG || "green-frog-hop";
const OUT = (process.argv[2] || "./.demo-scout") + "/";
fs.mkdirSync(OUT, { recursive: true });

const shot = (page, n) => page.screenshot({ path: `${OUT}${n}.png` });

const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--autoplay-policy=no-user-gesture-required", "--hide-scrollbars", "--mute-audio"],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
page.on("console", (m) => m.type() === "error" && console.log("[err]", m.text().slice(0, 140)));

await page.goto(`${BASE}/read/${SLUG}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
await shot(page, "R1-reader-initial");

// 연습 모드 컨트롤 열기
const texts = await page.locator("button").allInnerTexts();
console.log("버튼들:", texts.map((t) => t.replace(/\n/g, "·").slice(0, 30)).filter(Boolean).join(" | "));

// 쉐도잉 모드 + 4단계
for (const label of ["쉐도잉"]) {
  const b = page.getByRole("button", { name: new RegExp(label) }).first();
  if (await b.count()) {
    await b.click().catch(() => {});
    await page.waitForTimeout(600);
  }
}
await shot(page, "R2-shadow-panel");

// 사다리 4단계(표준 쉐도잉) 선택
const step4 = page.locator('[title*="표준 쉐도잉"]').first();
if (await step4.count()) {
  await step4.click().catch(() => {});
  await page.waitForTimeout(400);
}
await shot(page, "R3-step4");

// 재생 → 하이라이트 두 트랙이 도는 순간을 여러 장 찍는다
const play = page.getByRole("button", { name: "재생" }).first();
if (await play.count()) await play.click().catch(() => {});
for (let i = 1; i <= 5; i++) {
  await page.waitForTimeout(900);
  await shot(page, `R4-playing-${i}`);
}

// 실제 하이라이트 클래스/색 추출
const colors = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll("span,mark")) {
    const cs = getComputedStyle(el);
    const hasBg = cs.backgroundColor !== "rgba(0, 0, 0, 0)";
    const hasUl = cs.textDecorationLine !== "none" || cs.borderBottomWidth !== "0px";
    if ((hasBg || hasUl) && el.textContent.trim() && el.textContent.trim().length < 24) {
      out.push({
        text: el.textContent.trim().slice(0, 20),
        cls: el.className.toString().slice(0, 60),
        bg: cs.backgroundColor,
        color: cs.color,
        deco: cs.textDecorationLine + " " + cs.textDecorationColor,
        border: cs.borderBottomWidth + " " + cs.borderBottomColor,
      });
    }
  }
  return out.slice(0, 12);
});
console.log("\n하이라이트 색:");
for (const c of colors) console.log(" ", JSON.stringify(c));

await browser.close();
console.log("\n산출:", OUT);
