/**
 * en-qa-5way.mjs — 250권 영어 본문 전수 교차검증 (문법·비문·원어민 현용성).
 * 3 독립계열 1차 검수: 로컬 Qwen(무료) + codex Spark GPT(별도quota) + Gemini(agy).
 * Tier-3 Opus(나)가 이 리포트를 종합·오탐필터 + 의심분 웹 용례검증(5번째 신호) 후 확정.
 *
 *   node scripts/en-qa-5way.mjs [--chunk 160] [--conc 2] [--families local,spark,gemini]
 *
 * 출력: .tqa-tmp/en-qa-report.json (idMap + 계열별 플래그 병합) + 콘솔 요약.
 */
import { spawn } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const ROOT = process.cwd();
const SEED = join(ROOT, "data", "seed");
const TMP = join(ROOT, ".tqa-tmp");
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
const HOME = homedir();

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); if (i === -1) return d; const v = argv[i + 1]; return v && !v.startsWith("--") ? v : true; };
const CHUNK_SENT = Number(flag("chunk", 160));
const CONC = Number(flag("conc", 2));
const FAMILIES = String(flag("families", "local,spark,gemini")).split(",").map((s) => s.trim()).filter(Boolean);

const INSTR =
  "You are a native English teacher reviewing sentences from SIMPLE children's English picture books (ages 6-11). " +
  "The text is intentionally simple and short — do NOT flag a sentence merely for being basic, short, or for using simple present-tense narration, and ignore American/British spelling differences. " +
  "Flag a sentence ONLY if it has: H = a real grammatical error (articles, tense, subject-verb agreement, prepositions, word order, plurals, missing object); " +
  "M = an unnatural/awkward construction or translationese that a native speaker would NOT say, or wording that is dated/not current; L = a minor nit. " +
  "Output ONLY problem sentences, one per line, in EXACTLY this pipe format with the leading integer id:  id | H|M|L | brief issue | natural rewrite\n" +
  "Output no commentary, no headers, no markdown. If nothing is wrong in this batch, output exactly: CLEAN";

// ── 추출 + id 부여 ──
const books = [];
for (const f of readdirSync(SEED)) {
  if (!f.endsWith(".json") || f.startsWith("_")) continue;
  const b = JSON.parse(readFileSync(join(SEED, f), "utf8"));
  const sents = [];
  (b.pages || []).forEach((p, pi) =>
    (p.sentences || []).forEach((s, si) => { if (s.text) sents.push({ page: pi + 1, idx: si + 1, text: s.text }); }),
  );
  if (sents.length) books.push({ slug: b.slug, title: b.title ?? b.slug, sents });
}
books.sort((a, b) => a.slug.localeCompare(b.slug));

const idMap = {}; // id → {slug,page,idx,text}
let gid = 0;
for (const b of books) for (const s of b.sents) { s.id = ++gid; idMap[s.id] = { slug: b.slug, page: s.page, idx: s.idx, text: s.text }; }

// ── 청크: 책 단위로 묶되 문장수 ~CHUNK_SENT ──
const chunks = [];
let cur = [], curN = 0;
for (const b of books) {
  cur.push(b); curN += b.sents.length;
  if (curN >= CHUNK_SENT) { chunks.push(cur); cur = []; curN = 0; }
}
if (cur.length) chunks.push(cur);
const renderChunk = (cbooks) =>
  cbooks.map((b) => `=== BOOK: ${b.slug} (${b.title}) ===\n` + b.sents.map((s) => `${s.id}\t${s.text}`).join("\n")).join("\n\n");

console.log(`[en-qa] 책 ${books.length} · 문장 ${gid} · 청크 ${chunks.length}(목표 ${CHUNK_SENT}문장/청크) · 계열 [${FAMILIES.join(",")}] · conc ${CONC}`);

