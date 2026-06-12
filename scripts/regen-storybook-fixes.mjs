/**
 * 그림책(픽션) QA 확정 불량컷 격리 재생성 — wave 1 (2026-06-10, 9컷/7권).
 * codex $imagegen, conc=1 단독(thread-cache race 제거) + 컷별 unique salt + 8분 SIGKILL + 재시도 3회.
 * anchor = public/seed/<slug>/cover.png (캐릭터 일관성). 메인 생성기 완주 후에만 실행할 것.
 * 실행 후: cwebp 변환으로 기존 나쁜 webp 덮어쓰기 + Read 육안 재검.
 *   node scripts/regen-storybook-fixes.mjs
 */
import { spawn } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PUB = join(ROOT, "public", "seed");
const RES = "1536x1024";
const PER_TIMEOUT = 480000;

const STYLE =
  "Soft watercolor children's storybook illustration, warm gentle light, whimsical and cozy, painterly, wholesome, friendly, full background scene, picture-book art.";
const NEG =
  "STRICT: NO text/letters/numbers in the image. Anatomy correct (5-finger hands for humans, natural animal anatomy), natural relaxed pose. " +
  "NOT cartoon/anime/manga/chibi, no big anime eyes, NOT a sticker on white, NOT a comic panel/speech bubble, NOT photoreal 3D render. " +
  "NOT historical drama, NOT Korean sageuk/hanbok, NOT Greek/Roman/toga/laurel, NOT samurai, NOT modern brand logos. NO celebrity likeness. " +
  "Match the cover reference's character design, colors and art style EXACTLY (no drift). This page MUST be visually DISTINCT from the other pages of the book.";

// QA wave 1 적대검증 확정 9컷. s = 교정 장면 + 컷별 금지사항.
const T = [
  { slug: "blue-fish-blows-bubbles", p: 3,
    char: "a small round blue fish with big eyes",
    s: `Underwater scene: ONE single round bubble drifts past a friendly orange CRAB walking on the sandy sea floor; the small round blue fish watches from nearby. The crab is the clear co-subject. NOT a starfish, NO starfish anywhere, not a cluster of many bubbles — one main bubble.` },
  { slug: "little-cloud-and-the-rainbow", p: 1,
    char: "a small white cloud with a soft happy face",
    s: `A small white happy cloud floats high in a bright blue sunny sky above gentle green hills. Light, airy, cheerful opening scene. NO rain, NO raindrops, NO rainbow (the rainbow appears only later in the book), NO grey heavy clouds.` },
  { slug: "penguin-learns-to-slide", p: 5,
    char: "a small black-and-white penguin chick named Pip (grey fluffy down, dark head cap, white eye patches)",
    s: `A BIG ADULT penguin friend (full adult plumage: sleek black back, white belly, white face patch — clearly larger than the chick) lies on her belly and slides down a snowy slope fast and joyfully, snow spraying. The small grey fluffy chick Pip stands at the TOP of the slope watching with wide eyes. STRICT: the sliding penguin is the ADULT, NOT the chick; Pip only watches.` },
  { slug: "rabbits-rainy-picnic", p: 8,
    char: "a white rabbit with a small picnic basket",
    s: `OUTDOORS under the wide canopy of a big leafy tree, on a picnic blanket, the white rabbit FAMILY (little rabbit and two parent rabbits) eat bread and share apples together, laughing warmly; soft rain falls beyond the dry shelter of the tree. STRICT: NOT indoors, NO house interior, NO window, NO curtains, NO lantern; the rabbit is NOT alone — three rabbits together.` },
  { slug: "the-littlest-firefly", p: 4,
    char: "a tiny firefly with a faint glowing tail",
    s: `Dark night forest among tall grass: the tiny firefly hovers, listening, and finds a small anxious BEETLE who is LOST in the dark, looking around worriedly in deep shadows. Mysterious dark blues and greens, only the firefly's faint glow lighting the scene. STRICT: NO lit doorway, NO burrow entrance with light, NO cozy home, NO door; the beetle looks lost and worried, NOT smiling or arriving home.` },
  { slug: "the-lost-mitten", p: 4,
    char: "one single red wool mitten lying on the snow",
    s: `Snowy forest floor: a RED FOX bends down and puts his cold nose inside the single red wool mitten lying on the snow; a small squirrel watches beside him curiously. STRICT: NO girl, NO child, NO person anywhere in this scene; exactly ONE mitten in the whole image.` },
  { slug: "the-lost-mitten", p: 7,
    char: "Mia: a child in a blue winter coat, white pompom hat, beige scarf, brown boots (EXACT match to the cover)",
    s: `Mia kneels in the snow, smiling kindly at a SQUIRREL and a RED FOX who are snuggled warm and happy with the one red wool mitten. Mia's hands are BARE or one mitten only on one hand — she is sharing her mitten. STRICT: the animals are ONLY a squirrel and a red fox — NO rabbit, NO mouse, NO chipmunk, NO hedgehog; exactly ONE red mitten in the image.` },
  { slug: "the-lost-mitten", p: 8,
    char: "Mia: a child in a blue winter coat, white pompom hat, beige scarf, brown boots (EXACT match to the cover)",
    s: `Cozy final scene in the snow: the RED FOX and the SQUIRREL share the warm red mitten together (snuggled in/around it), and Mia sits beside them smiling, everyone warm and happy in the soft snowfall. STRICT: animals are ONLY a squirrel and a red fox — NO rabbit, NO hedgehog, NO mouse, NO other animals; exactly ONE red mitten.` },
  { slug: "the-shy-turtle", p: 5,
    char: "a small green turtle with a patterned shell named Tilly",
    s: `By the pond: Tilly the small green turtle slowly peeks her head out of her patterned shell, shy but curious; FRED THE GREEN FROG sits right beside her giving a warm friendly smile. STRICT: Fred is a green FROG (same frog design as the rest of the book), NOT a rabbit, NO rabbit anywhere.` },
];

