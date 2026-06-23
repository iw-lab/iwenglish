/**
 * profanity-scan.mjs — 앱 전체 영어 텍스트 욕설/부적절어 기계 필터 (전수).
 * 대상: 책 seed(title·문장 text·words 키·example_en) + _words.json(키·example_en) + src 소스(문자열·주석).
 * 매칭: 단어경계 \b...\b (Scunthorpe 오탐 방지 — class/pass/assistant 등 substring 불검출).
 * 2티어:
 *   T1 = 무관용(욕설·슬러·성적·하드마약) → 콘텐츠에 1건이라도 있으면 명백 결함.
 *   T2 = 아동앱 경계어(hell/damn/stupid/hate/kill/die/blood/gun/naked/drunk 등) → 문맥검토 대상(Opus 판정).
 * 출력: .tqa-tmp/profanity-report.json (위치+문장 컨텍스트), 콘솔 요약.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SEED = join(ROOT, "data", "seed");
const TMP = join(ROOT, ".tqa-tmp");
mkdirSync(TMP, { recursive: true });

// ── 워드리스트 ────────────────────────────────────────────────
// T1: 아동 콘텐츠에 절대 없어야 함
const T1 = [
  // 강성 욕설
  "fuck", "fucking", "fucker", "motherfucker", "shit", "bullshit", "shitty",
  "bitch", "bastard", "asshole", "dumbass", "jackass", "ass", "arse",
  "dick", "cock", "prick", "pussy", "cunt", "twat", "wanker", "bollocks",
  "douche", "slut", "whore", "skank", "hoe",
  // 슬러(인종/성/장애 비하)
  "nigger", "nigga", "faggot", "fag", "dyke", "retard", "retarded",
  "spic", "chink", "kike", "wetback", "gook", "tranny", "coon",
  // 성적 노골
  "sex", "sexy", "porn", "porno", "horny", "boner", "cum", "jizz",
  "penis", "vagina", "dildo", "blowjob", "handjob", "orgasm", "masturbate",
  "rape", "rapist", "molest", "pedophile", "incest",
  // 하드 마약
  "cocaine", "heroin", "meth", "crack", "weed", "marijuana", "ecstasy",
];

// T2: 문맥에 따라 정상일 수 있는 아동앱 경계어 → Opus가 문장 읽고 판정
const T2 = [
  "hell", "damn", "goddamn", "crap", "piss", "screw", "suck", "sucks",
  "stupid", "idiot", "idiots", "dumb", "moron", "fool", "loser", "jerk",
  "hate", "hateful", "ugly", "fat", "shut",
  "kill", "killed", "killing", "murder", "die", "died", "dead", "death",
  "blood", "bloody", "gun", "guns", "shoot", "shot", "stab", "knife",
  "fight", "fighting", "punch", "kick", "beat",
  "drunk", "beer", "wine", "alcohol", "drug", "drugs", "smoke", "cigarette",
  "naked", "nude", "butt", "fart", "poop", "pee",
  "devil", "satan",
];

const reFor = (words) => new RegExp("\\b(" + words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b", "gi");
const RE1 = reFor(T1), RE2 = reFor(T2);

function scan(text, tier) {
  const re = tier === 1 ? RE1 : RE2;
  re.lastIndex = 0;
  const hits = [];
  let m;
  while ((m = re.exec(text)) !== null) hits.push(m[1].toLowerCase());
  return hits;
}

const report = { t1: [], t2: [] };
function record(tier, loc, text) {
  const h1 = scan(text, 1);
  const h2 = tier === "src" ? [] : scan(text, 2); // src는 T1만(코드 식별자 kill/die 노이즈 회피)
  const h2c = scan(text, 2);
  if (h1.length) report.t1.push({ ...loc, words: [...new Set(h1)], text });
  if (h2c.length && tier !== "src") report.t2.push({ ...loc, words: [...new Set(h2c)], text });
}

// ── 1) 책 seed ────────────────────────────────────────────────
let bookCnt = 0, sentCnt = 0, wordCnt = 0;
for (const f of readdirSync(SEED)) {
  if (!f.endsWith(".json") || f.startsWith("_")) continue;
  const b = JSON.parse(readFileSync(join(SEED, f), "utf8"));
  const slug = b.slug;
  bookCnt++;
  if (b.title) record("book", { kind: "title", slug }, b.title);
  (b.pages || []).forEach((p, pi) =>
    (p.sentences || []).forEach((s, si) => {
      sentCnt++;
      record("book", { kind: "sentence", slug, page: pi + 1, idx: si + 1 }, s.text || "");
    })
  );
  // words: 키(영단어) + example_en
  if (b.words && typeof b.words === "object") {
    for (const [w, v] of Object.entries(b.words)) {
      wordCnt++;
      record("book", { kind: "word", slug, word: w }, w);
      if (v && v.example_en) record("book", { kind: "word.example", slug, word: w }, v.example_en);
    }
  }
}

// ── 2) _words.json ────────────────────────────────────────────
const gw = JSON.parse(readFileSync(join(SEED, "_words.json"), "utf8"));
for (const [w, v] of Object.entries(gw)) {
  record("gword", { kind: "_words.key", word: w }, w);
  if (v && v.example_en) record("gword", { kind: "_words.example", word: w }, v.example_en);
}

// ── 3) src 소스(문자열·주석, T1만) ───────────────────────────
function walk(dir, acc) {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".next" || e.startsWith(".")) continue;
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|js|jsx|mjs|json)$/.test(e)) acc.push(p);
  }
  return acc;
}
const srcFiles = walk(join(ROOT, "src"), []);
let srcHit = 0;
for (const fp of srcFiles) {
  const lines = readFileSync(fp, "utf8").split("\n");
  lines.forEach((ln, i) => {
    const h1 = scan(ln, 1);
    if (h1.length) {
      report.t1.push({ kind: "src", file: relative(ROOT, fp), line: i + 1, words: [...new Set(h1)], text: ln.trim().slice(0, 200) });
      srcHit++;
    }
  });
}

writeFileSync(join(TMP, "profanity-report.json"), JSON.stringify(report, null, 2));

// ── 요약 ──────────────────────────────────────────────────────
console.log(`스캔: 책 ${bookCnt}권 · 문장 ${sentCnt} · 책내단어 ${wordCnt} · 글로벌단어 ${Object.keys(gw).length} · src ${srcFiles.length}파일`);
console.log(`\n■ T1(무관용 욕설/슬러/성적/마약): ${report.t1.length}건`);
for (const r of report.t1) {
  const where = r.kind === "src" ? `${r.file}:${r.line}` : `${r.slug || ""} ${r.kind}${r.page ? ` p${r.page}s${r.idx}` : r.word ? ` [${r.word}]` : ""}`;
  console.log(`  [${r.words.join(",")}] ${where}\n     ${JSON.stringify(r.text).slice(0, 160)}`);
}
console.log(`\n■ T2(아동앱 경계어 — 문맥검토): ${report.t2.length}건`);
const byWord = {};
for (const r of report.t2) for (const w of r.words) (byWord[w] ||= 0, byWord[w]++);
console.log("  단어별 빈도:", Object.entries(byWord).sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w}:${n}`).join("  "));
