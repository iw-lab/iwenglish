/**
 * regen-vqa.mjs — Codex 비전 QA가 적발하고 Opus가 확정한 실결함만 격리 재생성 (2026-06-13).
 * w7 dedup 엔진 일반화: out/anchor를 파라미터화해 cover도 재생성 가능. md5 self-verify + 재시도 5.
 *
 * VQA 확정 결함 격리 재생성 스크립트(TARGETS만 교체해 재사용). 처리 이력:
 *  1차: the-clever-crow/p5(날개=손 해부학) · the-windmill-friend/cover(소년→소녀 Mira) · daily-14/p3(흰→태비 고양이)
 *  2차(windmill Mira 소년→소녀 전권 통일): p1·p3·p4·p8·p9 — 표지 교정 후 codex 재검증이 남은 off-model 소년 컷을 순차 적발.
 *       (p2·p6=그룹 혼합 정상, p7=텍스트 "a small boy" 근거 소년)
 * 아래 TARGETS는 마지막 배치(2차) 기록. 재실행 시 해당 컷이 재생성됨(md5 self-verify).
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

// 2차: windmill 주인공 Mira 성별/외형 드리프트 — p3·p9는 소년, p4는 다른 의상.
// 텍스트 "A girl named Mira" + 하루(아침→저녁) 이야기 → 전부 같은 소녀 한 의상으로 통일.
// 정본 Mira = 표지(소녀)/p5/p10: 갈색 땋은머리 + 파란 조끼 + rust-red 치마 + 부츠.
const MIRA = "Mira, a young girl with brown hair in two braids, wearing a blue vest over a white blouse, a rust-red skirt and brown boots (EXACTLY match the girl Mira on the cover and reference pages — same girl, same outfit)";
const MIRA_NEG = "STRICT: the child is a GIRL named Mira — brown braided hair, blue vest, white blouse, rust-red skirt, boots. NOT a boy, NOT short curly hair with suspenders, NOT a white shirt with brown shorts, NOT a shoulder satchel boy. Same girl and same outfit as the reference images EXACTLY (this is one single day, so her clothes do not change). One friendly old stone windmill with a gentle smiling face. Soft watercolor picture-book style.";
const WIN_ANCHOR = ["cover.png", "p5.png", "p10.png"];
const WIN = (out, s) => ({ slug: "the-windmill-friend", out, anchor: WIN_ANCHOR, char: MIRA, s, neg: MIRA_NEG });
const TARGETS = [
  WIN("p1.png", "Establishing scene: a big old friendly stone windmill with a gentle smiling face stands on a green hill near a small village, its big sails turning in the wind. Mira the girl walks up the path toward it, looking up fondly. Bright cheerful daytime."),
  WIN("p3.png", "One quiet morning, the wind has stopped. Mira the girl stands on the hill looking up with concern at the big old stone windmill whose sails hang completely still and silent. Calm soft morning light."),
  WIN("p4.png", "Mira the girl runs up the grassy hill toward the still windmill, one hand cupped near her mouth as she calls out 'Wake up, old friend'. Warm daylight, wildflowers on the slope."),
  WIN("p8.png", "Mira the girl sits on the grassy hill beside the old stone windmill, singing an old song with a happy peaceful face, eyes gently closed; soft clouds drift by and a light breeze lifts a few leaves and her braids. Warm afternoon light."),
  WIN("p9.png", "As evening comes, a breeze returns and the great windmill sails slowly begin to turn again. Mira the girl watches happily, hair and skirt lifting in the wind, golden sunset sky."),
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