function runCodex(t) {
  const out = join(PUB, t.slug, `p${t.p}.png`);
  const anchor = join(PUB, t.slug, "cover.png");
  const salt = `[unique:${t.slug}-p${t.p}-regen-sbw1]`;
  const prompt = `${STYLE}\nMain character (keep EXACTLY consistent): ${t.char}.\nScene: ${t.s}\n${NEG}\n${salt}`;
  return new Promise((resolve) => {
    const args = ["exec", "--full-auto", "--add-dir", join(PUB, t.slug), "--skip-git-repo-check"];
    if (existsSync(anchor)) args.push("--image", anchor);
    args.push(
      "--",
      `$imagegen 그림책 일러스트 1장 생성 후 반드시 아래 경로에 PNG 저장.\n${prompt}\n저장 경로: ${out}\n해상도: ${RES}\n작업 규칙(중요): $imagegen 도구를 즉시 1회만 호출하고, 생성 즉시 위 경로에 저장 후 바로 종료할 것.\n- 생성된 이미지를 열어 검사·재평가·재생성하지 말 것(품질 검수는 별도 파이프라인이 수행). 사소한 결점이 보여도 그대로 저장.\n- 스킬 reference 문서나 image_gen.py CLI fallback을 읽거나 사용하지 말 것.\n- 질문·승인 대기 금지. 도구가 서버 오류를 반환한 경우에만 1회 재시도.`,
    );
    const child = spawn("codex", args, {
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let outBuf = "";
    // 비활동 워치독 — 새 출력 240초 부재 시 hang(에코 후 침묵) → 조기 킬
    const killTree = (sig) => {
      try { process.kill(-child.pid, sig); } catch { try { child.kill(sig); } catch { /* noop */ } }
    };
    let lastData = Date.now();
    const silent = setInterval(() => {
      if (Date.now() - lastData > 240000) { clearInterval(silent); killTree("SIGTERM"); setTimeout(() => killTree("SIGKILL"), 1500).unref(); }
    }, 15000);
    child.stdout.on("data", (d) => { lastData = Date.now(); outBuf += d.toString(); });
    child.stderr.on("data", (d) => { lastData = Date.now(); outBuf += d.toString(); });
    const timer = setTimeout(() => { killTree("SIGTERM"); setTimeout(() => killTree("SIGKILL"), 1500).unref(); }, PER_TIMEOUT);
    const fin = () => { clearTimeout(timer); clearInterval(silent); resolve(existsSync(out)); };
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

console.log(`🖼️ 그림책 QA 확정 ${T.length}컷 격리 재생성 (conc=1)`);
for (const t of T) {
  await new Promise((r) => setTimeout(r, 900));
  await genOne(t);
}
console.log("REGEN_SB_DONE");
