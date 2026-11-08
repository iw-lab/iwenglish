// @gb-numpad v1 — 숫자 답은 «화면 숫자 키패드»로 받는다. 휴대폰 시스템 키보드를 띄우지 않는다.
// 정본 = ~/.claude/skills/game-builder/kit/numpad/numpad.js — 게임마다 복사해 쓴다(내용 수정 금지).
// 🔒 tools/check-numpad.mjs 가 «숫자 입력칸이 있는데 이 키패드를 안 붙인» 프로젝트를 FAIL 시킨다.
// 왜: 시스템 키보드가 문제·보기를 가리고, 전체화면이 풀리고, 기종마다 숫자 자판이 다르다(2026-10-12 사용자 «숫자키 게임화면에 박아»).
//
//   const pad = mountNumpad(host, { input, maxLength: 4, onSubmit: (value) => ... });
//   pad.clear() · pad.setMax(n) · pad.destroy()
//   - input 은 «보이는 칸»으로만 쓴다(readOnly + inputmode=none — 탭해도 시스템 키보드가 안 뜬다)
//   - 실제 키보드(PC)의 0~9 · Backspace · Enter 도 그대로 받는다(키패드가 화면에 보일 때만)
//   - 누르는 곳 ≥ 56px · pointerdown 즉시 반응 · 두 번 탭 확대 막음(touch-action: manipulation)
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];
// 소수 답(과학 측정값 0.45 s 등) — allowDecimal 이면 «.» 키를 0 왼쪽에 넣고 지우기는 맨 아래 줄 끝으로(4열 아님 — 3열 유지)
const KEYS_DEC = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del', 'ok'];
// 음수 답(헤스 법칙 ΔH −57 kJ 등) — allowNegative 면 «±»(부호 바꾸기) 키를 화면에 둔다. 예전엔 PC 키보드 «-»만 받아 터치 사용자는 음수를 못 쳤다(2026-10-12 모두의 실험대).
const KEYS_NEG = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '±', '0', 'del', 'ok'];
const KEYS_NEG_DEC = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '±', 'del', 'ok'];

// 손을 뗄 때 오는 클릭을 먹는다 — 키는 누르는 순간 반응하는데, «확인»으로 화면이 바뀌면 그 클릭이 그 자리에 새로 온 단추에 떨어진다.
//   셈 이용권에서 문제가 넘어갈 때 «취소»가 눌려 3문제를 영영 못 끝냈다(2026-11-05 사용자 «3문제 푸는데 계속 문제 시작을 누르게» · «게임 시작 안 됨»)
function eatGhostClick(doc, key) {
  const off = () => { doc.removeEventListener('click', eat, true); clearTimeout(t); };
  const eat = (e) => { off(); if (e.detail !== 0 && !key.contains(e.target)) { e.preventDefault(); e.stopPropagation(); } };
  doc.addEventListener('click', eat, true); const t = setTimeout(off, 700);
}

