/**
 * 그림책(픽션) 일러스트 — codex $imagegen, 병렬. 생활영어와 달리 **권마다 고유 캐릭터**.
 * - 캐릭터는 storybook-plan.mjs 의 char 필드. 페이지는 표지(cover.png)를 -i 앵커로 일관성 유지.
 * - 동화/판타지 톤 허용(생활영어의 "Korean modern everyday" 강제 없음).
 * - anti-lock: 세션 솔트 + 프로젝트 지문 + 타프로젝트 키워드 ban + 컷별 unique 태그.
 *
 *   node scripts/gen-storybook-images.mjs covers [conc]
 *   node scripts/gen-storybook-images.mjs pages  [conc]
 *   node scripts/gen-storybook-images.mjs covers [conc] extra
 *   node scripts/gen-storybook-images.mjs pages  [conc] extra
 */
import { spawn } from "node:child_process";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { STORYBOOK_PLAN } from "./storybook-plan.mjs";
import { EXTRA_STORYBOOK_PLAN } from "./storybook-extra-books.mjs";

const ROOT = process.cwd();
const SEED = join(ROOT, "data", "seed");
const PUB = join(ROOT, "public", "seed");
const RES = "1536x1024";
const PER_TIMEOUT = 480000; // 8분
const SALT = `sb${Date.now().toString(36)}`; // 세션 솔트(anti-lock)
const LIMIT_PATTERNS = [
  "usage limit",
  "rate limit",
  "quota",
  "try again at",
  "purchase more credits",
  "upgrade to plus",
];

const STYLE =
  "Soft watercolor children's storybook illustration, warm gentle light, whimsical and cozy, painterly, wholesome, friendly, full background scene, picture-book art.";
const NEG =
  "STRICT: NO text/letters/numbers in the image. Anatomy correct (5-finger hands for humans, natural animal anatomy), natural relaxed pose. " +
  "NOT cartoon/anime/manga/chibi, no big anime eyes, NOT a sticker on white, NOT a comic panel/speech bubble, NOT photoreal 3D render. " +
  "NOT historical drama, NOT Korean sageuk/hanbok, NOT Greek/Roman/toga/laurel, NOT samurai, NOT modern brand logos. NO celebrity likeness.";

const LEVEL_VISUAL = {
  preA1: "Very simple, uncluttered scene: one clear subject and action, soft plain background, large and easy to read for the youngest children.",
  A1: "Simple friendly scene with 2-3 clear elements, gentle action, soft readable background.",
  A2: "A storytelling moment with clear foreground action and a few supporting background details, visible emotion.",
  B1: "A richer, atmospheric storybook scene with layered but calm composition, mood and setting detail, while keeping the main character clearly readable.",
};

const stripQuotes = (s) => s.replace(/[“”""]/g, '"');
const sceneFromPage = (p) =>
  p.sentences.map((s) => stripQuotes(s.text)).join(" ").slice(0, 280);

function isUsageLimit(text) {
  const lower = text.toLowerCase();
  return LIMIT_PATTERNS.some((p) => lower.includes(p));
}

function tail(text, max = 1200) {
  return text.length > max ? text.slice(-max) : text;
}

function stopProcessTree(child, signal = "SIGTERM") {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    try { child.kill(signal); } catch { /* noop */ }
  }
}

