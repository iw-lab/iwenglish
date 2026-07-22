/**
 * regen-anatomy-w1.mjs — 사용자 육안 적발 해부학 결함 격리 재생성 (2026-07-23).
 * regen-vqa.mjs 기계장치 재사용(md5 self-verify + 에코복사 방지 + 8분 SIGKILL + idle 워치독 + 재시도5).
 *
 * 대상(the-windmill-friend):
 *   p7  — 앉은 소년의 목이 몸통 회전한계를 넘어 비틀림(어깨는 좌향인데 얼굴만 우상단으로 꺾임) → 자연스러운 목/자세로 교정.
 *   p10 — 군중 장면에서 뒤쪽 아이들 하반신이 지면에 파묻혀 절단으로 보임 → 전원 온전한 전신, 지면에 발 딛고 선 자연스러운 군중으로 교정.
 *
 * p7 정본 = 텍스트 "a small boy" 근거 소년(Mira 아님). p10 정본 = Mira가 풍차를 안고 온 마을이 환호.
 *   node scripts/regen-anatomy-w1.mjs
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, unlinkSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PUB = join(ROOT, "public", "seed");
const RES = "1536x1024";
const PER_TIMEOUT = 480000;

const STYLE =
  "Soft watercolor children's storybook illustration, warm gentle light, whimsical and cozy, painterly, wholesome, friendly, full background scene, picture-book art.";
const NEG_BASE =
  "STRICT: NO text/letters/numbers in the image. Anatomy correct (5-finger hands for humans, natural animal anatomy), natural relaxed pose. " +
  "NOT cartoon/anime/manga/chibi, no big anime eyes, NOT a sticker on white, NOT a comic panel/speech bubble, NOT photoreal 3D render. " +
  "NOT historical drama, NOT sageuk/hanbok, NOT Greek/Roman/toga, NOT samurai, NOT modern brand logos. NO celebrity likeness. " +
  "Match the reference image's character design, colors and art style EXACTLY (no drift).";

// 해부학 교정 전용 강한 금지문(목 비틀림·신체 절단)
const ANATOMY_NEG =
  "STRICT ANATOMY: every human's head and shoulders face the SAME general direction — the neck is relaxed and turned at most a natural angle (never twisted so the face looks the opposite way from the chest, never an owl-like over-rotation, never an unnaturally long/stretched neck). " +
  "Every person is drawn as a WHOLE body standing or sitting ON TOP of the ground with feet visible or naturally resting — NO person sunk into or buried by the ground, NO torso cut off at the earth line, NO half-figures emerging from the soil. One friendly old stone windmill with a gentle smiling face. Soft watercolor picture-book style.";

const BOY =
  "a small village boy with short tousled brown hair, a loose white shirt with suspenders and rolled trousers with brown boots (a young child, cheerful and gentle — one of the village children)";
const VILLAGE =
  "Mira, a young girl with brown hair in two braids, a blue vest over a white blouse, a rust-red skirt and brown boots, together with the whole village crowd of children and grown-ups (same warm character design as the reference images)";

const WA = (out, anchor, char, s) => ({ slug: "the-windmill-friend", out, anchor, char, s, neg: ANATOMY_NEG });

const TARGETS = [
  WA(
    "p7.png",
    ["cover.png", "p6.png", "p8.png"],
    BOY,
    "Beside the big old friendly stone windmill (with its gentle smiling face) on the grassy hill, a small village boy sits on the ground with his knees drawn up, resting after fanning. He gazes UP toward the still sails — his HEAD, NECK and SHOULDERS all turned together comfortably in the SAME direction (a gentle natural upward look, chin slightly lifted, NOT twisting his head backward over his shoulder). Relaxed, thoughtful, wistful. Warm late-afternoon light, village rooftops and sunset valley behind.",
  ),
  WA(
    "p10.png",
    ["cover.png", "p5.png"],
    VILLAGE,
    "Joyful finale: the great sails of the friendly smiling stone windmill turn again, and the WHOLE VILLAGE cheers around it. Mira the braided girl reaches up and hugs the windmill happily. A crowd of villagers — children and grown-ups — stand together ON the grassy hilltop cheering with arms raised, every person a COMPLETE full figure standing firmly on the ground with legs and feet naturally placed (nobody sunk into or cut off by the ground). Golden sunset sky, wildflowers, warm celebration.",
  ),
];

const md5 = (p) => createHash("md5").update(readFileSync(p)).digest("hex");
function buildHashMap() {
  const map = new Map();
  for (const slug of readdirSync(PUB)) {
    let files;
    try { files = readdirSync(join(PUB, slug)); } catch { continue; }
    for (const f of files)
      if (/^(p\d+|cover)\.png$/.test(f)) {
        try { map.set(md5(join(PUB, slug, f)), `${slug}/${f}`); } catch { /* noop */ }
      }
  }
  return map;
}
function stopTree(child, sig) {
  try { process.kill(-child.pid, sig); } catch { try { child.kill(sig); } catch { /* noop */ } }
}

