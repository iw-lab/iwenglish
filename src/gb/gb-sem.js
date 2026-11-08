// 셈 이용권 문제 화면 — 한 문제를 조각으로 차례로 직접 친다(셈왕국 sempad.js 에서 가져옴 · 2026-11-05).
// gb-text-ok 숫자 키패드 전용 입력칸 — 읽기 전용이고 글자를 받지 않는다(키패드 숫자만 · 서버로는 숫자 배열만 간다)
// 맞히면 바로 다음 · 틀리면 흔들리고 0.6초 잠금 · 두 번 틀리면 답을 보여 주고 넘어간다(그 문제는 정답으로 안 친다).
import { mountNumpad } from './gb-numpad.js';
import { fracHTML } from './gb-frac.js';

const LOCK_MS = 600, SHOW_MS = 900;
const fmt = (n) => (n == null ? '' : Number(n).toLocaleString('ko-KR', { maximumFractionDigits: 3, useGrouping: false }));

/** → { stop(), done: Promise<{ vals: (number|null)[], stopped? }> } · vals[j] = 스스로 맞힌 값, 답을 봤으면 null */
export function playSemSteps({ list, padHost, steps, decimal = false, onRight, onWrong }) {
  const input = document.createElement('input'); input.className = 'gb-sem-in'; input.setAttribute('aria-label', '답');
  list.innerHTML = steps.map((s, i) => `<li data-i="${i}">${s.why ? `<small class="gb-sem-why">${fracHTML(s.why)}</small>` : ''}<span class="gb-sem-ex">${fracHTML(s.t)}</span><span class="gb-sem-eq">=</span><span class="gb-sem-sl"></span></li>`).join('');
  const rows = [...list.children], vals = [];
  let k = 0, miss = 0, lock = 0, alive = true, finish;
  const done = new Promise((ok) => { finish = ok; });
  const mark = () => {
    rows.forEach((r, i) => { r.className = i < k ? 'done' : i === k ? 'cur' : 'todo'; r.hidden = i > k; });
    if (k < rows.length) { const sl = rows[k].lastChild; sl.textContent = ''; sl.appendChild(input); input.value = ''; rows[k].scrollIntoView?.({ block: 'nearest' }); }
  };
  const settle = (row, v, cls) => { const sl = row.lastChild; sl.textContent = fmt(v); sl.className = `gb-sem-sl ${cls}`; };
  const advance = () => { k++; miss = 0; lock = 0; if (k >= rows.length) { alive = false; pad.destroy(); finish({ vals }); return; } mark(); };
  const pad = mountNumpad(padHost, { input, maxLength: 7, allowDecimal: decimal, okLabel: '확인', onSubmit: (v) => {
    if (!alive || performance.now() < lock || v === '') return;
    const want = steps[k].a, row = rows[k];
    if (Math.abs(Number(v) - want) < 1e-6) { settle(row, want, 'good'); vals[k] = want; onRight?.(); advance(); return; }
    miss++; const reveal = miss >= 2;
    lock = reveal ? Infinity : performance.now() + LOCK_MS;
    row.classList.remove('shake'); void row.offsetWidth; row.classList.add('shake'); input.value = ''; onWrong?.();
    if (reveal) { vals[k] = null; setTimeout(() => { if (!alive) return; settle(row, want, 'shown'); advance(); }, SHOW_MS); }
  } });
  mark();
  return { done, stop: () => { if (!alive) return; alive = false; pad.destroy(); finish({ vals, stopped: true }); } };
}
