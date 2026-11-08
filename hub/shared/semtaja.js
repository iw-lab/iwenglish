// 셈 타자 — 1~6학년 셈을 «머리로 되는 조각»으로 쪼개 연달아 친다. 조각 하나 = 셈 하나 → 분당 셈(타자의 분당 타수).
// 2026-11-03 사용자 «1~6학년까지 모든 셈하기를 최대한 쪼개서 분당 셈에 넣어 타자처럼 기록 싸움으로».
// 화면·서버가 같은 파일: 판 씨앗 seed 의 k번째 문제 = semProblem(stage, seed, k) → 서버가 똑같이 다시 만들어 조각마다 채점한다.
// 조각이 암산선 안인지는 시험(tests/semtaja.test.mjs)이 공용 판정기 _shared/mental-math.mjs 로 잰다 — 여기엔 출제 범위만 둔다.
// 조각 = { t: 글(분수 a/b · 대분수 «w n/d»), a: 답(수), op: 'add'|'sub'|'mul'|'div'|'up'(다음 십까지)|'lcm'|'gcd', x, y }
// 기준(2026-11-03 사용자 «한눈에 확 들어와야지»): 조각 하나 = 외운 사실 하나로 1~3초 — 따져 찾는 약수·배수 문제는 넣지 않는다
import { rng32, hash32 } from './rng.js';
import { splitMul } from './split.js';

const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const pick = (r, a) => a[Math.floor(r() * a.length)];
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a / gcd(a, b)) * b;
const r1 = (v) => Math.round(v * 1000) / 1000;
const S = (t, a, op, x, y) => ({ t, a: r1(a), op, x, y });
const fromMul = (st) => st.map((s) => { const [x, y] = s.text.match(/\d+/g).map(Number); return S(s.text, s.ans, s.op, x, y); });
/** «와/과» — 숫자 끝 읽기(2·4·5·9 = 와, 나머지 = 과: 이·사·오·구 / 일·삼·육·칠·팔·십·백) */
const wa = (n) => (/[2459]$/.test(String(n)) ? '와' : '과');
const ga = (n) => (/[2459]$/.test(String(n)) ? '가' : '이');
const reul = (n) => (/[2459]$/.test(String(n)) ? '를' : '을');
const fr = (n, d) => (d === 1 ? `${n}` : n > d ? `${Math.floor(n / d)} ${n % d}/${d}` : `${n}/${d}`);
/** 약분 조각(최대공약수가 1 이면 없음) → { steps, n, d } */
function reduce(n, d) { const g = gcd(n, d); if (g === 1) return { steps: [], n, d }; if (n === d) return { steps: [S(`${n}${wa(n)} ${d}의 최대공약수`, g, 'gcd', n, d), S(`${n} ÷ ${g}`, 1, 'div', n, g)], n: 1, d: 1 }; return { steps: [S(`${n}${wa(n)} ${d}의 최대공약수`, g, 'gcd', n, d), S(`${n} ÷ ${g}`, n / g, 'div', n, g), S(`${d} ÷ ${g}`, d / g, 'div', d, g)], n: n / g, d: d / g }; }
/** a/b × c/d — 곱하기 전에 엇갈려 약분(교과서 순서: 7/9 × 6/7 → 7 과 7 · 6 과 9) → 남은 수끼리 곱한다(기약분수) */
function crossMul(a, b, c, d, lead) {
  const st = [], cut = (x, y) => { const g = gcd(x, y); if (g === 1) return [x, y]; st.push(S(`${x}${wa(x)} ${y}의 최대공약수`, g, 'gcd', x, y), S(`${x} ÷ ${g}`, x / g, 'div', x, g)); if (x !== y) st.push(S(`${y} ÷ ${g}`, y / g, 'div', y, g)); return [x / g, y / g]; };   /* 같은 수끼리(9와 9)면 «9 ÷ 9» 를 두 번 묻지 않는다(2026-11-03 전수 조사) */
  let [A, D] = cut(a, d); let [C, B] = cut(c, b);
  st.push(S(`분자 ${A} × ${C}`, A * C, 'mul', A, C), S(`분모 ${B} × ${D}`, B * D, 'mul', B, D));
  return { steps: st, n: A * C, m: B * D };
}
/** 가분수 → 대분수 조각 */
function toMixed(n, d) { if (n < d || n % d === 0) return []; const w = Math.floor(n / d); if (w === 1) return [S(`${n} − ${d}`, n - d, 'sub', n, d)];   /* 왜 빼는지(«분모만큼 = 1 → 자연수»)는 이유 칸(semwhy) — «(자연수 1 남기고)» 가 무슨 뜻인지 몰랐고 두 줄로 꺾였다(2026-11-03 사용자) */   /* 1 만 넘으면 덜기만 */
  return [S(`${n} ÷ ${d}의 몫`, w, 'div', d * w, d), S(`${n} − ${d * w}`, n - d * w, 'sub', n, d * w)]; }
