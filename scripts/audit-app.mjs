/**
 * EchoTale 전수 실측 감사 — 실제 Chrome 으로 모든 화면·기능을 조작하고 결함을 수집한다.
 *
 *   node scripts/audit-app.mjs [baseUrl]        기본 http://localhost:3000
 *
 * ── 왜 Playwright 인가 ────────────────────────────────────────────────────────
 * 확장으로 붙은 브라우저는 오디오 디코딩이 죽어 있어도 화면상으로는 "재생 중"으로 보인다
 * (readyState 0 인데 pause 아이콘). 그 상태로 "재생이 안 된다"고 결론내면 앱을 잘못 고친다.
 * 그래서 오디오 의존 검사는 **자동화가 소유한 실제 Chrome**에서 돌린다.
 * `channel: "chrome"` 필수 — 번들 Chromium 은 mp3 같은 독점 코덱이 없다.
 *
 * ── 판정 원칙 ────────────────────────────────────────────────────────────────
 * "버튼이 있다"가 아니라 **상태가 실제로 바뀌었는가**로 판정한다.
 *   재생 → 커버리지 숫자가 오르는가 · 도장 게이트 → 진짜로 안 나오는가 ·
 *   단어 문제 → 소리가 실제로 났는가(canplay)
 */
import { chromium } from "@playwright/test";

const BASE = process.argv[2] || "http://localhost:3000";
const findings = [];
const add = (sev, area, msg, detail = "") =>
  findings.push({ sev, area, msg, detail });

/** 페이지마다 콘솔 에러·실패 요청을 모은다 */
function watch(page, area, bag) {
  page.on("console", (m) => {
    if (m.type() === "error") bag.console.push(`${area}: ${m.text().slice(0, 200)}`);
  });
  page.on("pageerror", (e) => bag.console.push(`${area}: [pageerror] ${e.message.slice(0, 200)}`));
  page.on("response", (r) => {
    if (r.status() >= 400) bag.net.push(`${area}: ${r.status()} ${r.url().replace(BASE, "")}`);
  });
}

/** 온보딩 3화면을 넘긴다(있으면) */
async function skipOnboarding(page) {
  for (let i = 0; i < 4; i++) {
    const b = page.getByRole("button", { name: /다음|시작하기/ });
    if (!(await b.count())) break;
    await b.first().click().catch(() => {});
    await page.waitForTimeout(350);
  }
}

const num = async (page, re) => {
  const t = await page.locator("body").innerText();
  const m = t.match(re);
  return m ? Number(m[1]) : null;
};

