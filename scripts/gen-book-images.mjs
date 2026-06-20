/**
 * 생활영어 동화 일러스트 — codex $imagegen, **병렬** 생성.
 * - 동시 N개(기본 6) 동시 실행, 8분 하드 타임아웃(걸리면 kill 후 재시도 최대 3회).
 * - 단계: covers(전 책 표지) → pages(표지를 -i 레퍼런스로 페이지).
 *
 *   node scripts/gen-book-images.mjs covers [conc]
 *   node scripts/gen-book-images.mjs pages  [conc]
 *   node scripts/gen-book-images.mjs all    [conc]
 */
import { spawn } from "node:child_process";
import {
  readFileSync,
  readdirSync,
  existsSync,
  mkdirSync,
  unlinkSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { PLAN, CAST } from "./daily-expansion-plan.mjs";

// 신규 생활영어(daily-51~150) 단계별 캐스트 맵 (slug → 등장인물 외형 설명)
const CAST_BY_SLUG = Object.fromEntries(
  PLAN.map((p) => [p.slug, p.cast.map((c) => CAST[c]).filter(Boolean)]),
);

const ROOT = process.cwd();
const SEED = join(ROOT, "data", "seed");
const PUB = join(ROOT, "public", "seed");
const RES = "1536x1024";
const PER_TIMEOUT = 480000; // 8분
// 페이지당 codex 시도 횟수. quota 절약을 위해 기본 1회 — 실패/복제는 공백으로 두고
// 다음 패스(skip-existing 재실행)·사용자 검수에서 백필. GEN_RETRY로 상향 가능.
const RETRY = Math.max(1, Number(process.env.GEN_RETRY ?? 1));

// ── MD5 self-verify (codex 0.139 "최신 generated_images 줍기" 교차오염 방어) ──
// regen-dedup-w7.mjs 검증 로직 이식: 생성 직후 전 자산 md5 대조 → 충돌 시 폐기+salt 재시도,
// 성공분은 즉시 대조군 편입. genOne 내 검사·편입 구간엔 await 가 없어 동시성 race 안전(단일스레드 원자).
const md5 = (p) => createHash("md5").update(readFileSync(p)).digest("hex");
const HASHES = new Map(); // md5 → 경로
function buildHashMap() {
  if (!existsSync(PUB)) return; // 클린 환경(첫 실행)에서 PUB 부재 시 크래시 방지
  for (const slug of readdirSync(PUB)) {
    let files;
    try {
      files = readdirSync(join(PUB, slug));
    } catch {
      continue;
    }
    for (const f of files) {
      if (!/\.(png|webp)$/i.test(f)) continue;
      const fp = join(PUB, slug, f);
      try {
        HASHES.set(md5(fp), fp);
      } catch {
        /* noop */
      }
    }
  }
}

const STYLE =
  "Soft watercolor children's picture-book illustration, warm gentle light, cozy storybook mood, painterly, wholesome, friendly, full background scene.";
const POV_JUN =
  "Main character Jun: a cheerful Korean boy ~8, short tousled black hair, round friendly face, red t-shirt, blue shorts. Same look every page.";

// 책별 POV — 신규 권은 단계별 캐스트(Jun 앵커 + 친구·가족·선생님), 기존 권은 Jun 단독.
function povFor(b) {
  const cast = CAST_BY_SLUG[b.slug];
  if (!cast || cast.length === 0) return POV_JUN;
  if (cast.length === 1) return `Main character ${cast[0]}. Keep the exact same look every page.`;
  return (
    `Recurring characters (keep each one's look IDENTICAL on every page): ${cast.join("; ")}. ` +
    `Draw ONLY the characters that appear in the scene described below; do not add extra people.`
  );
}
const NEG =
  "STRICT: no text/letters in image. 5-finger hands, natural pose. NOT cartoon/anime/manga/chibi, no big anime eyes, NOT sticker on white, NOT comic panel. NOT Chinese/Greek/Roman/Japanese-samurai, NOT historical costume. Korean modern everyday setting.";

const STAGE_VISUAL = {
  1: "Stage 1 visual difficulty: one clear action, one main object, uncluttered background, close or medium shot, very easy for young learners to read.",
  2: "Stage 2 visual difficulty: simple everyday scene with 2-3 objects, clear left-to-right action, gentle classroom or home details.",
  3: "Stage 3 visual difficulty: cause-and-effect scene, 3-4 meaningful objects, visible emotion, slightly richer background details.",
  4: "Stage 4 visual difficulty: sequential problem-solving moment, clear foreground action plus supporting background clues, balanced medium-wide composition.",
  5: "Stage 5 visual difficulty: richer B1 story moment with community context, multiple readable visual clues, layered but calm composition.",
  6: "Stage 6 visual difficulty: advanced B1 spread-like scene with planning, reflection, or cause/effect; more environmental detail while keeping the child protagonist readable.",
};

const stripQuotes = (s) => s.replace(/[""]/g, '"');
const sceneFromPage = (p) =>
  p.sentences.map((s) => stripQuotes(s.text)).join(" ").slice(0, 280);

const visualLevel = (b) =>
  STAGE_VISUAL[b.stage] ??
  "General picture-book visual difficulty: clear child-centered story scene.";

function runCodex({ dir, out, prompt, anchor, salt }) {
  return new Promise((resolve) => {
    const args = [
      "exec",
      "--full-auto",
      "--add-dir",
      dir,
      "--skip-git-repo-check",
    ];
    if (anchor && existsSync(anchor)) args.push("--image", anchor);
    const saltLine = salt
      ? `\n[unique:${salt}] 이 이미지는 다른 모든 페이지와 시각적으로 분명히 다른 새 그림이어야 함. 캐시·기존 generated_images 파일을 절대 재사용하지 말 것.`
      : "";
    args.push(
      "--",
      `$imagegen 다음 조건으로 그림책 일러스트 1장 생성 후 반드시 아래 경로에 PNG로 저장.\n${prompt}${saltLine}\n저장 경로: ${out}\n해상도: ${RES}\n작업 규칙(중요): $imagegen 도구를 즉시 1회만 호출하고, 생성 즉시 위 경로에 저장 후 바로 종료할 것.\n- 생성된 이미지를 열어 검사·재평가·재생성하지 말 것(품질 검수는 별도 파이프라인이 수행). 사소한 결점이 보여도 그대로 저장.\n- 기존 generated_images나 다른 책의 이미지를 복사·재사용하지 말 것. 반드시 새로 생성.\n- 스킬 reference 문서나 image_gen.py CLI fallback을 읽거나 사용하지 말 것.\n- 질문·승인 대기 금지. 도구가 서버 오류를 반환한 경우에만 1회 재시도.`,
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
    const t = setTimeout(() => { killTree("SIGTERM"); setTimeout(() => killTree("SIGKILL"), 1500).unref(); }, PER_TIMEOUT);
    const fin = () => { clearTimeout(t); clearInterval(silent); resolve(existsSync(out)); };
    child.on("exit", fin);
    child.on("error", fin);
  });
}

async function genOne(task) {
  // png 또는 이미 압축된 webp 가 있으면 skip (재생성 방지)
  if (existsSync(task.out) || existsSync(task.out.replace(/\.png$/, ".webp"))) {
    console.log(`↩︎ ${task.label} 있음`);
    return true;
  }
  for (let a = 1; a <= RETRY; a++) {
    const salt = `${task.label.replace(/\s+/g, "-")}-a${a}-${Math.floor(
      Math.random() * 1e6,
    )}`;
    const ok = await runCodex({ ...task, salt });
    if (!ok) {
      console.log(`↻ ${task.label} 생성실패 ${a}/${RETRY}`);
      continue;
    }
    // self-verify: 생성물 md5 가 기존 전 자산과 충돌하면 교차오염 → 폐기(공백, 오염 출고 방지)
    let h;
    try {
      h = md5(task.out);
    } catch {
      console.log(`↻ ${task.label} 저장 누락 ${a}/${RETRY}`);
      continue;
    }
    if (HASHES.has(h) && HASHES.get(h) !== task.out) {
      console.log(
        `🚫 ${task.label} 중복오염(=${HASHES.get(h)}) 폐기·공백 ${a}/${RETRY}`,
      );
      try {
        unlinkSync(task.out);
      } catch {
        /* noop */
      }
      continue;
    }
    HASHES.set(h, task.out); // 성공분 즉시 대조군 편입
    console.log(`✅ ${task.label}`);
    return true;
  }
  // RETRY회 내 미생성 — 공백 유지(다음 패스 skip-existing 재실행 + 사용자 검수에서 백필)
  console.log(`⚠️ ${task.label} 미생성(이번 패스 — 다음 패스/검수서 백필)`);
  return false;
}

async function pool(tasks, conc) {
  let idx = 0;
  const worker = async () => {
    while (idx < tasks.length) {
      const t = tasks[idx++];
      await new Promise((r) => setTimeout(r, 900)); // OAuth race 회피 stagger (동시 수 낮을수록 안전)
      await genOne(t);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(conc, tasks.length) }, worker),
  );
}

function loadBooks() {
  return readdirSync(SEED)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .map((f) => JSON.parse(readFileSync(join(SEED, f), "utf8")))
    .filter((b) => b.collection === "daily")
    .sort((a, b) => (a.stage ?? 0) - (b.stage ?? 0));
}

function coverTasks(list) {
  return list.map((b) => {
    const dir = join(PUB, b.slug);
    mkdirSync(dir, { recursive: true });
    const scene = sceneFromPage(b.pages[0]);
    return {
      label: `${b.slug} cover`,
      dir,
      out: join(dir, "cover.png"),
      prompt: `${STYLE}\n${povFor(b)}\n${visualLevel(b)}\nScene: Book cover. ${scene} Cheerful, cozy, inviting.\n${NEG}`,
    };
  });
}

function pageTasks(list) {
  const tasks = [];
  for (const b of list) {
    const dir = join(PUB, b.slug);
    const cover = join(dir, "cover.png");
    b.pages.forEach((p, i) => {
      tasks.push({
        label: `${b.slug} p${i + 1}`,
        dir,
        out: join(dir, `p${i + 1}.png`),
        anchor: cover,
        prompt: `${STYLE}\n${povFor(b)}\n${visualLevel(b)}\nScene: ${sceneFromPage(p)}\nMatch cover characters and art style exactly.\n${NEG}`,
      });
    });
  }
  return tasks;
}

async function main() {
  const phase = ["covers", "pages", "all"].includes(process.argv[2])
    ? process.argv[2]
    : "all";
  const conc = Math.min(Number(process.argv[3]) || 3, 3); // HARD 캡 3 (OAuth race 방어)
  const list = loadBooks();
  buildHashMap(); // 기존 전 자산 md5 대조군 구축 (생성물 self-verify 기준)
  console.log(
    `🖼️ [${phase}] 동시 ${conc}개 · ${list.length}권 · 대조군 ${HASHES.size}장`,
  );
  if (phase === "covers" || phase === "all") {
    console.log("=== COVERS ===");
    await pool(coverTasks(list), conc);
    console.log("COVERS_PHASE_DONE");
  }
  if (phase === "pages" || phase === "all") {
    console.log("=== PAGES ===");
    await pool(pageTasks(list), conc);
    console.log("PAGES_PHASE_DONE");
  }
  console.log("🎉 완료");
}

main();
