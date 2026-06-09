/**
 * QA 시각 전수검사에서 확정된 그림↔문장 불일치 컷 격리 재생성.
 * codex $imagegen, conc=1 단독(thread-cache race 제거) + 컷별 unique salt + 8분 SIGKILL + 재시도.
 * anchor = 각 책 public/seed/<slug>/cover.png (캐릭터 일관성).
 * 출력: public/seed/<slug>/p<N>.png (이후 cwebp 로 webp 변환 → 기존 나쁜 webp 덮어쓰기).
 */
import { spawn } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PUB = join(ROOT, "public", "seed");
const RES = "1536x1024";
const PER_TIMEOUT = 480000;

const STYLE =
  "Soft watercolor children's picture-book illustration, warm gentle light, cozy storybook mood, painterly, wholesome, friendly, full background scene, natural poses, 5-finger hands, no text or letters in image.";
const JUN =
  "Main boy Jun: cheerful Korean boy ~8, short tousled black hair, round face, red t-shirt, blue shorts (EXACTLY match the reference cover face/hair/outfit).";
const NEG =
  "Korean modern everyday setting. NOT cartoon/anime/chibi, no big anime eyes. NOT Greek/Roman/Chinese/Japanese-samurai, NOT historical costume, NO magical glow/fantasy effects. This page MUST be visually DISTINCT from neighboring pages — do NOT duplicate another page's composition or scene.";

// QA 2차검증 확정 불일치 7컷 (2026-06-09). s = QA fixHint.
const T = [
  { slug: "daily-15-at-the-playground", p: 3, jun: true,
    s: `A sunny playground. The boy in a red t-shirt climbs the ladder of a tall slide and then joyfully slides DOWN the slide; other children watch and cheer. The slide is the clear central action. NOT a swing, NOT sitting on a swing.` },
  { slug: "daily-18-helping-at-home", p: 4, jun: true,
    s: `A cozy kitchen in the evening with warm light. The boy in a red t-shirt and blue shorts stands at the kitchen sink washing dirty dinner dishes — soapy plates and a glass in his hands, water running from the faucet, dinner plates stacked beside the sink. NOT watering plants, NO potted plants by a window, NO watering can.` },
  { slug: "daily-21-a-trip-to-the-zoo", p: 3, jun: true,
    s: `Jun (red t-shirt, blue shorts, navy backpack) and his classmates stand at the giraffe enclosure looking UP at two tall giraffes that fill the foreground as the clear subject; zoo fence and trees around. A wide first-glimpse view of the towering giraffes. NOT a running scene at an entrance plaza.` },
  { slug: "daily-22-show-and-tell", p: 4, jun: true,
    s: `A bright classroom during show-and-tell. The boy in a red t-shirt and blue shorts stands beside his desk holding up his blue-and-white toy ROBOT (round head, antenna, blue body, white limbs). His face looks shy and a little nervous (soft worried smile, holding the robot close); classmates seated at desks look toward him. STRICT: the prop is the blue-and-white robot, NOT a toy car, NOT a dinosaur.` },
  { slug: "daily-23-camping-by-the-lake", p: 7, jun: true,
    s: `A calm misty morning at the lakeside campsite, soft golden sunrise light, gentle fog over the still water. Jun in a red t-shirt stands beside the tent stretching his arms and breathing in the fresh cool air; the family dog and parents are nearby by the tent, dewy grass underfoot. NO swimming, NO splashing in the water.` },
  { slug: "daily-24-the-talent-show", p: 3, jun: true,
    s: `A warm sunlit living room. Jun (red t-shirt, blue shorts) sits on a wooden bench at an upright PIANO, both hands on the white-and-black keys, practicing with a focused happy smile; sheet music on the piano stand. NO violin, NO bow, NO string instrument anywhere.` },
  { slug: "daily-24-the-talent-show", p: 6, jun: true,
    s: `On a school auditorium stage, Jun (red t-shirt, blue shorts) sits at a grand PIANO taking a deep breath with his hands resting on the keys, ready to begin playing; an audience of children seated in front of the stage. NO flute, NO recorder, NO wind instrument.` },
];

function runCodex(t) {
  const out = join(PUB, t.slug, `p${t.p}.png`);
  const anchor = join(PUB, t.slug, "cover.png");
  const who = t.jun ? `\n${JUN}` : "";
  const salt = `[unique:${t.slug}-p${t.p}-regen2026]`;
  const prompt = `${STYLE}${who}\nScene: ${t.s}\n${NEG}\n${salt}`;
  return new Promise((resolve) => {
    const args = ["exec", "--full-auto", "--add-dir", join(PUB, t.slug), "--skip-git-repo-check"];
    if (existsSync(anchor)) args.push("--image", anchor);
    args.push(
      "--",
      `$imagegen 그림책 일러스트 1장 생성 후 반드시 아래 경로에 PNG 저장.\n${prompt}\n저장 경로: ${out}\n해상도: ${RES}`,
    );
    const child = spawn("codex", args, { stdio: "ignore" });
    const timer = setTimeout(() => { try { child.kill("SIGKILL"); } catch {} }, PER_TIMEOUT);
    const fin = () => { clearTimeout(timer); resolve(existsSync(out)); };
    child.on("exit", fin);
    child.on("error", fin);
  });
}

async function genOne(t) {
  const label = `${t.slug} p${t.p}`;
  const out = join(PUB, t.slug, `p${t.p}.png`);
  try { if (existsSync(out)) unlinkSync(out); } catch { /* noop */ }
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

console.log(`🖼️ QA 확정 불일치 ${T.length}컷 격리 재생성 (conc=1)`);
await pool(T, 1);
console.log("REGEN_DONE");
