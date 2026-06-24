/**
 * myth-xval.mjs — 신화 챕터1 한→영 번역 교차검증 (Spark + Gemini, raw 직접호출).
 * 입력: scripts/myth-ch1-en.json. 검증축: (1)원문 의미 충실 (2)자연스러운 현용 원어민 영어 (3)문법.
 * 출력: .tqa-tmp/myth-xval-report.json — 계열별 플래그(id|sev|issue|fix).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const TMP = join(ROOT, ".tqa-tmp");
mkdirSync(TMP, { recursive: true });
const SRC = process.argv[2] || join(ROOT, "scripts", "myth-vol01-en.json");
const data = JSON.parse(readFileSync(SRC, "utf8"));

// id 부여 + 렌더 (id = 글로벌 문장 순번; 패널/idx 위치도 기록)
const items = [];
data.panels.forEach((p) => p.sentences.forEach((s, si) => items.push({ id: items.length + 1, pageNum: p.pageNum, idx: si + 1, ...s })));
const VALID = new Set(items.map((i) => i.id));
const CHUNK = 110;
const chunks = [];
for (let i = 0; i < items.length; i += CHUNK) chunks.push(items.slice(i, i + CHUNK));
const renderChunk = (ch) => ch.map((i) => `${i.id}\tKO: ${i.ko}\n\tEN: ${i.text}`).join("\n");

const INSTR = `You are reviewing a Korean→English translation for a children's Greek-mythology learning comic (English-learning app, upper-elementary/middle school readers). Each item has the Korean source (KO) and the English translation (EN).

For EACH item, check three things:
(1) FAITHFUL — does EN convey the KO meaning without distortion, addition, or omission?
(2) NATURAL — does EN read like fluent, current English that a native speaker would actually say (no translationese, no awkward phrasing)?
(3) GRAMMAR — is EN grammatically correct?

Output ONLY problem lines, one per problematic item, in EXACTLY this pipe format:
<id> | H|M|L | short problem | improved English

H=clear error/mistranslation, M=awkward but understandable, L=minor polish. If an item is fine, output NOTHING for it. Do not restate good items. Do not add commentary. Output only the pipe lines.

ITEMS:
`;

function runGemini(prompt, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn("agy", ["-p", prompt, "--model", "Gemini 3.5 Flash (High)", "--print-timeout", `${Math.floor(timeoutMs / 1000)}s`], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "", last = Date.now();
    const silent = setInterval(() => { if (Date.now() - last > timeoutMs) { clearInterval(silent); try { child.kill("SIGKILL"); } catch {} } }, 5000);
    child.stdout.on("data", (d) => { last = Date.now(); out += d; });
    child.stderr.on("data", (d) => { last = Date.now(); out += d; });
    child.on("exit", () => { clearInterval(silent); resolve(out); });
    child.on("error", () => { clearInterval(silent); resolve(out); });
  });
}
function runSpark(prompt, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn("codex", ["exec", "--full-auto", "--skip-git-repo-check", "-m", "gpt-5.3-codex-spark", "--", prompt], { detached: true, stdio: ["ignore", "pipe", "pipe"] });
    let out = "", last = Date.now();
    const killTree = (sig) => { try { process.kill(-child.pid, sig); } catch { try { child.kill(sig); } catch {} } };
    const silent = setInterval(() => { if (Date.now() - last > 180000) { clearInterval(silent); killTree("SIGTERM"); setTimeout(() => killTree("SIGKILL"), 1500).unref(); } }, 10000);
    child.stdout.on("data", (d) => { last = Date.now(); out += d; });
    child.stderr.on("data", (d) => { last = Date.now(); out += d; });
    const t = setTimeout(() => { killTree("SIGTERM"); setTimeout(() => killTree("SIGKILL"), 1500).unref(); }, timeoutMs);
    const fin = () => { clearTimeout(t); clearInterval(silent); resolve(out); };
    child.on("exit", fin); child.on("error", fin);
  });
}
function parse(raw, family) {
  const flags = [], seen = new Set();
  for (const line of String(raw).split("\n")) {
    const m = line.match(/^\s*(\d{1,4})\s*\|\s*([HMLhml])\s*\|\s*(.+?)\s*\|\s*(.+?)\s*$/);
    if (!m) continue;
    const id = Number(m[1]);
    if (!VALID.has(id) || seen.has(id)) continue;
    seen.add(id);
    flags.push({ id, sev: m[2].toUpperCase(), issue: m[3].trim(), fix: m[4].trim(), family });
  }
  return flags;
}

console.log(`교차검증 시작 — ${items.length}문장 · ${chunks.length}청크 · Spark+Gemini 병렬…`);
const gFlags = [], sFlags = [];
const rawDump = [];
for (let ci = 0; ci < chunks.length; ci++) {
  const prompt = INSTR + renderChunk(chunks[ci]);
  const [gRaw, sRaw] = await Promise.all([runGemini(prompt, 240000), runSpark(prompt, 300000)]);
  gFlags.push(...parse(gRaw, "gemini"));
  sFlags.push(...parse(sRaw, "spark"));
  rawDump.push({ chunk: ci, gemini: gRaw, spark: sRaw });
  console.log(`  청크 ${ci + 1}/${chunks.length} 완료 (gemini ${parse(gRaw, "gemini").length} · spark ${parse(sRaw, "spark").length})`);
}
writeFileSync(join(TMP, "myth-xval-raw.json"), JSON.stringify(rawDump, null, 2));

// 합의/단독 분류
const byId = {};
for (const f of [...gFlags, ...sFlags]) (byId[f.id] ||= []).push(f);
const merged = Object.entries(byId).map(([id, fs]) => ({
  id: +id, ko: items[+id - 1].ko, en: items[+id - 1].text,
  families: fs.map((f) => f.family), agree: fs.length >= 2,
  flags: fs.map((f) => `${f.family}/${f.sev}: ${f.issue} → ${f.fix}`),
})).sort((a, b) => (b.agree - a.agree) || a.id - b.id);

writeFileSync(join(TMP, "myth-xval-report.json"), JSON.stringify({ total: items.length, gemini: gFlags.length, spark: sFlags.length, merged }, null, 2));
console.log(`\nGemini 플래그 ${gFlags.length} · Spark 플래그 ${sFlags.length} · 합집합 ${merged.length}문장`);
console.log(`2계열 합의 ${merged.filter((m) => m.agree).length} · 단독 ${merged.filter((m) => !m.agree).length}`);
console.log(`\n=== 플래그 상세 (Opus 판정용) ===`);
for (const m of merged) {
  console.log(`\n#${m.id} ${m.agree ? "★합의" : ""} [${m.families.join(",")}]`);
  console.log(`  KO: ${m.ko}`);
  console.log(`  EN: ${m.en}`);
  m.flags.forEach((f) => console.log(`  - ${f}`));
}