function runCodex({ dir, out, prompt, anchor }) {
  return new Promise((resolve) => {
    const args = ["exec", "--full-auto", "--add-dir", dir, "--skip-git-repo-check"];
    if (anchor && existsSync(anchor)) args.push("--image", anchor);
    args.push(
      "--",
      `$imagegen 다음 조건으로 그림책 일러스트 1장 생성 후 반드시 아래 경로에 PNG로 저장.\n${prompt}\n저장 경로: ${out}\n해상도: ${RES}\n작업 규칙(중요): $imagegen 도구를 즉시 1회만 호출하고, 생성 즉시 위 경로에 저장 후 바로 종료할 것.\n- 생성된 이미지를 열어 검사·재평가·재생성하지 말 것(품질 검수는 별도 파이프라인이 수행). 사소한 결점이 보여도 그대로 저장.\n- 스킬 reference 문서나 image_gen.py CLI fallback을 읽거나 사용하지 말 것.\n- 질문·승인 대기 금지. 도구가 서버 오류를 반환한 경우에만 1회 재시도.`,
    );
    const child = spawn("codex", args, {
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    let timedOut = false;
    // 비활동 워치독 — codex는 프롬프트를 즉시 에코하므로 "첫 출력"은 신호가 아님.
    // 새 출력이 240초간 없으면 hang(에코 후 침묵 패턴) → 8분 안 기다리고 조기 킬.
    let lastData = Date.now();
    const idle = setInterval(() => {
      if (Date.now() - lastData > 240000) {
        timedOut = true;
        output += "\nIDLE_HANG: 240초 무활동 — 조기 킬";
        clearInterval(idle);
        stopProcessTree(child, "SIGTERM");
        setTimeout(() => stopProcessTree(child, "SIGKILL"), 1500).unref();
      }
    }, 15000);
    child.stdout.on("data", (d) => { lastData = Date.now(); output += d.toString(); });
    child.stderr.on("data", (d) => { lastData = Date.now(); output += d.toString(); });
    const t = setTimeout(() => {
      timedOut = true;
      stopProcessTree(child, "SIGTERM");
      setTimeout(() => stopProcessTree(child, "SIGKILL"), 1500).unref();
    }, PER_TIMEOUT);
    child.on("exit", () => {
      clearTimeout(t);
      clearInterval(idle);
      if (timedOut && !output.includes("IDLE_HANG"))
        output += `\nTIMEOUT after ${PER_TIMEOUT}ms`;
      resolve({ ok: existsSync(out), limited: isUsageLimit(output), output });
    });
    child.on("error", (err) => {
      clearTimeout(t);
      clearInterval(idle);
      output += `\n${err.message}`;
      resolve({ ok: existsSync(out), limited: isUsageLimit(output), output });
    });
  });
}

async function genOne(task) {
  if (existsSync(task.out) || existsSync(task.out.replace(/\.png$/, ".webp"))) {
    console.log(`↩︎ ${task.label} 있음`);
    return true;
  }
  for (let a = 1; a <= 5; a++) {
    const result = await runCodex(task);
    if (result.ok) { console.log(`✅ ${task.label}`); return true; }
    if (result.limited) {
      console.log(`⏸️ ${task.label} 한도 도달 — 재시도 중단`);
      console.log(tail(result.output));
      return "limit";
    }
    if (result.output.trim()) {
      console.log(`⚠️ ${task.label} 실패 출력:\n${tail(result.output)}`);
    }
    console.log(`↻ ${task.label} 재시도 ${a}/5`);
  }
  console.log(`⚠️ ${task.label} 실패`);
  return false;
}

async function pool(tasks, conc) {
  let idx = 0;
  let stopped = false;
  const worker = async () => {
    while (!stopped && idx < tasks.length) {
      const t = tasks[idx++];
      await new Promise((r) => setTimeout(r, 900)); // OAuth race stagger
      const result = await genOne(t);
      if (result === "limit") stopped = true;
    }
  };
  await Promise.all(Array.from({ length: Math.min(conc, tasks.length) }, worker));
  return stopped;
}

function loadBooks() {
  const scope = process.argv[4] || process.env.STORYBOOK_SCOPE || "all";
  const plan = scope === "extra" ? EXTRA_STORYBOOK_PLAN : STORYBOOK_PLAN;
  return plan.map((spec) => {
    const seed = JSON.parse(readFileSync(join(SEED, spec.slug + ".json"), "utf8"));
    return { ...spec, pages: seed.pages };
  });
}

const head = (b, kind, n) =>
  `[EchoTale storybook · ${b.slug} · ${kind}${n != null ? n : ""} · ${SALT}]`;
const charLine = (b) =>
  `Main character (keep EXACTLY consistent every page): ${b.char}.`;

function coverTasks(list) {
  return list.map((b) => {
    const dir = join(PUB, b.slug);
    mkdirSync(dir, { recursive: true });
    return {
      label: `${b.slug} cover`,
      dir,
      out: join(dir, "cover.png"),
      prompt: `${head(b, "cover")}\n${STYLE}\n${charLine(b)}\n${LEVEL_VISUAL[b.level]}\nScene: Inviting book cover for "${b.title}". ${sceneFromPage(b.pages[0])} Warm, cozy, magical storybook feeling.\n${NEG}`,
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
        prompt: `${head(b, "p", i + 1)}\n${STYLE}\n${charLine(b)}\n${LEVEL_VISUAL[b.level]}\nScene: ${sceneFromPage(p)}\nMatch the cover's character design, colors and art style EXACTLY (no drift). This page must be visually DISTINCT from the other pages.\n${NEG}`,
      });
    });
  }
  return tasks;
}

async function main() {
  const phase = ["covers", "pages"].includes(process.argv[2]) ? process.argv[2] : "covers";
  const conc = Number(process.argv[3]) || 3;
  const scope = process.argv[4] || process.env.STORYBOOK_SCOPE || "all";
  const list = loadBooks();
  console.log(`🖼️ storybook [${phase}] scope=${scope} 동시 ${conc} · ${list.length}권 · salt ${SALT}`);
  let stopped = false;
  if (phase === "covers") {
    stopped = await pool(coverTasks(list), conc);
    if (stopped) { console.log("USAGE_LIMIT_STOP"); return; }
    console.log("COVERS_PHASE_DONE");
  } else {
    stopped = await pool(pageTasks(list), conc);
    if (stopped) { console.log("USAGE_LIMIT_STOP"); return; }
    console.log("PAGES_PHASE_DONE");
  }
  console.log("🎉 완료");
}

main();
