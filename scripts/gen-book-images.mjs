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
import { readFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SEED = join(ROOT, "data", "seed");
const PUB = join(ROOT, "public", "seed");
const RES = "1536x1024";
const PER_TIMEOUT = 480000; // 8분

const STYLE =
  "Soft watercolor children's picture-book illustration, warm gentle light, cozy storybook mood, painterly, wholesome, friendly, full background scene.";
const POV =
  "Main character Jun: a cheerful Korean boy ~8, short tousled black hair, round friendly face, red t-shirt, blue shorts. Same look every page.";
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

function runCodex({ dir, out, prompt, anchor }) {
  return new Promise((resolve) => {
    const args = [
      "exec",
      "--full-auto",
      "--add-dir",
      dir,
      "--skip-git-repo-check",
    ];
    if (anchor && existsSync(anchor)) args.push("--image", anchor);
    args.push(
      "--",
      `$imagegen 다음 조건으로 그림책 일러스트 1장 생성 후 반드시 아래 경로에 PNG로 저장.\n${prompt}\n저장 경로: ${out}\n해상도: ${RES}\n작업 규칙(중요): $imagegen 도구를 즉시 1회만 호출하고, 생성 즉시 위 경로에 저장 후 바로 종료할 것.\n- 생성된 이미지를 열어 검사·재평가·재생성하지 말 것(품질 검수는 별도 파이프라인이 수행). 사소한 결점이 보여도 그대로 저장.\n- 스킬 reference 문서나 image_gen.py CLI fallback을 읽거나 사용하지 말 것.\n- 질문·승인 대기 금지. 도구가 서버 오류를 반환한 경우에만 1회 재시도.`,
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
  for (let a = 1; a <= 3; a++) {
    const ok = await runCodex(task);
    if (ok) {
      console.log(`✅ ${task.label}`);
      return true;
    }
    console.log(`↻ ${task.label} 재시도 ${a}/3`);
  }
  console.log(`⚠️ ${task.label} 실패`);
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
      prompt: `${STYLE}\n${POV}\n${visualLevel(b)}\nScene: Book cover. ${scene} Cheerful, cozy, inviting.\n${NEG}`,
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
        prompt: `${STYLE}\n${POV}\n${visualLevel(b)}\nScene: ${sceneFromPage(p)}\nMatch cover character and art style exactly.\n${NEG}`,
      });
    });
  }
  return tasks;
}

async function main() {
  const phase = ["covers", "pages", "all"].includes(process.argv[2])
    ? process.argv[2]
    : "all";
  const conc = Number(process.argv[3]) || 6;
  const list = loadBooks();
  console.log(`🖼️ [${phase}] 동시 ${conc}개 · ${list.length}권`);
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
