/**
 * daily-* 전수 기계 검수 — 스키마/난이도 사다리/에디터 위반/퀴즈/오염중복/음성누락.
 *   node scripts/qa-daily.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SEED = join(process.cwd(), "data", "seed");
const LEVEL_BY_STAGE = { 1: "preA1", 2: "A1", 3: "A2", 4: "A2", 5: "B1", 6: "B1" };

const files = readdirSync(SEED)
  .filter((f) => /^daily-\d+-.+\.json$/.test(f))
  .sort((a, b) => {
    const na = Number(a.match(/^daily-(\d+)/)[1]);
    const nb = Number(b.match(/^daily-(\d+)/)[1]);
    return na - nb;
  });

const enWords = (s) => (s.match(/[A-Za-z']+/g) || []).length;
const books = [];
const issues = [];
const textMap = new Map(); // page text -> [slug]

for (const f of files) {
  let b;
  try {
    b = JSON.parse(readFileSync(join(SEED, f), "utf8"));
  } catch (e) {
    issues.push(`🔴 ${f}: JSON 파싱 실패 — ${e.message}`);
    continue;
  }
  const slug = b.slug || f.replace(/\.json$/, "");
  let sents = 0,
    words = 0,
    withAudio = 0,
    withTimings = 0;
  for (const p of b.pages || []) {
    for (const s of p.sentences || []) {
      sents++;
      words += enWords(s.text || "");
      if (s.audio) withAudio++;
      if ((s.wordTimings?.length ?? 0) > 0) withTimings++;
      // em-dash 남용
      const dashes = (s.text.match(/—/g) || []).length;
      if (dashes > 1) issues.push(`✏️ ${slug}: em-dash ${dashes}회 — "${s.text.slice(0, 40)}…"`);
      // 마크다운 강조
      if (/\*\*/.test(s.text) || /\*\*/.test(s.translation_ko || ""))
        issues.push(`✏️ ${slug}: 마크다운 ** 발견`);
    }
    const t = (p.sentences || []).map((s) => s.text).join(" ");
    if (t) textMap.set(t, [...(textMap.get(t) || []), slug]);
  }
  // summary_ko 영어 메타 누수
  const sum = b.summary_ko || "";
  if (/[A-Za-z]/.test(sum))
    issues.push(`🔴 ${slug}: summary_ko 영어 누수 — "${sum.slice(-60)}"`);
  if (/\(.*\)/.test(sum) && /\d/.test(sum))
    issues.push(`🟡 ${slug}: summary_ko 괄호+숫자 메타 의심 — "${sum.slice(-50)}"`);
  // 레벨-스테이지 일치
  const wantLv = LEVEL_BY_STAGE[b.stage];
  if (wantLv && b.level !== wantLv)
    issues.push(`🟡 ${slug}: level ${b.level} ≠ stage${b.stage} 기준 ${wantLv}`);
  // 퀴즈 구조
  if (!Array.isArray(b.quiz) || b.quiz.length < 5)
    issues.push(`🟡 ${slug}: 퀴즈 ${b.quiz?.length ?? 0}개(<5)`);
  (b.quiz || []).forEach((q, i) => {
    if (!Array.isArray(q.options) || q.options.length !== 4)
      issues.push(`🔴 ${slug} q${i + 1}: 보기 ${q.options?.length ?? 0}개(≠4)`);
    if (typeof q.answerIndex !== "number" || q.answerIndex < 0 || q.answerIndex > 3)
      issues.push(`🔴 ${slug} q${i + 1}: answerIndex ${q.answerIndex} 범위밖`);
    if (q.type !== "mc") issues.push(`🟡 ${slug} q${i + 1}: type ${q.type}`);
  });
  // 음성/타이밍 부분 누락(추가 페이지 의심)
  if (withAudio > 0 && withAudio < sents)
    issues.push(`🟠 ${slug}: 음성 부분 누락 ${withAudio}/${sents}쪽(추가페이지 음성 미생성)`);
  // 필수 필드
  for (const k of ["slug", "title", "title_ko", "level", "ageBand", "stage", "collection", "summary_ko"])
    if (b[k] === undefined) issues.push(`🔴 ${slug}: 필드 누락 '${k}'`);

  books.push({
    slug,
    stage: b.stage,
    level: b.level,
    age: b.ageBand,
    pages: (b.pages || []).length,
    sents,
    words,
    withAudio,
    withTimings,
    quiz: (b.quiz || []).length,
    isNew: Number(slug.match(/^daily-(\d+)/)?.[1] ?? 0) >= 25,
  });
}

// 오염 중복(같은 페이지 텍스트가 2권 이상)
for (const [t, slugs] of textMap) {
  const uniq = [...new Set(slugs)];
  if (uniq.length > 1)
    issues.push(`🔴 오염중복: "${t.slice(0, 45)}…" → ${uniq.join(", ")}`);
}

console.log(`\n===== 권별 요약 (${books.length}권) =====`);
console.log("slug".padEnd(34), "st", "lv".padEnd(5), "pg", "se", "wd".padEnd(4), "aud", "신규");
for (const b of books)
  console.log(
    b.slug.padEnd(34),
    String(b.stage).padEnd(2),
    String(b.level).padEnd(5),
    String(b.pages).padEnd(2),
    String(b.sents).padEnd(2),
    String(b.words).padEnd(4),
    `${b.withAudio}/${b.sents}`.padEnd(6),
    b.isNew ? "✨" : "",
  );

console.log(`\n===== 단계별 난이도 사다리 =====`);
console.log("stage", "books", "avgPages", "avgSents", "avgWords", "wordRange");
for (let st = 1; st <= 6; st++) {
  const g = books.filter((b) => b.stage === st);
  if (!g.length) continue;
  const avg = (k) => Math.round(g.reduce((s, x) => s + x[k], 0) / g.length);
  const wmin = Math.min(...g.map((x) => x.words));
  const wmax = Math.max(...g.map((x) => x.words));
  console.log(
    String(st).padEnd(5),
    String(g.length).padEnd(5),
    String(avg("pages")).padEnd(8),
    String(avg("sents")).padEnd(8),
    String(avg("words")).padEnd(8),
    `${wmin}–${wmax}`,
  );
}

console.log(`\n===== 이슈 ${issues.length}건 =====`);
const order = { "🔴": 0, "🟠": 1, "🟡": 2, "✏️": 3 };
issues
  .sort((a, b) => (order[a.slice(0, 2)] ?? 9) - (order[b.slice(0, 2)] ?? 9))
  .forEach((i) => console.log(i));
console.log(`\n신규(25~40) ${books.filter((b) => b.isNew).length}권 · 음성필요 ${books.filter((b) => b.withAudio < b.sents).length}권`);
