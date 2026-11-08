// 셈 이용권 묶음 — 보기 고르기 대신 조각으로 쪼개 직접 입력한다(2026-11-05 사용자 «수학문제는 셈왕국처럼 · 실제로 연산이라도 도움되게 · 문제는 셈으로만, 범위를 좁혀서»).
// 문제 = semtaja.js(셈왕국 정본 사본). 범위 = 그 학년의 «g» 연산 단계만(시간·단위·넓이 같은 k 단계 제외).
// 답은 묶음에 실려 간다 — 조각마다 바로 맞고 틀림을 보여 주면서 서버를 부르지 않기 위해서다(서버비 원칙). 계산식은 어차피 프로그램이 바로 풀 수 있어 봉인이 막는 게 없다.
// 점수의 뿌리는 그대로 서버 채점 · 한 번만 쓰는 pid · 조각당 최소 시간.
import { SEM, SEM_IDS, semProblem } from './semtaja.js';
import { whyOf } from './semwhy.js';
import { finalAnswer } from './semform.js';
import { hash32, rng32 } from './rng.js';

export const SEM_Q = 3;           // 한 묶음 3문제 — 조각 ≤ 18개, 게임 앞 관문이 1분을 넘지 않게
export const SEM_PASS = 2;        // 답을 안 보고 끝낸 문제 2개면 이용권
export const SEM_MAX_STEPS = 6;   // 한 문제 조각 상한(세 자리 × 두 자리가 11조각까지 나온다)

export const semStagesOf = (grade) => SEM_IDS.filter((id) => id.startsWith('g') && SEM[id].g === grade);

export function makeSemPack(seed, grade) {
  grade = Math.max(1, Math.min(6, Math.round(Number(grade) || 3)));
  const r = rng32(hash32(`sempack:${seed >>> 0}:${grade}`) || 1), ids = semStagesOf(grade), deck = [];
  while (deck.length < SEM_Q) { const a = [...ids]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } deck.push(...a); }
  const seen = new Set(), qs = [];
  for (let i = 0; i < SEM_Q; i++) {
    const stage = deck[i];
    let p = null;
    for (let k = 0; k < 400; k++) { const c = semProblem(stage, seed >>> 0, i * 1000 + k); if (c.steps.length <= SEM_MAX_STEPS && !seen.has(c.q)) { p = c; break; } }
    if (!p) throw new Error(`sempack: ${stage} 에 맞는 문제 없음`);
    seen.add(p.q);
    const whys = whyOf(stage, p);
    qs.push({ q: p.q, dec: !!SEM[stage].dec, final: finalAnswer(p.q, p.steps), steps: p.steps.map((s, j) => ({ t: String(s.t), a: s.a, why: whys[j] || '' })) });
  }
  return qs;
}
/** 서버 채점 — 조각을 모두 스스로 맞힌 문제만 정답(답을 본 조각은 null) */
export function gradeSem(want, got) {
  const right = want.map((row, i) => row.every((a, j) => { const v = Array.isArray(got?.[i]) ? got[i][j] : null; return typeof v === 'number' && Math.abs(v - a) < 1e-6; }));
  const correct = right.filter(Boolean).length;
  return { right, correct, passed: correct >= SEM_PASS };
}
