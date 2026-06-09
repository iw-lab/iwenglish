/**
 * QA 2차 확정 불일치 3컷 격리 재생성 (conc=1, unique salt, 8분 SIGKILL, 재시도) → cwebp 덮어쓰기.
 *   node scripts/regen-fixes-2.mjs
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
const NEG =
  "Korean modern everyday setting. NOT cartoon/anime/chibi, no big anime eyes. NOT Greek/Roman/Chinese/Japanese-samurai, NOT historical costume, NO magical glow/fantasy effects. 5-finger hands, natural pose, NO text/letters in image. This page MUST be visually DISTINCT from neighboring pages — do NOT duplicate another page's composition or scene.";

const T = [
  {
    slug: "daily-32-the-new-neighbor",
    p: 7,
    who: "Two Korean children about 8 years old: the narrator boy (cheerful, short tousled black hair, red t-shirt, blue shorts — EXACTLY match the reference cover) and his new neighbor Hana, a Korean girl about 8 with a neat ponytail, a purple top and a denim pinafore (keep Hana's ponytail and purple top consistent — she is a GIRL, not a boy).",
    s: "The two friends sit together at a low table and draw a map of their street on a big sheet of paper, crayons scattered around, both smiling.",
  },
  {
    slug: "daily-39-the-weather-station",
    p: 10,
    who: "A cheerful Korean boy about 8 (short tousled black hair, red t-shirt — EXACTLY match the reference cover) with one or two classmates at a school weather station.",
    s: "Outdoors by the weather station, the children watch a thin cloth ribbon tied to a post as it flutters in the wind to show its direction; the boy points at the fluttering ribbon and looks curious. This is an outdoor wind-watching scene — NOT a wall calendar, NOT indoors.",
  },
  {
    slug: "daily-49-the-recycling-project",
    p: 9,
    who: "A kind adult teacher speaking to a few Korean children about 8 in a classroom; the narrator boy (short tousled black hair, red t-shirt — EXACTLY match the reference cover) listens among them.",
    s: "Near three labeled recycling bins (paper, plastic, cans), the teacher warmly speaks to the listening children and gestures encouragingly. A calm, everyday classroom moment — NOT a cheering group celebration.",
  },
];

function runCodex(t) {
  const out = join(PUB, t.slug, `p${t.p}.png`);
  const anchor = join(PUB, t.slug, "cover.png");
  const salt = `[unique:${t.slug}-p${t.p}-regen2b-2026]`;
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
      // cwebp 덮어쓰기(기존 오염 webp 교체)
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

console.log(`🖼️ QA 확정 불일치 ${T.length}컷 격리 재생성 (conc=1)`);
for (const t of T) {
  await new Promise((r) => setTimeout(r, 900));
  await genOne(t);
}
console.log("REGEN2_DONE");
