/** /learn · /progress 정찰 + 시드 데이터 검증. */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import { seededProgress } from "./demo-data.mjs";

const BASE = process.env.BASE || "http://localhost:3210";
const OUT = (process.argv[2] || "./.demo-scout") + "/";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--autoplay-policy=no-user-gesture-required", "--hide-scrollbars", "--mute-audio"],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript((p) => {
  localStorage.setItem("echotale-progress", JSON.stringify(p));
}, seededProgress);
const page = await ctx.newPage();
page.on("console", (m) => m.type() === "error" && console.log("[err]", m.text().slice(0, 140)));

const report = async (name) => {
  await page.screenshot({ path: `${OUT}${name}.png` });
  const btns = await page.locator("button, [role=tab]").allInnerTexts();
  console.log(`\n── ${name} ──`);
  console.log("  " + btns.map((t) => t.replace(/\n/g, "·").slice(0, 30)).filter(Boolean).join(" | "));
};

await page.goto(`${BASE}/learn`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3500);
await report("L1-learn");

// 첫 문제 화면을 좀 더 살펴본다
const body = await page.locator("main").innerText().catch(() => "");
console.log("\n[learn 본문]\n" + body.slice(0, 600));

await page.goto(`${BASE}/progress`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await report("P1-progress");

const parent = page.getByRole("button", { name: /보호자/ }).first();
if (await parent.count()) {
  await parent.click();
  await page.waitForTimeout(2500);
}
await page.screenshot({ path: `${OUT}P2-parent-report.png` });
const ptext = await page.locator("main").innerText().catch(() => "");
console.log("\n[보호자 리포트 본문]\n" + ptext.slice(0, 700));

await browser.close();
console.log("\n산출:", OUT);
