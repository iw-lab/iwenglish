/**
 * EchoTale 시연영상 화면 녹화 (2026 오픈소스 개발자대회 제출용).
 *
 *   pnpm build && PORT=3210 pnpm start        # 먼저 로컬 프로덕션 서버를 띄운다
 *   node scripts/demo-video/record.mjs <outDir> [세그먼트…]
 *
 * 설계 메모
 * - 라이브가 아니라 로컬 프로덕션 빌드를 녹화한다. 홈에 책 352권 카드가 한꺼번에 뜨면서
 *   에셋이 폭주해 워커가 503 을 뱉은 적이 있다(자기 IP 부하). 화면은 어차피 동일하다.
 * - recordVideo 는 뷰포트만 담는다 → 주소창·북마크바가 영상에 안 나온다.
 * - Playwright 영상에는 마우스 커서가 찍히지 않는다. 무엇을 눌렀는지 보이지 않으면
 *   시연이 안 되므로 가상 커서를 주입해 이동·클릭을 눈에 보이게 만든다.
 * - 소리는 영상에 안 담긴다(recordVideo 는 무음). 대신 재생된 오디오 파일과 시각을
 *   기록해 두고, 후반 합성에서 같은 mp3 를 같은 위치에 얹는다.
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { seededProgress, cleanProgress } from "./demo-data.mjs";
import { seedRandom } from "./seeded-random.mjs";

const BASE = process.env.BASE || "http://localhost:3210";
const SEED = Number(process.env.SEED || 20260827);
const CARDS = "file://" + path.resolve("scripts/demo-video/cards.html");
const OUT = path.resolve(process.argv[2] || "./.demo-out");
const RAW = path.join(OUT, "raw");
fs.mkdirSync(RAW, { recursive: true });

const only = process.argv.slice(3);
const V = { width: 1280, height: 720 };

/* ────────────────────────── 가상 커서 ────────────────────────── */

const CURSOR_JS = `
  window.__cursor = () => {
    if (document.getElementById("__demo_cursor")) return;
    const c = document.createElement("div");
    c.id = "__demo_cursor";
    c.style.cssText = [
      "position:fixed","left:0","top:0","width:26px","height:26px","z-index:2147483647",
      "pointer-events:none","transform:translate(-6px,-4px)","transition:none",
      "filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))",
    ].join(";");
    c.innerHTML =
      '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l7 18 2.5-7.5L21 10z" fill="#fff" stroke="#2b2b2b" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    const r = document.createElement("style");
    r.textContent = "@keyframes __demo_ring{from{opacity:.75;transform:translate(-50%,-50%) scale(.35)}to{opacity:0;transform:translate(-50%,-50%) scale(1)}}";
    document.head.appendChild(r);
  };
  window.__moveCursor = (x, y) => {
    const c = document.getElementById("__demo_cursor");
    if (c) { c.style.left = x + "px"; c.style.top = y + "px"; }
  };
  window.__ripple = (x, y) => {
    const d = document.createElement("div");
    d.style.cssText = [
      "position:fixed","left:" + x + "px","top:" + y + "px","width:74px","height:74px",
      "border-radius:50%","border:3px solid oklch(0.72 0.13 40)","z-index:2147483646",
      "pointer-events:none","animation:__demo_ring .55s ease-out forwards",
    ].join(";");
    document.documentElement.appendChild(d);
    setTimeout(() => d.remove(), 600);
  };
`;

/** 커서를 대상 위로 부드럽게 옮긴 뒤 클릭 — "무엇을 눌렀는지" 가 보이게. */
async function click(page, locator, { settle = 420 } = {}) {
  const el = locator.first();
  await el.waitFor({ state: "visible", timeout: 15000 });
  await el.scrollIntoViewIfNeeded().catch(() => {});
  const box = await el.boundingBox();
  if (!box) throw new Error("클릭 대상의 위치를 찾지 못함");
  const x = Math.round(box.x + box.width / 2);
  const y = Math.round(box.y + box.height / 2);

  await page.evaluate(
    ([tx, ty, ms]) =>
      new Promise((done) => {
        const c = document.getElementById("__demo_cursor");
        const sx = parseFloat(c?.style.left || "640");
        const sy = parseFloat(c?.style.top || "600");
        const t0 = performance.now();
        const ease = (p) => 1 - Math.pow(1 - p, 3);
        const step = () => {
          const p = Math.min(1, (performance.now() - t0) / ms);
          const e = ease(p);
          window.__moveCursor(sx + (tx - sx) * e, sy + (ty - sy) * e);
          p < 1 ? requestAnimationFrame(step) : done();
        };
        step();
      }),
    [x, y, settle],
  );
  await page.evaluate(([x, y]) => window.__ripple(x, y), [x, y]);
  await page.waitForTimeout(180);
  await el.click({ timeout: 15000 });
}

