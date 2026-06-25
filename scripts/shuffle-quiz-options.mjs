/**
 * shuffle-quiz-options.mjs — 모든 시드의 퀴즈 선택지를 결정론적으로 셔플.
 * 문제: 정답이 거의 항상 options[0]에 작성됨(80%가 0번) → 사용자에게 "전부 1번"으로 보임.
 * 해결: slug+문항index 기반 시드RNG로 options 순서를 섞고 answerIndex를 정답이 옮겨간 위치로 재매핑.
 * 멱등성: 같은 입력이면 같은 결과(시드 고정). 정답 옵션 문자열을 추적해 위치 재계산.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "data", "seed");

function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Fisher–Yates, seeded — 인덱스 순열 반환
function shuffledOrder(n, seed) {
  const rng = mulberry32(seed);
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let books = 0, quizzes = 0, moved = 0;
const dist = {};
for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
  const path = join(DIR, file);
  const b = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(b.quiz) || b.quiz.length === 0) continue;
  let changed = false;
  b.quiz.forEach((q, qi) => {
    if (!Array.isArray(q.options) || typeof q.answerIndex !== "number") return;
    const n = q.options.length;
    if (n < 2) return;
    const order = shuffledOrder(n, hash(`${b.slug}#${qi}`));
    const newOptions = order.map((oi) => q.options[oi]);
    const newAnswer = order.indexOf(q.answerIndex); // 정답 원위치가 옮겨간 새 자리
    if (newAnswer !== q.answerIndex || order.some((v, i) => v !== i)) {
      if (newAnswer !== q.answerIndex) moved++;
      q.options = newOptions;
      q.answerIndex = newAnswer;
      changed = true;
    }
    quizzes++;
    dist[newAnswer] = (dist[newAnswer] || 0) + 1;
  });
  if (changed) { writeFileSync(path, JSON.stringify(b, null, 2) + "\n"); books++; }
}
console.log(`✅ ${books}권 수정 · ${quizzes}문항 · 정답위치 이동 ${moved}`);
console.log("새 정답 분포:", dist);
