/**
 * wave-7 — MD5 self-verify 격리 재생성 (2026-06-13).
 * 교훈: codex 0.139은 자기 생성이 실패하면 ~/.codex/generated_images에서 "최신 파일"을
 * find로 주워 저장함 → conc=1 순차여도 직전 task의 그림이 복사되는 교차 오염 발생.
 * 방어 3중: ①프롬프트에 기존 파일 줍기 금지 명시 ②생성 직후 md5를 전 자산과 대조,
 * 충돌 시 폐기+강화 salt 재시도(최대 5회) ③성공분 md5를 즉시 대조군에 편입.
 *
 * 작업 목록: scripts/.regen-w7.json — [{slug,p,char,s,anchor?,neg?}]
 *   node scripts/regen-dedup-w7.mjs
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
const NEG =
  "STRICT: NO text/letters/numbers in the image. Anatomy correct (5-finger hands for humans, natural animal anatomy), natural relaxed pose. " +
  "NOT cartoon/anime/manga/chibi, no big anime eyes, NOT a sticker on white, NOT a comic panel/speech bubble, NOT photoreal 3D render. " +
  "NOT historical drama, NOT Korean sageuk/hanbok, NOT Greek/Roman/toga/laurel, NOT samurai, NOT modern brand logos. NO celebrity likeness. " +
  "Match the reference image's character design, colors and art style EXACTLY (no drift). This page MUST be visually DISTINCT from the other pages of the book.";

const T = JSON.parse(readFileSync(join(ROOT, "scripts", ".regen-w7.json"), "utf8"));

const md5 = (p) => createHash("md5").update(readFileSync(p)).digest("hex");

/** 전 자산 md5 대조군 (md5 → 경로) */
function buildHashMap() {
  const map = new Map();
  for (const slug of readdirSync(PUB)) {
    const dir = join(PUB, slug);
    let files;
    try { files = readdirSync(dir); } catch { continue; }
    for (const f of files)
      if (/^(p\d+|cover)\.png$/.test(f)) {
        try { map.set(md5(join(dir, f)), `${slug}/${f}`); } catch { /* noop */ }
      }
  }
  return map;
}

function stopTree(child, sig) {
  try { process.kill(-child.pid, sig); } catch { try { child.kill(sig); } catch { /* noop */ } }
}

function runCodex(t, attempt) {
  const out = join(PUB, t.slug, `p${t.p}.png`);
  const anchor = join(PUB, t.slug, t.anchor || "cover.png");
  const salt = `[unique:${t.slug}-p${t.p}-w7a${attempt}-${Date.now().toString(36)}]`;
  const prompt = `${STYLE}\nMain character (keep EXACTLY consistent): ${t.char}.\nScene: ${t.s}\n${t.neg || NEG}\n${salt}`;
  return new Promise((resolve) => {
    const args = ["exec", "--full-auto", "--add-dir", join(PUB, t.slug), "--skip-git-repo-check"];
    if (existsSync(anchor)) args.push("--image", anchor);
    args.push(
      "--",
      `$imagegen 그림책 일러스트 1장 생성 후 반드시 아래 경로에 PNG 저장.\n${prompt}\n저장 경로: ${out}\n해상도: ${RES}\n작업 규칙(중요): $imagegen 도구를 즉시 1회만 호출하고, 그 호출로 **방금 새로 생성된 이미지 파일만** 위 경로에 저장 후 바로 종료할 것.\n- 🔴 ~/.codex/generated_images 에서 기존(이전) 파일을 find/ls로 찾아 복사하는 것 절대 금지 — 다른 작업의 그림이 섞이는 사고가 실제로 발생함. 생성 도구 호출이 실패하면 기존 파일을 줍지 말고 도구를 다시 호출할 것.\n- 생성된 이미지를 열어 검사·재평가·재생성하지 말 것(품질 검수는 별도 파이프라인). 사소한 결점이 보여도 그대로 저장.\n- 스킬 reference 문서나 CLI fallback 읽기/사용 금지. 질문·승인 대기 금지.`,
    );
    const child = spawn("codex", args, { detached: true, stdio: ["ignore", "pipe", "pipe"] });
    let buf = "";
    let lastData = Date.now();
    const idle = setInterval(() => {
      if (Date.now() - lastData > 240000) {
        clearInterval(idle);
        stopTree(child, "SIGTERM");
        setTimeout(() => stopTree(child, "SIGKILL"), 1500).unref();
      }
    }, 15000);
    child.stdout.on("data", (d) => { lastData = Date.now(); buf += d.toString(); });
    child.stderr.on("data", (d) => { lastData = Date.now(); buf += d.toString(); });
    const t8 = setTimeout(() => {
      stopTree(child, "SIGTERM");
      setTimeout(() => stopTree(child, "SIGKILL"), 1500).unref();
    }, PER_TIMEOUT);
    const fin = () => { clearTimeout(t8); clearInterval(idle); resolve({ ok: existsSync(out), buf }); };
    child.on("exit", fin);
    child.on("error", fin);
  });
}

const hashes = buildHashMap();
console.log(`🛡️ w7 self-verify 재생성 ${T.length}컷 · 대조군 ${hashes.size}개 md5`);

let okCount = 0;
const failed = [];
for (const t of T) {
  const out = join(PUB, t.slug, `p${t.p}.png`);
  const selfKey = `${t.slug}/p${t.p}.png`;
  let done = false;
  for (let a = 1; a <= 5 && !done; a++) {
    try { if (existsSync(out)) unlinkSync(out); } catch { /* noop */ }
    await new Promise((r) => setTimeout(r, 900));
    const { ok } = await runCodex(t, a);
    if (!ok) { console.log(`↻ ${selfKey} 생성실패 재시도 ${a}/5`); continue; }
    const h = md5(out);
    const clash = hashes.get(h);
    if (clash && clash !== selfKey) {
      console.log(`🚫 ${selfKey} md5 충돌(${clash}) — 폐기·재시도 ${a}/5`);
      try { unlinkSync(out); } catch { /* noop */ }
      continue;
    }
    hashes.set(h, selfKey);
    okCount++;
    done = true;
    console.log(`✅ ${selfKey}`);
  }
  if (!done) { failed.push(selfKey); console.log(`⚠️ ${selfKey} 최종 실패`); }
}

console.log(`\n== W7 요약: 성공 ${okCount}/${T.length}, 실패 ${failed.length}${failed.length ? " — " + failed.join(", ") : ""}`);
console.log("REGEN_SB_W7_DONE");
process.exit(failed.length ? 1 : 0);