function runCodex(t, attempt) {
  const out = join(PUB, t.slug, t.out);
  const salt = `[unique:${t.slug}-${t.out}-anat-a${attempt}-${Date.now().toString(36)}]`;
  const prompt = `${STYLE}\nMain character (keep EXACTLY consistent): ${t.char}.\nScene: ${t.s}\n${t.neg}\n${NEG_BASE}\n${salt}`;
  return new Promise((resolve) => {
    const args = ["exec", "--full-auto", "--add-dir", join(PUB, t.slug), "--skip-git-repo-check"];
    for (const a of t.anchor || []) {
      const ap = join(PUB, t.slug, a);
      if (existsSync(ap)) args.push("-i", ap);
    }
    args.push(
      "--",
      `$imagegen 그림책 일러스트 1장 생성 후 반드시 아래 경로에 PNG 저장.\n${prompt}\n저장 경로: ${out}\n해상도: ${RES}\n작업 규칙(중요): $imagegen 도구를 즉시 1회만 호출하고, 그 호출로 **방금 새로 생성된 이미지 파일만** 위 경로에 저장 후 바로 종료할 것.\n- 🔴 ~/.codex/generated_images 에서 기존(이전) 파일을 find/ls로 찾아 복사하는 것 절대 금지. 생성 도구 호출이 실패하면 기존 파일을 줍지 말고 도구를 다시 호출할 것.\n- 생성된 이미지를 열어 검사·재평가·재생성하지 말 것. 사소한 결점이 보여도 그대로 저장.\n- 스킬 reference 문서나 CLI fallback 읽기/사용 금지. 질문·승인 대기 금지.`,
    );
    const child = spawn("codex", args, { detached: true, stdio: ["ignore", "pipe", "pipe"] });
    let lastData = Date.now();
    const idle = setInterval(() => {
      if (Date.now() - lastData > 240000) {
        clearInterval(idle);
        stopTree(child, "SIGTERM");
        setTimeout(() => stopTree(child, "SIGKILL"), 1500).unref();
      }
    }, 15000);
    child.stdout.on("data", () => { lastData = Date.now(); });
    child.stderr.on("data", () => { lastData = Date.now(); });
    const t8 = setTimeout(() => {
      stopTree(child, "SIGTERM");
      setTimeout(() => stopTree(child, "SIGKILL"), 1500).unref();
    }, PER_TIMEOUT);
    const fin = () => { clearTimeout(t8); clearInterval(idle); resolve(existsSync(out)); };
    child.on("exit", fin);
    child.on("error", fin);
  });
}

const hashes = buildHashMap();
console.log(`🛡️ regen-anatomy-w1 ${TARGETS.length}컷 · 대조군 ${hashes.size}개 md5`);
let okCount = 0;
const failed = [];
for (const t of TARGETS) {
  const out = join(PUB, t.slug, t.out);
  const selfKey = `${t.slug}/${t.out}`;
  let done = false;
  for (let a = 1; a <= 5 && !done; a++) {
    try { if (existsSync(out)) unlinkSync(out); } catch { /* noop */ }
    await new Promise((r) => setTimeout(r, 900));
    const ok = await runCodex(t, a);
    if (!ok) { console.log(`↻ ${selfKey} 생성실패 재시도 ${a}/5`); continue; }
    const h = md5(out);
    const clash = hashes.get(h);
    if (clash && clash !== selfKey) {
      console.log(`🚫 ${selfKey} md5 충돌(${clash}) — 폐기·재시도 ${a}/5`);
      try { unlinkSync(out); } catch { /* noop */ }
      continue;
    }
    hashes.set(h, selfKey);
    okCount++; done = true;
    console.log(`✅ ${selfKey}`);
  }
  if (!done) { failed.push(selfKey); console.log(`⚠️ ${selfKey} 최종 실패`); }
}
console.log(`\n== regen-anatomy-w1 요약: 성공 ${okCount}/${TARGETS.length}${failed.length ? " · 실패 " + failed.join(", ") : ""}`);
console.log("REGEN_ANAT_W1_DONE");
process.exit(failed.length ? 1 : 0);