/** 받아올림 없는 덧셈인가(자리마다 합 ≤ 9) — 출제 범위를 고를 때만 쓴다 */
const carryFree = (a, b) => { const x = String(a), y = String(b); for (let i = 1; i <= Math.max(x.length, y.length); i++) if (Number(x[x.length - i] || 0) + Number(y[y.length - i] || 0) > 9) return false; return true; };
const borrowFree = (a, b) => { const x = String(a), y = String(b); for (let i = 1; i <= y.length; i++) if (Number(x[x.length - i] || 0) < Number(y[y.length - i])) return false; return true; };
/** a − b — 빌려 오면 백 단위를 먼저 덜고 나머지(두 자리)를 던다(216 − 160 → 216 − 100 → 116 − 60) */
function subSteps(a, b) { if (b < 100 || a < 100 || borrowFree(a, b)) return [S(`${a} − ${b}`, a - b, 'sub', a, b)]; const bh = Math.floor(b / 100) * 100, x = a - bh; return [S(`${a} − ${bh}`, x, 'sub', a, bh), S(`${x} − ${b - bh}`, x - (b - bh), 'sub', x, b - bh)]; }
/** N ÷ D = q(몫 두 자리) — 몇십 몫부터 덜고 남은 것을 나눈다(84 ÷ 3 → 3 × 20 · 84 − 60 · 24 ÷ 3 · 20 + 8) */
function divSteps(N, D, q) { const qt = Math.floor(q / 10) * 10, qo = q % 10, a1 = D * qt, rest = N - a1;
  const st = [...(mulEasy(D, qt) ? [S(`${D} × ${qt}`, a1, 'mul', D, qt)] : fromMul(splitMul(D, qt))), ...subSteps(N, a1)];
  if (qo) st.push(S(`${rest} ÷ ${D}`, qo, 'div', rest, D), S(`${qt} + ${qo}`, q, 'add', qt, qo)); return st; }
const mulEasy = (a, b) => splitMul(a, b).length === 1;
/** a × b 조각 — 구구단 넘으면 자리별로 쪼갠다(12 × 12 = 10 × 12 + 2 × 12) */
const mulSt = (a, b) => (mulEasy(a, b) ? [S(`${a} × ${b}`, a * b, 'mul', a, b)] : fromMul(splitMul(a, b)));
const sumOk = (st) => st.every((s) => s.op !== 'add' || s.x < 100 || s.y < 100 || carryFree(s.x, s.y));

