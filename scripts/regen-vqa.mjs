/**
 * regen-vqa.mjs — Codex 비전 QA가 적발하고 Opus가 확정한 실결함만 격리 재생성 (2026-06-13).
 * w7 dedup 엔진 일반화: out/anchor를 파라미터화해 cover도 재생성 가능. md5 self-verify + 재시도 5.
 *
 * 대상(Opus 이중확인 완료):
 *  1) the-clever-crow/p5 — 까마귀 날개가 갈고리 손/팔로 그려짐(해부학) → 정상 날개로
 *  2) the-windmill-friend/cover — 표지=소년인데 텍스트·전 페이지가 소녀 Mira → 소녀로(앵커=p5,p10)
 *  3) daily-14-my-cat-nabi/p3 — 고양이만 흰색(다수 6컷 태비) → 태비로(텍스트도 grey로 별도 수정)
 *
 *   node scripts/regen-vqa.mjs
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
  "STRICT: NO text/letters/numbers in the image. Anatomy correct (5-finger hands for humans, natural animal anatomy — birds have feathered wings NOT hands, correct leg count per species), natural relaxed pose. " +
  "NOT cartoon/anime/manga/chibi, no big anime eyes, NOT a sticker on white, NOT a comic panel/speech bubble, NOT photoreal 3D render. " +
  "NOT historical drama, NOT sageuk/hanbok, NOT Greek/Roman/toga, NOT samurai, NOT modern brand logos. NO celebrity likeness. " +
  "Match the reference image's character design, colors and art style EXACTLY (no drift).";

const TARGETS = [
  {
    slug: "the-clever-crow",
    out: "p5.png",
    anchor: ["cover.png"],
    char: "a glossy black crow with CORRECT bird anatomy — two feathered wings folded at its sides, two legs with taloned feet, one beak",
    s: "In a golden dry field, the glossy black crow stands beside a tall narrow glass jug of water and tries to push the heavy jug with its body and beak, looking puzzled. Its wings stay folded at its sides as normal feathered bird wings.",
    neg: "STRICT: the crow's wings are NORMAL feathered bird wings folded at its sides — NOT arms, NOT hands, NOT clawed fingers, NOT gripping the jug with a wing-hand. A crow has no hands; it interacts using only its beak and body. Exactly two legs, two wings, one beak. Match the reference crow design and watercolor style EXACTLY.",
  },
  {
    slug: "the-windmill-friend",
    out: "cover.png",
    anchor: ["p5.png", "p10.png"],
    char: "Mira, a young girl with brown hair in braids, wearing a rust-red dress with a pinafore apron and boots (EXACTLY match the girl Mira in the reference images)",
    s: "Book cover composition: Mira the young girl stands on a grassy hill at warm golden sunset, looking up with wonder at a big old friendly stone windmill with turning sails; a small village and rolling hills below, wildflowers around.",
    neg: "STRICT: the child is a GIRL named Mira — brown braided hair, rust-red dress with apron, boots. NOT a boy, NOT suspenders, NOT a white shirt with short trousers. Match the girl in the reference images EXACTLY. One friendly old stone windmill. Soft watercolor picture-book style.",
  },
  {
    slug: "daily-14-my-cat-nabi",
    out: "p3.png",
    anchor: ["cover.png"],
    char: "Jun (a cheerful Korean boy about 8, short tousled black hair, red t-shirt, blue shorts) gently cuddling Nabi — a soft GREY TABBY kitten with grey-brown tabby stripes and a white chest (EXACTLY match the kitten on the cover)",
    s: "In a cozy modern Korean living room, Jun sits on the floor and gently hugs his soft grey tabby kitten Nabi close to his chest; warm, tender everyday moment.",
    neg: "STRICT: Nabi is a GREY TABBY kitten (grey-brown tabby stripes, white chest and paws) EXACTLY like the kitten on the cover — NOT an all-white cat, NOT a fluffy white cat, NOT a different color. Korean modern everyday home (NOT fantasy). Boy has 5-finger hands. Match the cover's cat fur, markings and art style EXACTLY.",
    style: "Warm, cozy modern Korean everyday watercolor children's-book illustration, soft natural light, wholesome.",
  },
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
  const salt = `[unique:${t.slug}-${t.out}-vqa-a${attempt}-${Date.now().toString(36)}]`;
  const style = t.style || STYLE;
  const prompt = `${style}\nMain character (keep EXACTLY consistent): ${t.char}.\nScene: ${t.s}\n${t.neg}\n${NEG_BASE}\n${salt}`;
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
console.log(`🛡️ regen-vqa ${TARGETS.length}컷 · 대조군 ${hashes.size}개 md5`);
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
console.log(`\n== regen-vqa 요약: 성공 ${okCount}/${TARGETS.length}${failed.length ? " · 실패 " + failed.join(", ") : ""}`);
console.log("REGEN_VQA_DONE");
process.exit(failed.length ? 1 : 0);