// ── 계열 실행기 (브릿지 우회 — raw 엔진 직접 호출로 pipe 포맷 강제) ──
// 로컬: ollama /api/generate 직접 (qwen2.5-coder:14b, think=false, 결정적 temp)
async function runLocal(prompt, timeoutMs) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "qwen2.5-coder:14b", prompt, stream: false, think: false, options: { temperature: 0.1, num_ctx: 16384 } }),
      signal: ac.signal,
    });
    const j = await res.json();
    return { code: 0, out: j.response || "" };
  } catch { return { code: -1, out: "" }; }
  finally { clearTimeout(t); }
}
// Gemini: agy 직접 (비대화형 -p)
function runGemini(prompt, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn("agy", ["-p", prompt, "--model", "Gemini 3.5 Flash (High)", "--print-timeout", `${Math.floor(timeoutMs / 1000)}s`], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let last = Date.now();
    const silent = setInterval(() => { if (Date.now() - last > timeoutMs) { clearInterval(silent); try { child.kill("SIGKILL"); } catch {} } }, 5000);
    child.stdout.on("data", (d) => { last = Date.now(); out += d; });
    child.stderr.on("data", (d) => { last = Date.now(); out += d; });
    child.on("exit", () => { clearInterval(silent); resolve({ code: 0, out }); });
    child.on("error", () => { clearInterval(silent); resolve({ code: -1, out }); });
  });
}
function runCodexSpark(prompt, timeoutMs) {
  return new Promise((resolve) => {
    const args = ["exec", "--full-auto", "--skip-git-repo-check", "-m", "gpt-5.3-codex-spark", "--", prompt];
    const child = spawn("codex", args, { detached: true, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    const killTree = (sig) => { try { process.kill(-child.pid, sig); } catch { try { child.kill(sig); } catch {} } };
    let last = Date.now();
    const silent = setInterval(() => { if (Date.now() - last > 180000) { clearInterval(silent); killTree("SIGTERM"); setTimeout(() => killTree("SIGKILL"), 1500).unref(); } }, 10000);
    child.stdout.on("data", (d) => { last = Date.now(); out += d; });
    child.stderr.on("data", (d) => { last = Date.now(); out += d; });
    const t = setTimeout(() => { killTree("SIGTERM"); setTimeout(() => killTree("SIGKILL"), 1500).unref(); }, timeoutMs);
    const fin = () => { clearTimeout(t); clearInterval(silent); resolve({ code: 0, out }); };
    child.on("exit", fin); child.on("error", fin);
  });
}

const VALID_IDS = new Set(Object.keys(idMap).map(Number));
function parseFlags(raw, family) {
  const flags = [];
  const seen = new Set();
  for (const line of String(raw).split("\n")) {
    const m = line.match(/^\s*(\d{1,6})\s*\|\s*([HMLhml])\s*\|\s*(.+?)\s*\|\s*(.+?)\s*$/);
    if (!m) continue;
    const id = Number(m[1]);
    if (!VALID_IDS.has(id) || seen.has(id)) continue; // 환각 id·동일계열 중복 제거
    seen.add(id);
    flags.push({ id, sev: m[2].toUpperCase(), issue: m[3].trim(), fix: m[4].trim(), family });
  }
  return flags;
}

async function runFamilyOnChunk(family, chunkText) {
  const prompt = `${INSTR}\n\n${chunkText}`;
  if (family === "local") return runLocal(prompt, 300000);
  if (family === "gemini") return runGemini(prompt, 220000);
  if (family === "spark") return runCodexSpark(prompt, 300000);
  return { code: -1, out: "" };
}

// ── 풀 실행 ──
const allFlags = [];
const coverage = Object.fromEntries(FAMILIES.map((f) => [f, { ok: 0, fail: 0 }]));
let done = 0;
async function processChunk(ci) {
  const chunkText = renderChunk(chunks[ci]);
  const results = await Promise.all(
    FAMILIES.map(async (fam) => {
      await new Promise((r) => setTimeout(r, 300));
      const r = await runFamilyOnChunk(fam, chunkText).catch(() => ({ code: -1, out: "" }));
      const txt = r.out || "";
      const fl = parseFlags(txt, fam);
      const clean = /(^|\n)\s*CLEAN\s*(\n|$)/i.test(txt);
      if ((fl.length > 0 || clean) && (r.code === 0 || fam === "spark")) coverage[fam].ok++;
      else coverage[fam].fail++;
      return fl;
    }),
  );
  for (const fl of results) allFlags.push(...fl);
  done++;
  console.log(`  [chunk ${done}/${chunks.length}] (ci=${ci}) 누적 플래그 ${allFlags.length}`);
}

let idx = 0;
const worker = async () => { while (idx < chunks.length) { const ci = idx++; await processChunk(ci); } };
await Promise.all(Array.from({ length: Math.min(CONC, chunks.length) }, worker));

// ── 병합: id별 ──
const byId = {};
for (const f of allFlags) {
  if (!byId[f.id]) byId[f.id] = { id: f.id, ...idMap[f.id], families: [], maxSev: "L" };
  byId[f.id].families.push({ family: f.family, sev: f.sev, issue: f.issue, fix: f.fix });
  const order = { H: 3, M: 2, L: 1 };
  if (order[f.sev] > order[byId[f.id].maxSev]) byId[f.id].maxSev = f.sev;
}
const merged = Object.values(byId).sort((a, b) => {
  const o = { H: 3, M: 2, L: 1 };
  return b.families.length - a.families.length || o[b.maxSev] - o[a.maxSev];
});

const report = { books: books.length, sentences: gid, chunks: chunks.length, families: FAMILIES, coverage, flagged: merged };
writeFileSync(join(TMP, "en-qa-report.json"), JSON.stringify(report, null, 2));
writeFileSync(join(TMP, "en-qa-idmap.json"), JSON.stringify(idMap));

const consensus = merged.filter((m) => m.families.length >= 2);
console.log(`\n=== en-qa 완료 ===`);
console.log(`커버리지: ${JSON.stringify(coverage)}`);
console.log(`플래그 문장 ${merged.length}건 (2계열+ 합의 ${consensus.length}건)`);
console.log(`\n[2계열+ 합의 상위 30]`);
for (const m of consensus.slice(0, 30))
  console.log(`  #${m.id} ${m.slug} p${m.page} [${m.families.map((f) => f.family[0] + f.sev).join(",")}] "${m.text}"`);
console.log(`\n리포트: .tqa-tmp/en-qa-report.json`);
console.log("EN_QA_DONE");