/* 단계 — 학년(g)·이름·소수 입력. 타자 연습의 «자리 → 낱말 → 긴 글»처럼 학년마다 짧은 셈 → 긴 셈 */
export const SEM = {
  g1_add10: { g: 1, name: '10 만들어 더하기', ex: '8 + 5', gen(r) { const a = int(r, 2, 9), b = int(r, 11 - a, 9), c = 10 - a, rest = b - c;
    return { q: `${a} + ${b}`, steps: [S(`${a} + □ = 10`, c, 'up', 10, a), S(`${b} − ${c}`, rest, 'sub', b, c), S(`10 + ${rest}`, 10 + rest, 'add', 10, rest)] }; } },
  g1_sub10: { g: 1, name: '10 넘어 빼기', ex: '13 − 5', gen(r) { const a = int(r, 11, 18), o = a - 10, b = int(r, o + 1, 9), rest = b - o;
    return { q: `${a} − ${b}`, steps: [S(`${a} − ${o}`, 10, 'sub', a, o), S(`${b} − ${o}`, rest, 'sub', b, o), S(`10 − ${rest}`, 10 - rest, 'sub', 10, rest)] }; } },
  g2_times: { g: 2, name: '곱셈구구', ex: '7 × 8', gen(r) { const a = int(r, 2, 9), b = int(r, 2, 9); return { q: `${a} × ${b}`, steps: mulSt(a, b) }; } },
  g2_add2: { g: 2, name: '두 자리 덧셈', ex: '47 + 38', gen(r) { const a = int(r, 1, 7) * 10 + int(r, 2, 9), bo = int(r, 11 - (a % 10), 9), b = int(r, 1, Math.max(1, 8 - Math.floor(a / 10))) * 10 + bo;
    const x = a + Math.floor(b / 10) * 10, up = 10 - (x % 10), nx = x + up, rest = bo - up;
    return { q: `${a} + ${b}`, steps: [S(`${a} + ${Math.floor(b / 10) * 10}`, x, 'add', a, Math.floor(b / 10) * 10), S(`${x} + □ = ${nx}`, up, 'up', nx, x), S(`${bo} − ${up}`, rest, 'sub', bo, up), S(`${nx} + ${rest}`, nx + rest, 'add', nx, rest)] }; } },
  g2_sub2: { g: 2, name: '두 자리 뺄셈', ex: '72 − 38', gen(r) { const a = int(r, 3, 9) * 10 + int(r, 0, 7), bo = int(r, (a % 10) + 1, 9), b = int(r, 1, Math.floor(a / 10) - 2) * 10 + bo;
    const x = a - Math.floor(b / 10) * 10, o = x % 10, down = x - o, rest = bo - o;
    const first = S(`${a} − ${Math.floor(b / 10) * 10}`, x, 'sub', a, Math.floor(b / 10) * 10);
    if (!o) return { q: `${a} − ${b}`, steps: [first, S(`${x} − ${bo}`, x - bo, 'sub', x, bo)] };   /* 50 − 22: 일의 자리가 0 이면 몇십에서 바로 뺀다 — «30 − 0»·«2 − 0» 조각이 나왔다(2026-11-03 전수 조사) */
    return { q: `${a} − ${b}`, steps: [first, S(`${x} − ${o}`, down, 'sub', x, o), S(`${bo} − ${o}`, rest, 'sub', bo, o), S(`${down} − ${rest}`, down - rest, 'sub', down, rest)] }; } },
  g3_add3: { g: 3, name: '세 자리 덧셈', ex: '457 + 368', gen(r) { const ah = int(r, 1, 7), a = ah * 100 + int(r, 10, 99), b = int(r, 1, 9 - ah) * 100 + int(r, 10, 99), bh = Math.floor(b / 100) * 100, bt = Math.floor((b % 100) / 10) * 10, bo = b % 10;
    const x1 = a + bh, x2 = x1 + bt; const st = [S(`${a} + ${bh}`, x1, 'add', a, bh), S(`${x1} + ${bt}`, x2, 'add', x1, bt)]; if (bo) st.push(S(`${x2} + ${bo}`, x2 + bo, 'add', x2, bo)); return { q: `${a} + ${b}`, steps: st }; } },
  g3_sub3: { g: 3, name: '세 자리 뺄셈', ex: '742 − 368', gen(r) { const ah = int(r, 4, 9), a = ah * 100 + int(r, 0, 99), b = int(r, 1, ah - 2) * 100 + int(r, 10, 99), bh = Math.floor(b / 100) * 100, bt = Math.floor((b % 100) / 10) * 10, bo = b % 10;
    const x1 = a - bh, x2 = x1 - bt; const st = [S(`${a} − ${bh}`, x1, 'sub', a, bh), S(`${x1} − ${bt}`, x2, 'sub', x1, bt)]; if (bo) st.push(S(`${x2} − ${bo}`, x2 - bo, 'sub', x2, bo)); return { q: `${a} − ${b}`, steps: st }; } },
  g3_mul1: { g: 3, name: '몇십몇 × 몇', ex: '47 × 6', gen(r) { const a = int(r, 12, 99), b = int(r, 3, 9); return { q: `${a} × ${b}`, steps: fromMul(splitMul(a, b)) }; } },
  g3_div: { g: 3, name: '나눗셈(몫 두 자리)', ex: '84 ÷ 3', gen(r) { const d = int(r, 2, 9), q = (() => { for (;;) { const v = int(r, 12, 39); if (v % 10) return v; } })(); return { q: `${d * q} ÷ ${d}`, steps: divSteps(d * q, d, q) }; } },
  g3_mul2: { g: 3, name: '두 자리 × 두 자리', ex: '27 × 14', gen(r) { const a = int(r, 13, 39), b = int(r, 11, 19); return { q: `${a} × ${b}`, steps: fromMul(splitMul(a, b)) }; } },
  g4_mul3: { g: 4, name: '세 자리 × 두 자리', ex: '213 × 24', gen(r) { for (;;) { const a = int(r, 101, 499), b = int(r, 11, 29), st = fromMul(splitMul(a, b)); if (sumOk(st)) return { q: `${a} × ${b}`, steps: st }; } } },
  g4_div2: { g: 4, name: '몇십으로 나누기', ex: '560 ÷ 40', gen(r) { let d, q; do { d = pick(r, [11, 12, 20, 30, 40, 50, 60, 70, 80, 90]); q = int(r, 12, 29); } while (q % 10 === 0 || (d % 10 && (d * (q % 10)) % 10 === 0)); const T = d * q;   /* 몫 끝자리 0·«60 ÷ 12» 꼴(0 을 떼면 6 ÷ 12)은 다시 뽑는다 */
    /* 몇십으로 나누면 0을 하나씩 지운다(1440 ÷ 90 = 144 ÷ 9) → 몫 두 자리 나눗셈과 같은 조각 */
    const [N, D, pre] = d % 10 ? [T, d, []] : [T / 10, d / 10, [S(`${T} ÷ ${d} = □ ÷ ${d / 10}`, T / 10, 'div', T, 10)]];
    return { q: `${T} ÷ ${d}`, steps: [...pre, ...divSteps(N, D, q)] }; } },
  g4_frac: { g: 4, name: '분모 같은 분수 더하기', ex: '2 3/5 + 1 4/5', gen(r) { const d = int(r, 3, 9), w1 = int(r, 1, 5), w2 = int(r, 1, 4), n1 = int(r, 1, d - 1), n2 = int(r, 1, d - 1), n = n1 + n2, W = w1 + w2;
    const st = [S(`${w1} + ${w2}`, W, 'add', w1, w2), S(`${n1}/${d} + ${n2}/${d}의 분자`, n, 'add', n1, n2)]; if (n >= d) st.push(S(`${n} − ${d}`, n - d, 'sub', n, d), S(`${W} + 1`, W + 1, 'add', W, 1));
    return { q: `${w1} ${n1}/${d} + ${w2} ${n2}/${d}`, steps: st }; } },
  g4_dec: { g: 4, name: '소수 더하기·빼기', ex: '3.7 + 2.5', dec: true, gen(r) { let a, b; do { a = int(r, 11, 89) / 10; b = int(r, 11, 49) / 10; } while (a % 1 === 0 || b % 1 === 0);   /* 7.0 → «7 + 2» 처럼 소수 없는 문제가 나왔다(2026-11-03) */
    const ai = Math.floor(a), bi = Math.floor(b), af = r1(a - ai), bf = r1(b - bi);
    if (r() < 0.5) return { q: `${a} + ${b}`, steps: [S(`${ai} + ${bi}`, ai + bi, 'add', ai, bi), S(`${af} + ${bf}`, af + bf, 'add', af, bf), S(`${ai + bi} + ${r1(af + bf)}`, a + b, 'add', ai + bi, r1(af + bf))] };
    const [x, y] = a > b ? [a, b] : [b, a], yi = Math.floor(y), yf = r1(y - yi); return { q: `${x} − ${y}`, steps: [S(`${x} − ${yi}`, x - yi, 'sub', x, yi), S(`${r1(x - yi)} − ${yf}`, x - y, 'sub', r1(x - yi), yf)] }; } },
  g5_mix: { g: 5, name: '혼합 계산', ex: '36 − 4 × 5 + 8', gen(r) { const k = int(r, 0, 2);
    if (k === 0) { const b = int(r, 2, 9), c = int(r, 2, 9), a = int(r, b * c + 1, 99), d = int(r, 2, 9), m = b * c; return { q: `${a} − ${b} × ${c} + ${d}`, steps: [S(`${b} × ${c}`, m, 'mul', b, c), S(`${a} − ${m}`, a - m, 'sub', a, m), S(`${a - m} + ${d}`, a - m + d, 'add', a - m, d)] }; }
    if (k === 1) { const a = int(r, 2, 6), b = int(r, 1, 9 - a), c = int(r, 2, 9); return { q: `(${a} + ${b}) × ${c}`, steps: [S(`${a} + ${b}`, a + b, 'add', a, b), S(`${a + b} × ${c}`, (a + b) * c, 'mul', a + b, c)] }; }
    const c = int(r, 2, 9), q = int(r, 2, 9), b = c * q, d = int(r, 2, 5), a = int(r, 10, 60); return { q: `${a} + ${b} ÷ ${c} × ${d}`, steps: [S(`${b} ÷ ${c}`, q, 'div', b, c), S(`${q} × ${d}`, q * d, 'mul', q, d), S(`${a} + ${q * d}`, a + q * d, 'add', a, q * d)] }; } },
  g5_lcd: { g: 5, name: '통분해 더하기', ex: '2/3 + 1/4', gen(r) { for (;;) { const b = int(r, 2, 9), d = int(r, 2, 9); if (b === d) continue; if (gcd(b, d) !== 1) continue; const L = b * d;   /* 한눈에 — 서로소끼리만(최소공배수 = 구구단 한 번 · 2026-11-03 «약수·배수도 한눈에 들어와야지») */ const a = int(r, 1, b - 1), c = int(r, 1, d - 1); if (gcd(a, b) > 1 || gcd(c, d) > 1) continue;
    const x = a * (L / b), y = c * (L / d), n = x + y, st = [S(`${b}${wa(b)} ${d}의 최소공배수`, L, 'lcm', b, d), S(`${L} ÷ ${b}`, L / b, 'div', L, b), S(`${a} × ${L / b}`, x, 'mul', a, L / b), S(`${L} ÷ ${d}`, L / d, 'div', L, d), S(`${c} × ${L / d}`, y, 'mul', c, L / d), S(`${x} + ${y}`, n, 'add', x, y)];   /* 한 칸 = 셈 한 번 — «5/7 = □/21» 은 21÷7 과 5×3 을 한 칸에 묶었다(2026-11-05 사용자 «이런거 더 나눠야지») */
    const R = reduce(n, L); st.push(...R.steps, ...toMixed(R.n, R.d)); return { q: `${a}/${b} + ${c}/${d}`, steps: st }; } } },
  g5_fmul: { g: 5, name: '분수의 곱셈', ex: '2/3 × 9/10', gen(r) { for (;;) { const a = int(r, 1, 8), b = int(r, a + 1, 9), c = int(r, 1, 8), d = int(r, c + 1, 9); if (gcd(a, b) > 1 || gcd(c, d) > 1) continue; if (gcd(a, d) === 1 && gcd(c, b) === 1 && r() < 0.7) continue;
    const X = crossMul(a, b, c, d); return { q: `${a}/${b} × ${c}/${d}`, steps: X.steps }; } } },
  g5_dmul: { g: 5, name: '소수의 곱셈', ex: '2.4 × 3', dec: true, gen(r) { if (r() < 0.5) { const a = int(r, 2, 9), b = int(r, 2, 9); return { q: `0.${a} × 0.${b}`, steps: [S(`${a} × ${b}`, a * b, 'mul', a, b), S(`${a * b} ÷ 100`, (a * b) / 100, 'div', a * b, 100)] }; }
    let A; do A = int(r, 12, 49); while (A % 10 === 0);   /* 20 → «2 × 4» 에 20 × 4 ÷ 10 이 붙었다(2026-11-03 사용자 스샷) */
    const b = int(r, 3, 9), st = fromMul(splitMul(A, b)), p = A * b; st.push(S(`${p} ÷ 10`, p / 10, 'div', p, 10)); return { q: `${A / 10} × ${b}`, steps: st }; } },
  g6_fdiv: { g: 6, name: '분수의 나눗셈', ex: '3/4 ÷ 2/5', gen(r) { for (;;) { const a = int(r, 1, 8), b = int(r, a + 1, 9), c = int(r, 1, 8), d = int(r, c + 1, 9); if (gcd(a, b) > 1 || gcd(c, d) > 1 || a * d === b * c) continue;
    const X = crossMul(a, b, d, c, `${a}/${b} ÷ ${c}/${d} = ${a}/${b} × ${d}/${c}`); if (X.m > 12 && X.n >= 2 * X.m) continue;   /* 큰 분모로 몫 두 번 이상 = 종이 */ return { q: `${a}/${b} ÷ ${c}/${d}`, steps: [...X.steps, ...toMixed(X.n, X.m)] }; } } },
  g6_ddiv: { g: 6, name: '소수의 나눗셈', ex: '8.4 ÷ 4', dec: true, gen(r) { let d, q, N; do { d = int(r, 2, 9); q = pick(r, [int(r, 11, 12), int(r, 2, 9), int(r, 1, 3) * 10 + int(r, 1, 3)]); N = d * q; } while (N % 10 === 0);   /* 몫이 몇십이면 «28 ÷ 4» 에 280 ÷ 4 가 붙었다 — 셋 중 하나가 늘 그랬다(2026-11-03) */
    return { q: `${N / 10} ÷ ${d}`, steps: [S(`${N} ÷ ${d}`, q, 'div', N, d), S(`${q} ÷ 10`, q / 10, 'div', q, 10)] }; } },
  g6_ratio: { g: 6, name: '비례식', ex: '3 : 5 = 12 : □', gen(r) { const a = int(r, 2, 9), b = int(r, 2, 9), k = int(r, 2, 9); return { q: `${a} : ${b} = ${a * k} : □`, steps: [S(`${a * k} ÷ ${a}`, k, 'div', a * k, a), S(`${b} × ${k}`, b * k, 'mul', b, k)] }; } },
  /* ── 개념 단계 — 답이 숫자 하나 · 외운 사실 하나로 1~3초(2026-11-03 «개념 단계도 넣어줘» · «한눈에 확 들어와야지») ── */
  k2_time: { g: 2, name: '시간 바꾸기', ex: '1시간 25분 = □분', kind: '개념', gen(r) { const h = int(r, 1, 3), m = int(r, 5, 55);
    return { q: `${h}시간 ${m}분 = □분`, steps: [S(`${h}시간 = □분`, 60 * h, 'mul', 60, h), S(`${60 * h} + ${m}`, 60 * h + m, 'add', 60 * h, m)] }; } },
  k2_cm: { g: 2, name: 'm와 cm', ex: '3m 45cm = □cm', kind: '개념', gen(r) { const m = int(r, 1, 9), c = int(r, 1, 99);
    return { q: `${m}m ${c}cm = □cm`, steps: [S(`${m}m = □cm`, 100 * m, 'mul', 100, m), S(`${100 * m} + ${c}`, 100 * m + c, 'add', 100 * m, c)] }; } },
  k3_unit: { g: 3, name: '단위 바꾸기', ex: '2km 300m = □m', kind: '개념', gen(r) { const [U, u, f] = pick(r, [['km', 'm', 1000], ['L', 'mL', 1000], ['kg', 'g', 1000], ['cm', 'mm', 10]]), a = int(r, 1, 9), b = f === 10 ? int(r, 1, 9) : int(r, 1, 9) * pick(r, [1, 10, 100]);
    return { q: `${a}${U} ${b}${u} = □${u}`, steps: [S(`${a}${U} = □${u}`, a * f, 'mul', f, a), S(`${a * f} + ${b}`, a * f + b, 'add', a * f, b)] }; } },
  k4_angle: { g: 4, name: '각도(삼각형·직선)', ex: '50° + 60° + □ = 180°', kind: '개념', gen(r) {
    if (r() < 0.3) { const x = int(r, 2, 17) * 10; return { q: `직선 위 한 각이 ${x}°, 나머지 각은?`, steps: [S(`180 − ${x}`, 180 - x, 'sub', 180, x)] }; }
    for (;;) { const x = int(r, 4, 18) * 5, y = int(r, 4, 18) * 5, z = 180 - x - y; if (z < 10 || (x + y) % 10) continue;
      return { q: `삼각형의 두 각이 ${x}°, ${y}° — 나머지 각은?`, steps: [S(`${x} + ${y}`, x + y, 'add', x, y), S(`180 − ${x + y}`, z, 'sub', 180, x + y)] }; } } },
  k4_place: { g: 4, name: '소수의 자릿값', ex: '3.07에서 7이 나타내는 수', kind: '개념', dec: true, gen(r) { const w = int(r, 1, 9), d1 = int(r, 0, 9), d2 = int(r, 1, 9), n = `${w}.${d1}${d2}`, at2 = d1 === 0 || r() < 0.5;
    const d = at2 ? d2 : d1, v = at2 ? d2 / 100 : d1 / 10; return { q: `${n}에서 ${at2 ? '오른쪽 끝' : '소수 첫째 자리'} 숫자 ${d}${ga(d)} 나타내는 수`, steps: [S(`${d} × ${at2 ? '0.01' : '0.1'}`, v, 'place', d, at2 ? 2 : 1)] }; } },
  k4_perim: { g: 4, name: '둘레', ex: '한 변 7cm 정사각형', kind: '개념', gen(r) { const k = int(r, 0, 2);
    if (k === 0) { const a = int(r, 3, 12); return { q: `한 변이 ${a}cm인 정사각형의 둘레(cm)`, steps: [S(`4 × ${a}`, 4 * a, 'mul', 4, a)] }; }
    if (k === 1) { const a = int(r, 3, 12); return { q: `한 변이 ${a}cm인 정삼각형의 둘레(cm)`, steps: [S(`3 × ${a}`, 3 * a, 'mul', 3, a)] }; }
    for (;;) { const a = int(r, 3, 9), b = int(r, 2, a); if (!mulEasy(a + b, 2)) continue; return { q: `가로 ${a}cm, 세로 ${b}cm인 직사각형의 둘레(cm)`, steps: [S(`${a} + ${b}`, a + b, 'add', a, b), S(`${a + b} × 2`, (a + b) * 2, 'mul', a + b, 2)] }; } } },
  k5_round: { g: 5, name: '반올림', ex: '1350 → 백의 자리', kind: '개념', gen(r) { const n = int(r, 1001, 9998), [P, nm, low] = pick(r, [[10, '십', '일'], [100, '백', '십'], [1000, '천', '백']]), dig = Math.floor(n / (P / 10)) % 10, v = Math.round(n / P) * P;
    if (n % P === 0 || (dig >= 5 && Math.floor(n / P) % 10 === 9)) return SEM.k5_round.gen(r);   /* 2995 → 3000 처럼 올림이 번지는 수는 빼고(한눈에) */ return { q: `${n}${reul(n)} ${nm}의 자리까지 반올림`, steps: [S(`${low}의 자리 숫자`, dig, 'digit', n, P / 10), S(`반올림한 수`, v, 'round', n, P)] }; } },
  k5_area: { g: 5, name: '넓이', ex: '밑변 8cm 높이 5cm 삼각형', kind: '개념', gen(r) {
    if (r() < 0.5) { const a = int(r, 2, 12), b = int(r, 2, 12), nm = pick(r, ['직사각형(가로·세로)', '평행사변형(밑변·높이)']); return { q: `${nm} ${a}cm, ${b}cm의 넓이(cm²)`, steps: mulSt(a, b) }; }
    const b = int(r, 2, 12), h = int(r, 2, 12); if ((b * h) % 2) return SEM.k5_area.gen(r); return { q: `밑변 ${b}cm, 높이 ${h}cm인 삼각형의 넓이(cm²)`, steps: [...mulSt(b, h), S(`${b * h} ÷ 2`, (b * h) / 2, 'div', b * h, 2)] }; } },
  k6_pct: { g: 6, name: '백분율·할인', ex: '300원의 20%', kind: '개념', gen(r) { for (;;) { const P = int(r, 2, 9) * pick(r, [10, 100]), pct = pick(r, [10, 20, 25, 50]), sale = r() < 0.4;
    const st = pct === 10 ? [S(`${P} ÷ 10`, P / 10, 'div', P, 10)] : pct === 20 ? [S(`${P} ÷ 10`, P / 10, 'div', P, 10), S(`${P / 10} × 2`, (P / 10) * 2, 'mul', P / 10, 2)] : [S(`${P} ÷ ${pct === 25 ? 4 : 2}`, (P * pct) / 100, 'div', P, pct === 25 ? 4 : 2)];
    const v = (P * pct) / 100; if (!Number.isInteger(v) || (pct === 20 && !mulEasy(P / 10, 2)) || (pct === 25 && P % 40) || (sale && v >= 100 && !borrowFree(P, v))) continue;   /* 25% = 40·400의 배수만(÷4 가 한눈에) · 깎은 값 빼기도 한눈에 */
    if (sale) st.push(S(`${P} − ${v}`, P - v, 'sub', P, v)); return { q: sale ? `${P}원짜리를 ${pct}% 깎아 주면 얼마?` : `${P}의 ${pct}%`, steps: st }; } } },
  k6_vol: { g: 6, name: '직육면체 부피', ex: '2cm × 3cm × 4cm', kind: '개념', gen(r) { for (;;) { const a = int(r, 2, 6), b = int(r, 2, 6), c = int(r, 2, 9); if (!mulEasy(a * b, c)) continue;
    return { q: `가로 ${a}cm, 세로 ${b}cm, 높이 ${c}cm 직육면체의 부피(cm³)`, steps: [S(`${a} × ${b}`, a * b, 'mul', a, b), S(`${a * b} × ${c}`, a * b * c, 'mul', a * b, c)] }; } } },
};
export const SEM_IDS = Object.keys(SEM);
/** 문제 만들기 판본 — 단계·조각 규칙을 바꾸면 올린다(서버와 다르면 화면이 새로고침) */
export const SEM_VER = 's4';   /* s4 = 구구단 넘는 곱은 쪼갠다(12 × 12 · 2026-11-04) */   /* s2 = 소수 단계가 소수 없는 문제를 내던 것 고침(2026-11-03) */
/** 학년이 풀 수 있는 단계(그 학년까지) */
export const semFor = (grade) => SEM_IDS.filter((id) => SEM[id].g <= Math.max(1, Math.min(6, Number(grade) || 5)));
/** 판 씨앗 seed 의 k번째 문제 — 같은 (stage, seed, k) 면 어디서나 같다 */
export function semProblem(stage, seed, k) {
  const s = SEM[stage]; if (!s) return null;
  const r = rng32(hash32(`sem:${stage}:${seed >>> 0}:${k}`)), p = s.gen(r);
  return { q: p.q, steps: p.steps, ans: p.steps.at(-1).a };
}
export const SEM_SAME = (a, b) => { const x = Number(a), y = Number(b); return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) < 1e-6; };
export { fr as semFrac };

