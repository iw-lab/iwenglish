/**
 * MD5 중복 스캔 확정 4컷 격리 재생성 (conc=1) → cwebp 덮어쓰기.
 * 각 쌍에서 '틀린' 페이지만 재생성(맞는 페이지는 보존), 인접 페이지와 DISTINCT 강제.
 *   node scripts/regen-fixes-3.mjs
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PUB = join(ROOT, "public", "seed");
const RES = "1536x1024";
const PER_TIMEOUT = 480000;

const STYLE =
  "Soft watercolor children's picture-book illustration, warm gentle light, cozy storybook mood, painterly, wholesome, friendly, full background scene.\n";
const JUN =
  "Main boy: a cheerful Korean boy about 8, short tousled black hair, round face, red t-shirt, blue shorts (EXACTLY match the reference cover face/hair/outfit).";
const NEG =
  "Korean modern everyday setting. NOT cartoon/anime/chibi, no big anime eyes. NOT Greek/Roman/Chinese/Japanese-samurai, NOT historical costume, NO magical glow/fantasy effects. 5-finger hands, natural pose, NO text/letters in image. This page MUST be visually DISTINCT from the neighboring pages — do NOT duplicate another page's composition or scene.";

const T = [
  {
    slug: "daily-22-show-and-tell",
    p: 6,
    who: JUN + " A few classmates softly blurred in the background of a classroom.",
    s: "Close-up of the boy proudly holding up a small toy robot with both hands, beaming as he shows it to the class. The little robot is the clear focus of the picture (it was a gift from his dad). DISTINCT from the wide 'standing in front of the class' page.",
  },
  {
    slug: "daily-30-a-thank-you-card",
    p: 3,
    who: JUN,
    s: "The boy sits at his desk holding a blank folded card and a pencil, looking up thoughtfully as he decides to make a thank-you card. The card is still BLANK — nothing drawn on it yet. Crayons nearby, cozy room. DISTINCT from any page where he has already drawn a school and crosswalk.",
  },
  {
    slug: "daily-43-feeding-the-fish",
    p: 1,
    who: JUN,
    s: "The boy stands beside a small glass fish tank on a low table in the living room, smiling and gesturing toward it as he simply shows his tank. He is NOT feeding the fish and holds NO food. DISTINCT from the feeding page.",
  },
  {
    slug: "daily-46-the-class-pet",
    p: 3,
    who: JUN,
    s: "The boy kneels by the hamster cage and gently greets the small brown hamster, softly reaching a careful hand toward it because it is his turn to care for the class pet. He is NOT pouring or filling a seed bowl. DISTINCT from the bowl-filling page.",
  },
];

function runCodex(t) {
  const out = join(PUB, t.slug, `p${t.p}.png`);
  const anchor = join(PUB, t.slug, "cover.png");
  const salt = `[unique:${t.slug}-p${t.p}-regen3-2026]`;
  const prompt = `${STYLE}Characters: ${t.who}\nScene: ${t.s}\n${NEG}\n${salt}`;
  return new Promise((resolve) => {
    const args = ["exec", "--full-auto", "--add-dir", join(PUB, t.slug), "--skip-git-repo-check"];
    if (existsSync(anchor)) args.push("--image", anchor);
    args.push(
      "--",
      `$imagegen 그림책 일러스트 1장 생성 후 반드시 아래 경로에 PNG 저장.\n${prompt}\n저장 경로: ${out}\n해상도: ${RES}`,
    );
    const child = spawn("codex", args, { stdio: "ignore" });
    const timer = setTimeout(() => { try { child.kill("SIGKILL"); } catch { /* noop */ } }, PER_TIMEOUT);
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
    if (ok) {
      const webp = join(PUB, t.slug, `p${t.p}.webp`);
      const r = spawnSync("cwebp", ["-q", "82", "-resize", "1280", "0", out, "-o", webp], { stdio: "ignore" });
      console.log(`✅ ${label}${r.status === 0 ? " (webp 갱신)" : " (⚠️ cwebp 실패)"}`);
      return true;
    }
    console.log(`↻ ${label} 재시도 ${a}/3`);
  }
  console.log(`⚠️ ${label} 실패`);
  return false;
}

console.log(`🖼️ MD5 중복 확정 ${T.length}컷 격리 재생성 (conc=1)`);
for (const t of T) {
  await new Promise((r) => setTimeout(r, 900));
  await genOne(t);
}
console.log("REGEN3_DONE");
