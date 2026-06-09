/**
 * 전수검사에서 발견된 그림↔문장 불일치 컷 재생성.
 * codex $imagegen, 병렬 동시 3 + 8분 SIGKILL + existsSync 검증 + 재시도.
 * 출력: public/seed/<slug>/p<N>.png  (이후 optimize-images 로 webp 변환)
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PUB = join(ROOT, "public", "seed");
const ANCH = "/tmp/echo-anchors";
const RES = "1536x1024";
const PER_TIMEOUT = 480000;

const STYLE =
  "Soft watercolor children's picture-book illustration, warm gentle light, cozy storybook mood, painterly, wholesome, friendly, full background scene, natural poses, 5-finger hands, no text or letters in image.";
const JUN =
  "Main boy Jun: cheerful Korean boy ~8, short tousled black hair, round face, red t-shirt, blue shorts (EXACTLY match the reference cover face/hair/outfit).";
const NEG_KR =
  "Korean modern everyday setting. NOT cartoon/anime/chibi, no big anime eyes. NOT Greek/Roman/Chinese/Japanese-samurai, NOT historical costume, NO magical glow/fantasy effects, NOT a birthday party unless stated.";

// slug, page, anchor(파일경로 또는 null), prompt
const T = [
  // daily-3: 교실 대화 (강아지/공 X)
  {
    slug: "daily-3-my-new-friend",
    p: 4,
    a: "daily-3-my-new-friend",
    s: `Two Korean boys talking in a bright classroom: Jun (red t-shirt) asking a friendly question to his new friend Leo (green striped shirt), other kids at desks behind, indoor daytime. NO dog, NO ball.`,
    jun: true,
  },
  // daily-4: 학교 급식실 (집 부엌 X). Leo=초록 줄무늬, 조리사=앞치마+모자
  { slug: "daily-4-lunch-time", p: 1, a: "daily-4-lunch-time", jun: true,
    s: `School cafeteria at lunch time. Jun (red t-shirt) sits hungry at a cafeteria table holding an empty metal lunch tray, classmates around. NOT a home kitchen.` },
  { slug: "daily-4-lunch-time", p: 2, a: "daily-4-lunch-time", jun: true,
    s: `Korean school cafeteria serving line. Jun (red t-shirt) holds a metal tray with rice, soup, and a piece of fish; food counter behind. NOT a home kitchen.` },
  { slug: "daily-4-lunch-time", p: 3, a: "daily-4-lunch-time", jun: true,
    s: `Korean school cafeteria. Jun (red t-shirt) with his tray politely asks a lunch cook (apron and cap) for more rice; big rice pot. NOT a mother at home.` },
  { slug: "daily-4-lunch-time", p: 5, a: "daily-4-lunch-time", jun: true,
    s: `Jun (red t-shirt) holding his lunch tray, smiling and saying thank you to a cafeteria cook in apron and cap, school cafeteria background.` },
  { slug: "daily-4-lunch-time", p: 6, a: "daily-4-lunch-time", jun: true,
    s: `School cafeteria. Friend Leo (green striped shirt) frowns and pushes away the fish on his lunch tray; Jun (red t-shirt) sits beside him.` },
  { slug: "daily-4-lunch-time", p: 7, a: "daily-4-lunch-time", jun: true,
    s: `School cafeteria. Leo (green striped shirt) reaches for Jun's apple across the lunch trays; Jun (red t-shirt) smiles and offers it. Two boys, no adult.` },
  { slug: "daily-4-lunch-time", p: 8, a: "daily-4-lunch-time", jun: true,
    s: `Korean school cafeteria. Jun (red t-shirt) and Leo (green striped shirt) eat from metal lunch trays side by side, both happy. NOT a family at home.` },
  // daily-6: 기차 안 / 해변
  { slug: "daily-6-a-weekend-trip", p: 6, a: "daily-6-a-weekend-trip", jun: true,
    s: `Inside a moving modern Korean train. Jun's little sister excitedly points out the window at the first glimpse of distant blue sea on the horizon; family seated, bright daytime.` },
  { slug: "daily-6-a-weekend-trip", p: 7, a: "daily-6-a-weekend-trip", jun: true,
    s: `Korean kids including Jun running barefoot across warm sandy beach, gentle sea waves washing over their feet, bright sunny day, parents nearby. A real beach, not a balcony.` },
  // daily-7: 밤 (낮 X)
  { slug: "daily-7-time-to-sleep", p: 1, a: "daily-7-time-to-sleep", jun: true,
    s: `Night time. Jun at home in the evening, a large window showing a dark night sky with a bright full moon, warm indoor lamp light, cozy bedtime mood. NOT daytime, NOT breakfast.` },
  // daily-9: 병원 (생일파티 X)
  { slug: "daily-9-at-the-doctor", p: 3, a: "daily-9-at-the-doctor", jun: true,
    s: `Bright clinic room. Jun (red t-shirt) sits on an exam bed; a friendly doctor in a white coat with a stethoscope greets him. A medical office. NOT a birthday party, no balloons.` },
  // daily-10: 선물+카드 든 Jun / 촛불 10개
  { slug: "daily-10-happy-birthday", p: 2, a: "daily-10-happy-birthday", jun: true,
    s: `Jun in a SOLID red t-shirt and blue shorts holding a wrapped birthday present and a greeting card, arriving at a friend's birthday party, balloons. Hands holding gift and card.` },
  { slug: "daily-10-happy-birthday", p: 5, a: "daily-10-happy-birthday", jun: true,
    s: `A large birthday cake with exactly TEN lit candles on a party table, colorful decorations, happy kids around the table.` },
  // the-moons-lullaby p8: 밤 마을 (낮 연 X) — 스토리북, Jun 아님
  { slug: "the-moons-lullaby", p: 8, a: "the-moons-lullaby", jun: false,
    s: `A gentle smiling full Moon with a soft kind face glowing over a peaceful nighttime village, small cottages with warm lit windows, sleeping children, a sleepy owl, calm starry sky. NIGHT scene. NO kite, NOT daytime.`,
    neg: `Wholesome storybook, consistent with the reference Moon character. NO kite, NO daytime, NO greek/historical, no text.` },
  // tigers-first-school-day: 호랑이 새끼 Theo — 사람/곰/원숭이 X
  { slug: "tigers-first-school-day", p: 1, a: "tigers-first-school-day", jun: false,
    s: `A young tiger cub named Theo wearing a school backpack stands nervously outside a school building on a bright first morning. Theo is a TIGER cub.`,
    neg: `Wholesome storybook, match the reference tiger cub. The main character MUST be a tiger cub, NOT a human child, NOT a bear, NOT a monkey. No text.` },
  { slug: "tigers-first-school-day", p: 3, a: "tigers-first-school-day", jun: false,
    s: `A mother tiger kneels to give her tiger cub Theo a warm reassuring hug before school, soft morning light. Both are TIGERS.`,
    neg: `Wholesome storybook, match the reference tiger cub. Characters MUST be tigers, NOT a bear, NOT a monkey, NOT human. No text.` },
];

function runCodex(t) {
  const out = join(PUB, t.slug, `p${t.p}.png`);
  const anchor = t.a ? join(ANCH, `${t.a}.png`) : null;
  const neg = t.neg || NEG_KR;
  const who = t.jun ? `\n${JUN}` : "";
  const prompt = `${STYLE}${who}\nScene: ${t.s}\n${neg}`;
  return new Promise((resolve) => {
    const args = ["exec", "--full-auto", "--add-dir", join(PUB, t.slug), "--skip-git-repo-check"];
    if (anchor && existsSync(anchor)) args.push("--image", anchor);
    args.push("--", `$imagegen 그림책 일러스트 1장 생성 후 반드시 아래 경로에 PNG 저장.\n${prompt}\n저장 경로: ${out}\n해상도: ${RES}`);
    const child = spawn("codex", args, { stdio: "ignore" });
    const timer = setTimeout(() => { try { child.kill("SIGKILL"); } catch {} }, PER_TIMEOUT);
    const fin = () => { clearTimeout(timer); resolve(existsSync(out)); };
    child.on("exit", fin);
    child.on("error", fin);
  });
}

async function genOne(t) {
  const label = `${t.slug} p${t.p}`;
  for (let a = 1; a <= 3; a++) {
    const ok = await runCodex(t);
    if (ok) { console.log(`✅ ${label}`); return true; }
    console.log(`↻ ${label} 재시도 ${a}/3`);
  }
  console.log(`⚠️ ${label} 실패`);
  return false;
}

async function pool(tasks, conc) {
  let i = 0;
  const worker = async () => {
    while (i < tasks.length) {
      const t = tasks[i++];
      await new Promise((r) => setTimeout(r, 900));
      await genOne(t);
    }
  };
  await Promise.all(Array.from({ length: Math.min(conc, tasks.length) }, worker));
}

console.log(`🖼️ 불일치 ${T.length}컷 재생성 (동시 3)`);
await pool(T, 3);
console.log("REGEN_DONE");