/* ── 서버 채점(셈 타자 한 판) — 타자왕국 판 영수증 방식 ──
   log = [[k, j, a, ms], …] 시도 차례대로(k 문제 · j 조각 · a 답 · ms 앞 시도 뒤 걸린 시간). 화면 규칙과 같다: 맞으면 다음 조각 · 두 번 틀리면 답 보고 다음 조각 */
export const SEMV = { MIN_GAP: 100, RUN_MS: 60000, SKEW: 2500, MIN_ACC_REC: 90, MIN_ACC: 85, HUMAN_CPM: 150, HUMAN_KPM: 480, ROBOT_CV: 0.08, MAX_LOG: 600, PROBLEMS_CAP: 40 };
export function semGrade(stage, seed, log, elapsed) {
  if (!SEM[stage]) return { ok: false, why: 'stage' };
  if (!Array.isArray(log) || log.length > SEMV.MAX_LOG) return { ok: false, why: 'log' };
  let k = 0, j = 0, miss = 0, right = 0, n = 0, keys = 0, sum = 0, done = 0, clean = true; let p = semProblem(stage, seed, 0); const gaps = [];
  for (const e of log) {
    if (!Array.isArray(e) || e.length !== 4) return { ok: false, why: 'log' };
    const [ek, ej, a, ms] = e.map(Number);
    if (ek !== k || ej !== j || !Number.isFinite(ms) || ms > SEMV.RUN_MS) return { ok: false, why: 'order' };
    if (ms < SEMV.MIN_GAP) return { ok: false, why: 'fast' };   /* 0.1초 안의 다음 시도 = 사람 손 아님(8way R13 — ms 0 으로 로봇 박자 검사 피하기) */
    sum += ms; if (sum > SEMV.RUN_MS + SEMV.SKEW) return { ok: false, why: 'long' };
    n++; gaps.push(ms); const st = p.steps[j];
    if (SEM_SAME(a, st.a)) { right++; keys += String(st.a).length + 1; miss = 0; j++; }
    else { if (++miss >= 2) { miss = 0; j++; clean = false; } }
    if (j >= p.steps.length) { if (clean) done++; clean = true; k++; j = 0; p = semProblem(stage, seed, k); }   /* 끝낸 문제 = 조각을 다 제 손으로 맞힌 것만(두 번 틀려 넘긴 문제로 금고를 채우던 구멍 · R13) */
  }
  if (elapsed != null && sum > elapsed + SEMV.SKEW) return { ok: false, why: 'clock' };
  const acc = n ? Math.round((right / n) * 100) : 0, cpm = right;   /* 1분 판 — 맞힌 조각 수 = 분당 셈 */
  const mean = gaps.length ? gaps.reduce((x, y) => x + y, 0) / gaps.length : 0, sd = gaps.length ? Math.sqrt(gaps.reduce((x, y) => x + (y - mean) ** 2, 0) / gaps.length) : 0;
  const hold = n > 20 && mean > 0 && sd / mean < SEMV.ROBOT_CV ? 'robot' : cpm > SEMV.HUMAN_CPM || keys > SEMV.HUMAN_KPM ? 'fast' : null;
  return { ok: true, cpm, acc, right, n, done: Math.min(SEMV.PROBLEMS_CAP, done), keys, hold };
}
