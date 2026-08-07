/** 단어 퀴즈 화면 정찰 — 정답/오답 카드까지 실제로 눌러 본다. */
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
await ctx.addInitScript((p) => localStorage.setItem("echotale-progress", JSON.stringify(p)), seededProgress);
const page = await ctx.newPage();
page.on("console", (m) => m.type() === "error" && console.log("[err]", m.text().slice(0, 140)));

await page.goto(`${BASE}/learn`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}Q0-learn-hub.png` });
console.log("[hub]", (await page.locator("main").innerText()).slice(0, 400).replace(/\n+/g, " · "));

// "오늘의 복습" 카드 진입
const review = page.locator("a,button").filter({ hasText: /오늘의 복습/ }).first();
console.log("복습 카드 개수:", await review.count());
if (await review.count()) {
  await review.click().catch((e) => console.log("클릭 실패:", e.message.slice(0, 80)));
  await page.waitForTimeout(3000);
}
await page.screenshot({ path: `${OUT}Q1-question.png` });
console.log("\n[문제]", (await page.locator("main").innerText()).slice(0, 500).replace(/\n+/g, " · "));

const opts = page.locator("main button");
console.log("\n버튼:", (await opts.allInnerTexts()).map((t) => t.replace(/\n/g, "·").slice(0, 26)).join(" | "));

// 아무거나 하나 골라 결과 화면을 본다
if (await opts.count()) {
  await opts.nth(Math.max(0, (await opts.count()) - 1)).click().catch(() => {});
  await page.waitForTimeout(2200);
}
await page.screenshot({ path: `${OUT}Q2-answered.png` });
console.log("\n[답변 후]", (await page.locator("main").innerText()).slice(0, 500).replace(/\n+/g, " · "));

await browser.close();
console.log("\n산출:", OUT);