/** 관성 있는 스크롤 — 뚝뚝 끊기면 영상에서 어지럽다. */
const smoothScroll = (page, to, ms) =>
  page.evaluate(
    ([to, ms]) =>
      new Promise((done) => {
        const from = window.scrollY;
        const t0 = performance.now();
        const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
        const step = () => {
          const p = Math.min(1, (performance.now() - t0) / ms);
          window.scrollTo(0, from + (to - from) * ease(p));
          p < 1 ? requestAnimationFrame(step) : done();
        };
        step();
      }),
    [to, ms],
  );

/* ────────────────────────── 녹화 하네스 ────────────────────────── */

const browser = await chromium.launch({
  channel: "chrome", // 번들 크로미엄에는 mp3 코덱이 없다 → 실제 Chrome 을 쓴다
  headless: false,
  args: ["--autoplay-policy=no-user-gesture-required", "--hide-scrollbars", "--mute-audio"],
});

async function record(name, storage, fn) {
  if (only.length && !only.includes(name)) return;
  const t = Date.now();
  const ctx = await browser.newContext({
    viewport: V,
    recordVideo: { dir: RAW, size: V },
    deviceScaleFactor: 1,
  });
  await ctx.addInitScript(`(${seedRandom.toString()})(${SEED})`);
  await ctx.addInitScript(CURSOR_JS);
  await ctx.addInitScript(() => {
    // 재생된 오디오와 그 시각을 남긴다 — 후반에 같은 소리를 같은 자리에 얹기 위해.
    window.__audio = [];
    const orig = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      window.__audio.push({ src: this.currentSrc || this.src, t: Date.now() });
      return orig.apply(this, arguments);
    };
  });
  if (storage) {
    await ctx.addInitScript(
      (p) => localStorage.setItem("echotale-progress", JSON.stringify(p)),
      storage,
    );
  }

  const page = await ctx.newPage();
  const t0 = Date.now();
  page.on("console", (m) => m.type() === "error" && console.log(`  [err:${name}]`, m.text().slice(0, 110)));

  let audio = [];
  try {
    await fn(page);
    audio = await page.evaluate(() => window.__audio || []).catch(() => []);
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message.split("\n")[0]}`);
  }

  const video = page.video();
  await ctx.close(); // 영상은 컨텍스트를 닫아야 기록된다
  const src = await video.path();
  const dest = path.join(RAW, `${name}.webm`);
  fs.renameSync(src, dest);

  const events = audio.map((a) => ({
    file: decodeURIComponent(a.src.replace(/^.*\/seed\//, "")),
    at: +((a.t - t0) / 1000).toFixed(2),
  }));
  fs.writeFileSync(
    path.join(OUT, `${name}.json`),
    JSON.stringify({ segment: name, seconds: +((Date.now() - t) / 1000).toFixed(2), audio: events }, null, 2),
  );
  console.log(`  ✓ ${name}  ${((Date.now() - t0) / 1000).toFixed(1)}s  오디오 ${events.length}개`);
}

const ready = async (page) => {
  await page.evaluate(() => window.__cursor());
  await page.evaluate(() => window.__moveCursor(640, 640));
};

/* ────────────────────────── 세그먼트 ────────────────────────── */

// 1. 오프닝 — 문제 제기 카드 (나레이션 15.3초)
await record("intro", null, async (page) => {
  await page.goto(CARDS + "#intro", { waitUntil: "load" });
  await page.waitForTimeout(16500);
});

// 2. 서재 — 권수의 압도감 (15.1초)
await record("library", seededProgress, async (page) => {
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3200);
  await ready(page);
  await page.waitForTimeout(1500);
  await smoothScroll(page, 620, 4200);
  await page.waitForTimeout(900);
  await smoothScroll(page, 1500, 4200);
  await page.waitForTimeout(1200);
  await smoothScroll(page, 2400, 3200);
  await page.waitForTimeout(1400);
});

// 3. 지연 추적 쉐도잉 — 이 영상의 얼굴 (25.0초)
await record("shadow", seededProgress, async (page) => {
  await page.goto(BASE + "/read/green-frog-hop", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await ready(page);
  await click(page, page.getByRole("button", { name: "쉐도잉" }));
  await page.waitForTimeout(900);
  // ⚠️ 사다리 단계를 바꾸면 재생이 멈춘다(실측) → 단계마다 재생을 다시 눌러야 한다.
  const play = () => click(page, page.getByRole("button", { name: "재생" }));
  await click(page, page.locator('[title*="느린 쉐도잉"]'));
  await page.waitForTimeout(500);
  await play();
  await page.waitForTimeout(7200); // 느린 단계 — 두 트랙이 크게 벌어져 도는 걸 보여준다
  await click(page, page.locator('[title*="표준 쉐도잉"]'));
  await page.waitForTimeout(400);
  await play();
  await page.waitForTimeout(7600); // ★ 한 박자 뒤 겹쳐 읽기 — 가장 오래 보여줄 구간
  await click(page, page.locator('[title*="블라인드"]'));
  await page.waitForTimeout(400);
  await play();
  await page.waitForTimeout(8200); // 글자가 사라진 채로 따라 읽기
  await page.waitForTimeout(1500);
});

// 4. 치팅 차단 — 결정타 (26.3초). 기록이 하나도 없는 상태에서 시작해야 한다.
await record("cheat", cleanProgress, async (page) => {
  await page.goto(BASE + "/read/one-yellow-leaf", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2600);
  await ready(page);
  // 재생하지 않고 끝까지 넘긴다 — "듣지 않고 넘기는" 아이의 행동
  for (let i = 0; i < 5; i++) {
    // 화면 오른쪽 아래의 큰 "다음 쪽" 알약 버튼(글자가 있는 유일한 버튼).
    // 상단 화살표에도 같은 aria-label 이 있어 role 로 잡으면 작은 쪽이 걸린다.
    await click(page, page.locator("button", { hasText: /^다음 쪽/ }), { settle: 260 });
    await page.waitForTimeout(420);
  }
  await page.waitForTimeout(4800); // 도장이 없고 "안 들은 문장 6개" 가 뜬 화면에서 멈춘다
  await click(page, page.getByRole("button", { name: /이어서 읽기/ }));
  await page.waitForTimeout(25500); // 6문장(23.0초)을 실제로 끝까지 듣는다
  await click(page, page.getByRole("button", { name: /도장 찍기/ }));
  await page.waitForTimeout(4000); // 도장 + 콘페티
});

// 5. 단어 객관화 (15.8초) — 정답 초록 → 오답 해설 공개
await record("words", seededProgress, async (page) => {
  await page.goto(BASE + "/learn", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await ready(page);
  await click(page, page.locator("a,button").filter({ hasText: /오늘의 복습/ }));
  await page.waitForTimeout(2600);
  const opts = page.locator("main button.text-left");
  await click(page, opts.nth(0)); // 정답(시드 고정)
  await page.waitForTimeout(2600);
  await click(page, page.locator("button").filter({ hasText: /다음 문제/ }));
  await page.waitForTimeout(2200);
  await click(page, page.locator("main button.text-left").nth(3)); // 일부러 오답
  await page.waitForTimeout(900);
  await smoothScroll(page, 210, 900); // 공개된 뜻·예문 카드가 화면 밖으로 잘린다
  await page.waitForTimeout(5300);
});

// 6. 학부모 리포트 (15.0초)
await record("report", seededProgress, async (page) => {
  await page.goto(BASE + "/progress", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2800);
  await ready(page);
  await click(page, page.getByRole("button", { name: /보호자/ }));
  await page.waitForTimeout(6500);
  await smoothScroll(page, 420, 2600);
  await page.waitForTimeout(4500);
});

// 7. 오픈소스 마무리 (12.7초)
await record("outro", null, async (page) => {
  await page.goto(CARDS + "#outro", { waitUntil: "load" });
  await page.waitForTimeout(14500);
});

await browser.close();
console.log("\n산출:", OUT);
