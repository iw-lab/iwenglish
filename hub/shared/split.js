// 쪼개 셈 — 공책이 필요한 큰 셈을 «머리로 되는 조각»으로 나눠 연달아 친다. 조각 하나 = 셈 하나 → 타자의 분당 타수처럼 «분당 셈»으로 잰다
// (2026-11-03 사용자 «연산도 타자처럼 — 공책에 풀어야 해서 좀…» · «쪼개 셈을 하는데 그걸 분당 셈수로 보여 달라»).
// 조각마다 암산선 안인지는 시험(tests/split.test.mjs)이 공용 판정기 _shared/mental-math.mjs 로 잰다 — 여기엔 판정기를 베끼지 않는다.
// 조각 = { text, ans, op } · 마지막 조각의 답 = 원래 답(서버는 최종 답만 채점 — 조각은 화면 도움).

const placeParts = (n) => { const s = String(n), out = []; for (let i = 0; i < s.length; i++) { const d = Number(s[i]); if (d) out.push(d * 10 ** (s.length - 1 - i)); } return out.length ? out : [0]; };
const lead = (n) => Number(String(n).replace(/0+$/, '') || 0);   /* 끝의 0 을 뗀 수 — 160 → 16 */
/** a × b 를 한 번에 해도 되나(0 을 뗀 뒤 한쪽이 1 · 둘 다 12 이하 · 한 자리 곱에 자리마다 받아올림 없음) */
function easyMul(a, b) {
  const [x, y] = [lead(a), lead(b)].sort((p, q) => q - p);
  if (!x || !y || y === 1 || (x <= 9 && y <= 9)) return true;   /* 구구단은 9단까지 — 12 단까지 «한눈» 으로 쳐서 넓이 «12 × 12» 를 한 조각으로 냈다(2026-11-04 사용자 «12곱하기 12도 쪼개줘야지 · 전체 검사») */
  if (y > 9) return false;
  return [...String(x)].every((c) => Number(c) * y <= 9);
}
/** T ÷ q 를 머리로 하나(몫 12 이하 · 한 자리로 딱 나뉘고 몫 두 자리 이하) — 아니면 장부는 «한 개 값» 꼴을 내지 않는다 */
export function easyDiv(T, q) { const u = T / q; return Number.isInteger(u) && ((q <= 12 && u <= 12) || (q <= 9 && u < 100) || q === 1); }
/** 앞에서부터 차례로 더한다(«지금까지 합») */
function withSums(parts) {
  const out = [...parts]; let acc = parts[0].ans;
  for (let k = 1; k < parts.length; k++) { const v = acc + parts[k].ans; out.push({ text: `${acc} + ${parts[k].ans}`, ans: v, op: 'add' }); acc = v; }
  return out;
}
/** 곱셈 q × u → 조각들(쉬우면 한 조각). 자리가 많은 쪽을 통째로 두고 다른 쪽을 자리별로, 그래도 어려우면 둘 다 자리별로 */
export function splitMul(q, u) {
  if (easyMul(q, u)) return [{ text: `${q} × ${u}`, ans: q * u, op: 'mul' }];
  const [big, small] = String(q).length >= String(u).length ? [q, u] : [u, q];
  const prods = [];
  for (const P of placeParts(small)) {
    if (easyMul(big, P)) prods.push({ text: `${big} × ${P}`, ans: big * P, op: 'mul' });
    else for (const B of placeParts(big)) prods.push({ text: `${B} × ${P}`, ans: B * P, op: 'mul' });
  }
  return withSums(prods);
}
/** 거스름돈 = 세어 올리기(272 → 280 → 300 : 8 + 20 = 28) · pay ≥ T */
export function splitChange(pay, T) {
  if (!(Number.isFinite(pay) && Number.isFinite(T)) || pay <= T || pay > 1e9) return [{ text: `${pay} − ${T}`, ans: pay - T, op: 'sub' }];   /* 이상한 값 = 한 조각(8way R12 — 아주 큰 수에서 무한 반복) */
  const hops = []; let at = T;
  for (let p = 10; at < pay && p <= pay * 10; p *= 10) { const nx = Math.min(pay, Math.ceil(at / p) * p); if (nx > at) { hops.push({ from: at, to: nx }); at = nx; } }
  if (at < pay) hops.push({ from: at, to: pay });
  return withSums(hops.map((h) => ({ text: `${h.from}에서 ${h.to}까지`, ans: h.to - h.from, op: 'up', a: h.to, b: h.from })));
}
