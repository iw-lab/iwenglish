/**
 * EchoTale 앱 아이콘 마스터 1장 생성 (codex $imagegen, conc=1, 8분 SIGKILL).
 * 플랫 벡터풍 로고 마크 — 작게 줄여도 또렷하게.
 *   node scripts/gen-app-icon.mjs
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DIR = join(ROOT, "public", "brand");
mkdirSync(DIR, { recursive: true });
const OUT = join(DIR, "icon-master.png");
const PER_TIMEOUT = 480000;

const PROMPT = [
  "Flat modern mobile app icon, iOS-style rounded square, single centered emblem.",
  "Warm cream background (#faf6ef).",
  "Emblem: a simple friendly open storybook viewed from the front; its two open pages curve gently outward into smooth sound / echo waves, painted in soft sage green (#7c9885).",
  "A small warm coral (#e88a6f) round badge at the lower-right of the book with a tiny clean white play triangle (echo / speak).",
  "Bold minimal vector-logo shapes, thick smooth rounded strokes, flat solid colors, high contrast, generous empty padding around the emblem (safe margin), perfectly centered and symmetrical.",
  "Children's English read-aloud learning app brand mark. Friendly, cozy, clean.",
  "NEGATIVE: no text, no letters, no numbers, NOT a watercolor scene, NOT a photo, NOT a child or person, NOT a face, no gradients noise, no busy detail, no drop shadow clutter. NOT comic panel, NOT historical/Greek, NOT 3D render.",
  "[unique:echotale-appicon-2026-06-10]",
].join("\n");

function run() {
  const args = ["exec", "--full-auto", "--add-dir", DIR, "--skip-git-repo-check", "--",
    `$imagegen 앱 아이콘 1장 생성 후 반드시 아래 경로에 PNG 저장.\n${PROMPT}\n저장 경로: ${OUT}\n해상도: 1024x1024`];
  return new Promise((resolve) => {
    const child = spawn("codex", args, { stdio: "ignore" });
    const timer = setTimeout(() => { try { child.kill("SIGKILL"); } catch {} }, PER_TIMEOUT);
    const fin = () => { clearTimeout(timer); resolve(existsSync(OUT)); };
    child.on("exit", fin);
    child.on("error", fin);
  });
}

try { if (existsSync(OUT)) unlinkSync(OUT); } catch {}
for (let a = 1; a <= 3; a++) {
  console.log(`🎨 아이콘 생성 시도 ${a}/3`);
  if (await run()) { console.log(`✅ 저장됨: ${OUT}`); process.exit(0); }
  console.log("↻ 재시도");
}
console.log("⚠️ 아이콘 생성 실패");
process.exit(1);