async function main() {
  const browser = await chromium.launch({
    channel: "chrome",
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  const ctx = await browser.newContext({ viewport: { width: 420, height: 880 } });
  const bag = { console: [], net: [] };
  const page = await ctx.newPage();
  watch(page, "app", bag);

  // 오디오가 실제로 재생됐는지 앱과 무관하게 계측
  await ctx.addInitScript(() => {
    window.__au = { tried: [], ok: [], fail: [] };
    const OA = window.Audio;
    window.Audio = function (s) {
      const a = new OA(s);
      if (s) {
        window.__au.tried.push(s);
        a.addEventListener("canplay", () => window.__au.ok.push(s));
        a.addEventListener("error", () => window.__au.fail.push(s));
      }
      return a;
    };
    window.Audio.prototype = OA.prototype;
  });

  // ── 0. 오디오 디코딩 살아 있는지 먼저 확인(대조군) ──
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const decodes = await page.evaluate(async () => {
    const a = document.createElement("audio");
    a.src = "/seed/brown-boot-marches/audio/p1-s1.mp3";
    a.load();
    await new Promise((r) => setTimeout(r, 3000));
    return { ready: a.readyState, dur: a.duration };
  });
  if (!decodes.ready) {
    console.error("❌ 이 브라우저에서 mp3 디코딩 불가 — 오디오 판정 신뢰 불가. 중단.");
    await browser.close();
    process.exit(2);
  }
  console.log(`✅ 오디오 대조군 통과 (readyState ${decodes.ready}, ${decodes.dur.toFixed(2)}s)\n`);

  await skipOnboarding(page);

  // ── 1. 모든 라우트가 뜨는가 ──
  const routes = ["/", "/learn", "/wordbook", "/progress", "/more", "/pricing"];
  for (const r of routes) {
    const res = await page.goto(BASE + r, { waitUntil: "networkidle" }).catch(() => null);
    if (!res || res.status() >= 400) add("HIGH", "라우트", `${r} 응답 ${res?.status()}`);
    const txt = await page.locator("body").innerText();
    if (/Application error|Unhandled|hydration/i.test(txt))
      add("HIGH", "라우트", `${r} 에 에러 화면`, txt.slice(0, 120));
    console.log(`  ${r} → ${res?.status()} (${txt.length}자)`);
  }

  // ── 2. 낭독: 재생하면 커버리지가 실제로 오르는가 ──
  console.log("\n[낭독] 재생 → 커버리지 상승 검사");
  await page.goto(`${BASE}/read/brown-boot-marches`, { waitUntil: "networkidle" });
  await skipOnboarding(page);
  const before = await num(page, /(\d+)%/);
  // 재생 버튼은 aria-label 로 잡되, 없으면 하단 중앙의 원형 버튼으로 폴백한다
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")];
    const b = btns.find((x) => /재생|play/i.test(x.getAttribute("aria-label") || "")) ||
      btns.find((x) => x.querySelector("svg") && x.getBoundingClientRect().top > innerHeight * 0.75 &&
        Math.abs(x.getBoundingClientRect().left + x.getBoundingClientRect().width / 2 - innerWidth / 2) < 60);
    b?.click();
  });
  await page.waitForTimeout(14000);
  const after = await num(page, /(\d+)%/);
  const au = await page.evaluate(() => window.__au);
  console.log(`  커버리지 ${before}% → ${after}% · 오디오 시도 ${au.tried.length} 성공 ${au.ok.length} 실패 ${au.fail.length}`);
  if (after === null || after <= (before ?? 0))
    add("CRITICAL", "낭독", `재생 14초 후에도 커버리지가 오르지 않음 (${before}% → ${after}%)`,
      `오디오 canplay ${au.ok.length}건`);
  if (au.fail.length) add("HIGH", "낭독", `낭독 오디오 로드 실패 ${au.fail.length}건`, au.fail.slice(0, 3).join(", "));

  // ── 3. 치팅 차단: 안 듣고 끝까지 넘기면 도장이 막히는가 ──
  console.log("\n[치팅 차단] 무청취 점프 검사");
  const p2 = await ctx.newPage();
  watch(p2, "cheat", bag);
  await p2.goto(`${BASE}/read/busy-little-ant`, { waitUntil: "networkidle" });
  await skipOnboarding(p2);
  for (let i = 0; i < 12; i++) {
    const b = p2.getByRole("button", { name: /다음 쪽/ });
    if (!(await b.count()) || (await b.first().isDisabled())) break;
    await b.first().click();
    await p2.waitForTimeout(280);
  }
  await p2.waitForTimeout(1200);
  // 🔴 본문 텍스트로 도장 유무를 판정하면 안 된다. 차단 안내문 자체가
  //    "문장을 끝까지 들어야 도장을 찍을 수 있어요" 라서 /도장을 찍/ 에 걸린다(실측 오탐).
  //    판정은 **실제 버튼 목록**으로 한다.
  const ct = await p2.locator("body").innerText();
  const hasStamp = await p2.evaluate(() =>
    [...document.querySelectorAll("button")].some(
      (b) => b.offsetParent !== null && /도장|왕관/.test(b.textContent),
    ),
  );
  const hasBlock = /아직 안 들은 문장이/.test(ct);
  console.log(`  도장버튼 ${hasStamp ? "있음" : "없음"} · 차단안내 ${hasBlock ? "있음" : "없음"}`);
  if (hasStamp) add("CRITICAL", "치팅차단", "안 듣고 넘겼는데 도장 버튼이 나온다");
  if (!hasBlock) add("HIGH", "치팅차단", "미청취 안내 문구가 없다");
  await p2.close();

  // ── 4. 단어 학습: 레벨별로 소리 없는 '듣고 고르기'가 나오는가 ──
  console.log("\n[단어학습] 레벨별 listen 문제 음성 검사");
  for (const lv of [1, 3, 5]) {
    const p3 = await ctx.newPage();
    watch(p3, `learn-lv${lv}`, bag);
    await p3.goto(`${BASE}/learn`, { waitUntil: "networkidle" });
    await skipOnboarding(p3);
    await p3.evaluate((n) => {
      const b = [...document.querySelectorAll("button")].find((x) => new RegExp(`레벨 ${n}`).test(x.textContent));
      b?.click();
    }, lv);
    await p3.waitForTimeout(1500);
    let listen = 0;
    for (let i = 0; i < 14; i++) {
      const t = await p3.locator("body").innerText();
      if (/잘 듣고/.test(t)) listen++;
      const clicked = await p3.evaluate(() => {
        const o = [...document.querySelectorAll("button")].filter((b) => {
          const r = b.getBoundingClientRect();
          return r.width > 200 && r.height > 34 && !/다음|이전|돌아가|그만/.test(b.textContent);
        });
        if (!o.length) return false;
        o[0].click();
        return true;
      });
      if (!clicked) break;
      await p3.waitForTimeout(500);
      await p3.evaluate(() => [...document.querySelectorAll("button")].find((b) => /다음/.test(b.textContent))?.click());
      await p3.waitForTimeout(700);
    }
    const a3 = await p3.evaluate(() => window.__au);
    const miss = a3.tried.length - a3.ok.length;
    console.log(`  레벨${lv}: listen ${listen}문제 · 음성시도 ${a3.tried.length} 성공 ${a3.ok.length} 실패 ${miss}`);
    if (miss > 0)
      add("CRITICAL", "단어학습",
        `레벨${lv} '듣고 고르기' 음성 ${miss}/${a3.tried.length} 건이 재생 불가 — 단어가 화면에 없어 찍을 수밖에 없다`,
        [...new Set(a3.fail)].slice(0, 5).map((u) => u.split("/").pop()).join(", "));
    await p3.close();
  }

  // ── 5. 보호자 리포트가 렌더되는가(차트 지연로드) ──
  console.log("\n[진도] 보호자 탭 렌더 검사");
  const p4 = await ctx.newPage();
  watch(p4, "progress", bag);
  await p4.goto(`${BASE}/progress`, { waitUntil: "networkidle" });
  await skipOnboarding(p4);
  await p4.evaluate(() => [...document.querySelectorAll("button")].find((b) => /보호자|학부모/.test(b.textContent))?.click());
  await p4.waitForTimeout(3000);
  const svg = await p4.locator("svg.recharts-surface, .recharts-wrapper").count();
  const ptxt = await p4.locator("body").innerText();
  console.log(`  차트 요소 ${svg}개 · 본문 ${ptxt.length}자`);
  if (!/이번 주|주간|보호자/.test(ptxt)) add("MED", "진도", "보호자 리포트 내용이 보이지 않음");
  await p4.close();

  // ── 6. 쉐도잉 사다리 5단계 ──
  console.log("\n[쉐도잉] 사다리 5단계 검사");
  const p5 = await ctx.newPage();
  watch(p5, "shadow", bag);
  await p5.goto(`${BASE}/read/a-rainy-day-friend`, { waitUntil: "networkidle" });
  await skipOnboarding(p5);
  await p5.getByRole("button", { name: /쉐도잉/ }).first().click();
  await p5.waitForTimeout(900);
  const steps = await p5.evaluate(() =>
    [...document.querySelectorAll("button")]
      .filter((b) => /듣기|같이 읽기|느린|표준|블라인드/.test(b.textContent) && b.offsetParent)
      .map((b) => b.textContent.trim().replace(/\s+/g, " ").slice(0, 20)),
  );
  console.log(`  단계 버튼 ${steps.length}개: ${steps.join(" / ")}`);
  if (steps.length < 5) add("MED", "쉐도잉", `사다리 단계가 5개가 아니다 (${steps.length}개)`, steps.join(", "));
  // 블라인드 단계에서 본문이 실제로 가려지는가
  const blind = p5.locator("button").filter({ hasText: /블라인드/ });
  if (await blind.count()) {
    const textBefore = await p5.locator("body").innerText();
    await blind.first().click();
    await p5.waitForTimeout(900);
    const hidden = await p5.evaluate(() => {
      const el = [...document.querySelectorAll("*")].find((e) => e.className?.toString?.().includes("blur") || getComputedStyle(e).filter?.includes("blur"));
      return !!el || /가림|blind/i.test(document.body.className);
    });
    const textAfter = await p5.locator("body").innerText();
    const sentenceGone = textBefore.includes("Mia does not like rainy days.") && !textAfter.includes("Mia does not like rainy days.");
    console.log(`  블라인드: 문장 숨김 ${sentenceGone ? "O" : "X"} · blur요소 ${hidden ? "O" : "X"}`);
    if (!sentenceGone && !hidden) add("MED", "쉐도잉", "블라인드 단계인데 본문이 그대로 보인다");
  } else add("MED", "쉐도잉", "블라인드 단계 버튼을 찾을 수 없다");
  await p5.close();

  // ── 7. 리더에서 단어 탭 → 뜻 표시 ──
  console.log("\n[단어탭] 본문 단어 탭 → 뜻 팝업");
  const p6 = await ctx.newPage();
  watch(p6, "wordtap", bag);
  await p6.goto(`${BASE}/read/a-rainy-day-friend`, { waitUntil: "networkidle" });
  await skipOnboarding(p6);
  // 🔴 특정 단어("rainy")를 찾아 누르면 안 된다 — 리더는 마지막으로 본 쪽에서 열려
  //    그 단어가 화면에 없을 수 있고, 그러면 "뜻이 안 나온다"는 거짓 결함이 난다(실측 오탐).
  //    **지금 쪽에 실제로 있는** 단어를 집어서 누른다.
  const before6 = (await p6.locator("body").innerText()).length;
  const tapped = await p6.evaluate(() => {
    const b = [...document.querySelectorAll("button")].filter((x) => /^[A-Za-z]{3,}$/.test(x.textContent.trim()));
    if (!b.length) return null;
    b[0].click();
    return b[0].textContent.trim();
  });
  await p6.waitForTimeout(3000);
  const t6 = await p6.locator("body").innerText();
  // 판정은 "IPA + 단어장 추가" 가 떴는가 — 특정 뜻 문자열에 의존하지 않는다
  const gotMeaning = /\/.+\/\s*·/.test(t6) && /단어장 추가/.test(t6);
  console.log(`  "${tapped}" 탭 → 뜻카드 ${gotMeaning ? "O" : "X"} (본문 ${before6}→${t6.length}자)`);
  if (!tapped) add("MED", "단어탭", "본문에 탭 가능한 단어 버튼이 없다");
  else if (!gotMeaning) add("HIGH", "단어탭", `"${tapped}" 를 눌러도 뜻 카드가 나오지 않는다`);
  await p6.close();

  // ── 8. 모바일 뷰포트에서 가로 스크롤이 생기지 않는가 ──
  console.log("\n[반응형] 360px 가로 넘침 검사");
  const mob = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const p7 = await mob.newPage();
  watch(p7, "mobile", bag);
  for (const r of ["/", "/learn", "/progress", "/read/busy-little-ant"]) {
    await p7.goto(BASE + r, { waitUntil: "networkidle" });
    await skipOnboarding(p7);
    const o = await p7.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      win: window.innerWidth,
      wide: [...document.querySelectorAll("body *")]
        .filter((e) => e.getBoundingClientRect().right > window.innerWidth + 2 &&
          getComputedStyle(e).overflowX !== "auto" && getComputedStyle(e).overflowX !== "scroll" &&
          !e.closest("[class*=overflow-x-auto],[class*=shelf-row]"))
        .slice(0, 3).map((e) => (e.className || e.tagName).toString().slice(0, 45)),
    }));
    const overflow = o.doc > o.win + 2;
    console.log(`  ${r}: doc ${o.doc} / win ${o.win}${overflow ? "  ⚠︎ 넘침" : ""}`);
    if (overflow) add("MED", "반응형", `${r} 360px 에서 가로 스크롤 발생 (${o.doc}>${o.win})`, o.wide.join(" | "));
  }
  await mob.close();

  await browser.close();

  // ── 결과 ──
  console.log("\n" + "=".repeat(64));
  if (bag.net.length) {
    console.log(`\n네트워크 4xx/5xx ${bag.net.length}건`);
    [...new Set(bag.net)].slice(0, 15).forEach((x) => console.log("   " + x));
  }
  if (bag.console.length) {
    console.log(`\n콘솔 에러 ${bag.console.length}건`);
    [...new Set(bag.console)].slice(0, 15).forEach((x) => console.log("   " + x));
  }
  console.log(`\n결함 ${findings.length}건`);
  const order = { CRITICAL: 0, HIGH: 1, MED: 2, LOW: 3 };
  findings.sort((a, b) => order[a.sev] - order[b.sev]);
  for (const f of findings) console.log(`  [${f.sev}] ${f.area} — ${f.msg}${f.detail ? "\n           " + f.detail : ""}`);
  if (!findings.length) console.log("  ✅ 없음");
  process.exit(findings.some((f) => f.sev === "CRITICAL") ? 1 : 0);
}

main().catch((e) => {
  console.error("감사 스크립트 자체 실패:", e);
  process.exit(3);
});
