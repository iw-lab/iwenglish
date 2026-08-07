/**
 * 시드 고정 상태에서 1·2번 문제의 정답 인덱스를 알아낸다.
 * 답을 고르면 SRS 상자가 바뀌어 다음 문제 생성이 달라지므로,
 * "1번을 실제 녹화와 똑같이 answer" 한 뒤에 2번을 조사해야 한다.
 *   node scripts/demo-video/quiz-answers.mjs [seed]
 */
import { chromium } from "@playwright/test";
import { seededProgress } from "./demo-data.mjs";
import { seedRandom } from "./seeded-random.mjs";

const BASE = process.env.BASE || "http://localhost:3210";
const SEED = Number(process.argv[2] || 20260827);

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"],
});

/** 문제 화면까지 들어간 새 컨텍스트를 만든다. */
async function open() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(`(${seedRandom.toString()})(${SEED})`);
  await ctx.addInitScript(
    (p) => localStorage.setItem("echotale-progress", JSON.stringify(p)),
    seededProgress,
  );
  const page = await ctx.newPage();
  await page.goto(`${BASE}/learn`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.locator("a,button").filter({ hasText: /오늘의 복습/ }).first().click();
  await page.waitForTimeout(2000);
  return { ctx, page };
}

/** 4지선다 보기 버튼 — WordQuestionView 에서 보기만 text-left 를 쓴다. */
const optionButtons = (page) => page.locator("main button.text-left");

async function prompt(page) {
  return (await page.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 160);
}

/** 아무 보기나 눌러 초록(border-good)으로 바뀐 보기의 인덱스를 읽는다. */
async function discover(page, pickIdx) {
  const opts = optionButtons(page);
  const n = await opts.count();
  const texts = await opts.allInnerTexts();
  await opts.nth(pickIdx % n).click();
  await page.waitForTimeout(1200);
  const classes = await opts.evaluateAll((els) => els.map((e) => e.className));
  const correct = classes.findIndex((c) => c.includes("border-good"));
  return { n, texts: texts.map((t) => t.trim().slice(0, 16)), correct };
}

// ── 1라운드: 1번 문제의 정답 찾기 ──
let { ctx, page } = await open();
console.log("Q1 프롬프트:", await prompt(page));
const q1 = await discover(page, 0);
console.log("Q1 보기:", q1.texts.join(" | "), "→ 정답 index:", q1.correct);
await ctx.close();

// ── 2라운드: 1번을 정답으로 맞힌 뒤 2번 문제 조사 ──
({ ctx, page } = await open());
const opts1 = optionButtons(page);
await opts1.nth(q1.correct).click();
await page.waitForTimeout(1400);
await page.locator("button").filter({ hasText: /다음 문제/ }).first().click();
await page.waitForTimeout(1600);
console.log("\nQ2 프롬프트:", await prompt(page));
const q2 = await discover(page, 0);
console.log("Q2 보기:", q2.texts.join(" | "), "→ 정답 index:", q2.correct);
await ctx.close();

const wrongForQ2 = (q2.correct + 1) % q2.n;
console.log(
  `\n녹화용: SEED=${SEED}  Q1정답=${q1.correct}  Q2오답=${wrongForQ2} (정답 ${q2.correct} 회피)`,
);

await browser.close();
