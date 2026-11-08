// 셈 판 위 «진짜 식» — 조각들을 거꾸로 엮어 풀어 쓴 식(26 × 6 → 20 × 6 + 6 × 6)을 만들고,
// 지금 푸는 조각을 그 식 안에서 가리키며, 맞힌 조각은 값으로 바꿔 식이 줄어들게 한다(2026-11-03 사용자 «문제 푸는 순서를 위에 진짜 식에서 보여줘»).
// 순수 함수 — 화면·시험이 같이 쓴다. 엮을 수 없는 단계(□·분수 설명·개념 문장)는 null(화면은 원래 식만).
const SYM = { add: '+', sub: '−', mul: '×', div: '÷' };
const PREC = { add: 1, sub: 1, mul: 2, div: 2 };
const near = (a, b) => Math.abs(a - b) < 1e-9;
const num = (v) => String(Math.round(v * 1e6) / 1e6);
const calc = (op, l, r) => (op === 'add' ? l + r : op === 'sub' ? l - r : op === 'mul' ? l * r : l / r);

/** 조각 → 식 나무. 조각 i 의 x·y 가 앞 조각의 답이면 그 조각을 가지로(가장 최근 것부터) · 모든 조각이 한 나무로 묶이고 값이 맞을 때만 */
export function buildForm(steps) {
  if (!Array.isArray(steps) || !steps.length) return null;
  const nodes = [], used = new Set();
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (!SYM[s.op] || !Number.isFinite(s.x) || !Number.isFinite(s.y)) return null;
    if (String(s.t).replace(/\s+/g, ' ').trim() !== `${num(s.x)} ${SYM[s.op]} ${num(s.y)}`) return null;   /* 조각 글이 «수 연산 수» 그대로일 때만 */
    const pick = (v) => { for (let j = i - 1; j >= 0; j--) if (!used.has(j) && near(steps[j].a, v)) { used.add(j); return nodes[j]; } return { v }; };
    const l = pick(s.x), r = pick(s.y);
    nodes.push({ i, op: s.op, l, r });
  }
  if (used.size !== steps.length - 1) return null;   /* 한 나무가 아니다(따로 노는 조각) */
  const root = nodes[steps.length - 1], ev = (n) => (n.v != null ? n.v : calc(n.op, ev(n.l), ev(n.r)));
  if (!near(ev(root), steps[steps.length - 1].a)) return null;
  return root;
}
/** 식 그리기 — done = 맞혔거나 답을 본 조각 번호들(값으로 바뀐다) · cur = 지금 조각(감싼다) · wrap(글, 지금?) 으로 꾸민다 */
export function renderForm(root, { done = new Set(), cur = -1, steps = [], wrap = (t) => t } = {}) {
  const go = (n, parentOp, side) => {
    if (n.v != null) return { t: num(n.v), p: 9 };
    if (done.has(n.i)) return { t: num(steps[n.i].a), p: 9 };
    const L = go(n.l, n.op, 'l'), R = go(n.r, n.op, 'r'), p = PREC[n.op];
    const rop = n.r.v == null && !done.has(n.r.i) ? n.r.op : null;   /* 오른쪽 묶음은 같은 연산끼리(+ 안의 +, × 안의 ×)만 괄호 없이 — «9 × 8 ÷ 2» 가 9 × 8 부터로 읽혔다 */
    const lt = L.p < p ? `(${L.t})` : L.t, rt = R.p < p || (R.p === p && rop !== n.op) || (R.p === p && (n.op === 'sub' || n.op === 'div')) ? `(${R.t})` : R.t;
    let t = `${lt} ${SYM[n.op]} ${rt}`;
    if (n.i === cur) t = wrap(t, true);
    void parentOp; void side;
    return { t, p };
  };
  return go(root).t;
}
/** 원래 식과 풀어 쓴 식이 같은 모양인가(혼합 계산·구구단 — 그때는 원래 식 자리에서 바로 줄여 간다) */
export const sameAsQ = (root, q, steps) => renderForm(root, { steps }).replace(/\s+/g, '') === String(q).replace(/\s+/g, '');
/** 화면이 쓰는 입구 — 엮이고, 어느 순간에도 아직 안 푼 조각의 답이 식에 미리 보이지 않을 때만(값이 같은 조각이 여럿이면 엉뚱하게 엮여 답이 샜다 · g4_mul3) */
export function safeForm(q, steps) {
  const root = buildForm(steps); if (!root) return null;
  const qNums = new Set(String(q).match(/\d+(\.\d+)?/g) || []), done = new Set();
  for (let j = 0; j < steps.length; j++) {
    const toks = new Set(renderForm(root, { done, cur: j, steps }).match(/\d+(\.\d+)?/g) || []);
    for (let k = j; k < steps.length; k++) { const a = num(steps[k].a); if (toks.has(a) && !qNums.has(a) && !steps.slice(0, k + 1).some((x) => num(x.x) === a || num(x.y) === a)) return null; }
    done.add(j);
  }
  return root;
}
/** 문제 전체의 진짜 답(글) — 분수 문제는 원래 식을 직접 계산해 기약·대분수로(«5/7 + 1/9 = 1 17/63»), 나머지는 마지막 조각 값.
 *  분수 단계의 마지막 조각은 분자 같은 조각 값이라 전체 답이 한 번도 안 나왔다(2026-11-03 사용자 «마지막 계산에서 실제 답을 보여줘야지») */
const G = (a, b) => (b ? G(b, a % b) : Math.abs(a));
export function finalAnswer(q, steps) {
  const FR = String.raw`(?:(\d+) )?(\d+)\/(\d+)`, m = String(q).match(new RegExp(`^${FR} ([+−×÷]) ${FR}$`));
  if (!m) return num(steps[steps.length - 1].a);
  const fr = (w, n, d) => [(Number(w || 0) * Number(d)) + Number(n), Number(d)];
  const [a, b] = fr(m[1], m[2], m[3]), [c, d] = fr(m[5], m[6], m[7]), op = m[4];
  let n = op === '+' ? a * d + c * b : op === '−' ? a * d - c * b : op === '×' ? a * c : a * d, den = op === '+' || op === '−' ? b * d : op === '×' ? b * d : b * c;
  const g = G(n, den) || 1; n /= g; den /= g;
  if (den === 1) return String(n);
  const W = Math.floor(n / den), r = n % den;
  return W ? `${W} ${r}/${den}` : `${r}/${den}`;
}
