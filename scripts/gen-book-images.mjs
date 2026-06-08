/**
 * 생활영어 동화 일러스트 생성 (codex $imagegen, gpt-image-2).
 * 시드 JSON에서 페이지별 장면을 자동 구성 → 표지 먼저, 이후 페이지는 표지를 -i 레퍼런스로 일관성 유지.
 * 워터컬러 그림책 스타일, 캐릭터 고정, 교차 프로젝트 침입 네거티브.
 *
 *   node scripts/gen-book-images.mjs daily-1-good-morning daily-2-time-for-school ...
 *   (인자 없으면 collection:"daily" 전부)
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SEED = join(ROOT, "data", "seed");
const PUB = join(ROOT, "public", "seed");

const STYLE =
  "Soft watercolor children's picture-book illustration, warm gentle light, cozy storybook mood, painterly textures, wholesome and friendly, full scene with background.";
const POV =
  "Recurring main character Jun: a cheerful Korean boy about 8 years old, short tousled black hair, round friendly face, red t-shirt and blue shorts. Keep him IDENTICAL on every page (same hair, face, outfit).";
const NEG =
  "STRICT: NO text, NO words, NO letters or captions in the image. 5-finger hands, natural relaxed pose, eyes looking at the scene not camera. NOT cartoon, NOT anime, NOT manga, NOT chibi, no big anime eyes, NOT a flat sticker on white background, NOT a comic panel with gutters. NOT Chinese/Greek/Roman, NOT Japanese samurai, NOT historical costume. Korean modern everyday setting. Consistent character and art style across all pages (no outfit/hair drift).";
const RES = "1536x1024";

const stripQuotes = (s) => s.replace(/[""]/g, '"');
const sceneFromPage = (p) =>
  p.sentences
    .map((s) => stripQuotes(s.text))
    .join(" ")
    .slice(0, 320);

function codexImage({ dir, out, prompt, anchor }) {
  const args = ["exec", "--full-auto", "--add-dir", dir, "--skip-git-repo-check"];
  if (anchor && existsSync(anchor)) args.push("--image", anchor);
  args.push(
    "--",
    `$imagegen 다음 조건으로 그림책 일러스트 1장 생성 후 저장.\n${prompt}\n저장 경로: ${out}\n해상도: ${RES}`,
  );
  execFileSync("codex", args, { stdio: "pipe", timeout: 1200000 });
}

function genBook(slug) {
  const file = join(SEED, `${slug}.json`);
  const b = JSON.parse(readFileSync(file, "utf8"));
  const dir = join(PUB, slug);
  mkdirSync(dir, { recursive: true });
  const cover = join(dir, "cover.png");

  // 1) 표지
  if (!existsSync(cover)) {
    const coverPrompt = `${STYLE}\n${POV}\nScene: Book cover for "${b.title}". A warm inviting cover image showing Jun in the story's main setting (${b.summary_ko}). Cozy, cheerful.\n${NEG}`;
    process.stdout.write(`  🎨 ${slug} cover…\n`);
    try {
      codexImage({ dir, out: cover, prompt: coverPrompt });
    } catch (e) {
      console.log(`   ⚠️ cover 실패: ${String(e).slice(0, 80)}`);
    }
  } else process.stdout.write(`  ↩︎ ${slug} cover 있음\n`);

  // 2) 페이지 (표지 anchor)
  b.pages.forEach((p, i) => {
    const out = join(dir, `p${i + 1}.png`);
    if (existsSync(out)) {
      process.stdout.write(`  ↩︎ ${slug} p${i + 1} 있음\n`);
      return;
    }
    const prompt = `${STYLE}\n${POV}\nScene: ${sceneFromPage(p)}\nMatch the cover's character look and art style EXACTLY.\n${NEG}`;
    process.stdout.write(`  🎨 ${slug} p${i + 1}/${b.pages.length}…\n`);
    try {
      codexImage({ dir, out, prompt, anchor: cover });
    } catch (e) {
      console.log(`   ⚠️ p${i + 1} 실패: ${String(e).slice(0, 80)}`);
    }
  });
  console.log(`  ✅ ${slug} 완료`);
}

function main() {
  let slugs = process.argv.slice(2);
  if (slugs.length === 0) {
    slugs = readdirSync(SEED)
      .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
      .map((f) => JSON.parse(readFileSync(join(SEED, f), "utf8")))
      .filter((b) => b.collection === "daily")
      .map((b) => b.slug);
  }
  console.log(`🖼️ 일러스트 생성 ${slugs.length}권: ${slugs.join(", ")}`);
  for (const s of slugs) genBook(s);
  console.log("🎉 일러스트 생성 완료 — pnpm seed:content 후 새로고침");
}

main();