export function mountNumpad(host, { input, maxLength = 6, onSubmit, okLabel = '확인', allowNegative = false, allowDecimal = false } = {}) {
  injectNumpadCSS(host.ownerDocument || document);
  const doc = host.ownerDocument || document;
  let max = maxLength, busy = false;
  if (input) {
    input.readOnly = true; input.setAttribute('inputmode', 'none'); input.setAttribute('autocomplete', 'off');
    input.addEventListener('focus', () => input.blur());   // 탭해도 시스템 키보드 안 뜨게
  }
  const pad = doc.createElement('div'); pad.className = 'gb-numpad'; pad.setAttribute('role', 'group'); pad.setAttribute('aria-label', '숫자 키패드');
  const get = () => (input ? input.value : '');
  const set = (v) => { if (input) { input.value = v; input.dispatchEvent(new Event('input', { bubbles: true })); } };
  const press = (k) => {
    if (busy) return;
    const v = get();
    if (k === 'del') set(v.slice(0, -1));
    else if (k === 'ok') { if (!v || v === '-') return; busy = true; Promise.resolve(onSubmit?.(v)).finally(() => { busy = false; }); }
    else if (k === '-' || k === '±') { if (allowNegative) set(v.startsWith('-') ? v.slice(1) : '-' + v); }
    else if (k === '.') { if (allowDecimal && !v.includes('.') && v.replace('-', '').length < max) set((v === '' || v === '-' ? v + '0' : v) + '.'); }
    else if (v.replace('-', '').length < max) set(v === '0' ? k : v === '-0' ? '-' + k : v + k);
    btns[k]?.classList.add('down'); setTimeout(() => btns[k]?.classList.remove('down'), 90);
  };
  const btns = {};
  const keys = allowNegative ? (allowDecimal ? KEYS_NEG_DEC : KEYS_NEG) : allowDecimal ? KEYS_DEC : KEYS;
  // 13키 = 마지막 줄 «확인» 한 줄 전체(wide) · 14키 = «지우기» 옆 두 칸(wide2)
  const okWide = keys.length === 13 ? ' wide' : keys.length === 14 ? ' wide2' : '';
  for (const k of keys) {
    const b = doc.createElement('button'); b.type = 'button'; b.className = 'gb-numpad-key' + (k === 'ok' ? ' ok' + okWide : k === 'del' ? ' del' : k === '±' ? ' sign' : '');
    b.textContent = k === 'del' ? '⌫' : k === 'ok' ? okLabel : k; b.setAttribute('aria-label', k === 'del' ? '지우기' : k === 'ok' ? okLabel : k === '±' ? '부호 바꾸기(음수)' : k);
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); eatGhostClick(doc, b); press(k); });
    b.addEventListener('click', (e) => { if (e.detail === 0) press(k); });   // 키보드 접근(Tab+Space)
    btns[k] = b; pad.appendChild(b);
  }
  host.appendChild(pad);
  const onKey = (e) => {
    if (!pad.isConnected || pad.offsetParent === null) return;   // 화면에 보일 때만
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') press('del');
    else if (e.key === 'Enter') press('ok');
    else if (e.key === '-' && allowNegative) press('-');
    else if ((e.key === '.' || e.key === ',') && allowDecimal) press('.');
    else return;
    e.preventDefault();
  };
  doc.addEventListener('keydown', onKey);
  return {
    el: pad,
    clear: () => set(''),
    setMax: (n) => { max = n; },
    destroy: () => { doc.removeEventListener('keydown', onKey); pad.remove(); },
  };
}

export const NUMPAD_CSS = `.gb-numpad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:min(100%,340px);margin:10px auto 0;touch-action:manipulation;user-select:none;-webkit-user-select:none}
.gb-numpad-key{min-height:56px;border-radius:14px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:inherit;font:inherit;font-size:1.5rem;font-weight:700;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .06s,background .06s}
.gb-numpad-key.down,.gb-numpad-key:active{transform:scale(.94);background:rgba(255,255,255,.2)}
.gb-numpad-key.del{font-size:1.3rem}.gb-numpad-key.ok{background:linear-gradient(135deg,#1fb5a5,#6a5ae0);border-color:transparent;color:#fff;font-size:1.15rem}.gb-numpad-key.ok.wide{grid-column:1/-1}.gb-numpad-key.wide2{grid-column:span 2}`;
export function injectNumpadCSS(doc = document) {
  if (!doc || !doc.head || doc.getElementById('gb-numpad-css')) return;
  // CSP(style-src 'self') 게임은 numpad.css 를 스타일시트에 넣는다 — 이미 먹고 있으면 주입하지 않는다
  const probe = doc.createElement('button'); probe.className = 'gb-numpad-key'; probe.hidden = true;
  (doc.body || doc.head).appendChild(probe); const styled = doc.defaultView?.getComputedStyle(probe).minHeight === '56px'; probe.remove();
  if (styled) return;
  const s = doc.createElement('style'); s.id = 'gb-numpad-css'; s.textContent = NUMPAD_CSS; doc.head.appendChild(s);
}
