// @gb-frac v1 — 분수를 «위아래로 쌓아» 보여 준다. 화면에 `1/2`·`1과 1/6` 을 글자 그대로 찍지 않는다(초등 교과서 표기).
// 정본 = ~/.claude/skills/game-builder/kit/frac/frac.js — 게임마다 복사해 쓰고, 🔒 tools/check-fraction-display.mjs 가
// «분수 글자가 있는데 이 렌더러를 안 쓰는» 프로젝트를 FAIL 시킨다.
//   setMath(el, text)  — el 에 분수 마크업을 넣고 낭독용 aria-label(「6분의 1」)을 단다. textContent 대신 이걸 쓴다.
//   fracHTML(text)     — 이스케이프된 HTML 문자열(템플릿 리터럴 안에서 쓸 때)
//   fracSpeech(text)   — 낭독 문자열
//   mathCanvas(text, { font, size, color, pad, scale }) — 캔버스 게임(Phaser 등)용: 분수를 쌓아 그린 <canvas> 를 돌려준다.
//                       Phaser: scene.textures.addCanvas(key, mathCanvas(q.text, {...})); scene.add.image(x, y, key)
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// 대분수: «1과 1/6»·«2와 1/4»·«2 1/4». 뒤에 «중·사이»가 오면 두 수를 나열한 것이라 대분수가 아니다(«3과 1/4 중 큰 수»).
const MIXED = /(?<![\w./])(\d{1,4})(?:[과와] | )(\d{1,4})\/(\d{1,4})(?![\w/])(?!\s*(?:중|사이))/g;
// 「과/와」는 읽는 소리의 받침으로 고른다(일·삼·육·칠·팔·영·십·백·천 = 과 / 이·사·오·구 = 와).
const josa = (w) => (/0$/.test(w) || /[013678]$/.test(w) ? '과' : '와');
const FRAC = /(?<![\w./])(\d{1,4}|□)\/(\d{1,4}|□)(?![\w/])/g;   // □ = 빈칸 분수(«5/9 = □/45» — 2026-11-03 셈왕국 «분수 표시 / 말고 제대로»)
const say = (x) => (x === '□' ? '빈칸' : x);
const f = (n, d) => `<span class="frac" role="img" aria-label="${say(d)}분의 ${say(n)}"><span class="frac-n">${n}</span><span class="frac-d">${d}</span></span>`;

export function fracHTML(text) {
  return esc(text).replace(MIXED, (_, w, n, d) => `<span class="frac-mixed">${w}${f(n, d)}</span>`).replace(FRAC, (_, n, d) => f(n, d));
}
export function fracSpeech(text) {
  return String(text).replace(MIXED, (_, w, n, d) => `${w}${josa(w)} ${d}분의 ${n}`).replace(FRAC, (_, n, d) => `${d}분의 ${n}`);
}
export function setMath(el, text) {
  injectFracCSS(el.ownerDocument || document);
  el.innerHTML = fracHTML(text);
  if (FRAC.test(String(text))) el.setAttribute('aria-label', fracSpeech(text)); else el.removeAttribute('aria-label');
  FRAC.lastIndex = 0;
}
export const FRAC_CSS = `.frac{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;line-height:1.05;margin:0 .12em;font-size:.9em;font-variant-numeric:tabular-nums}
.frac-n{padding:0 .18em .06em;border-bottom:.09em solid currentColor}.frac-d{padding:.06em .18em 0}.frac-mixed{white-space:nowrap}.frac-mixed>.frac{margin-left:.06em}`;
// CSP(style-src 'self')면 인라인 <style> 이 막힌다 → 그런 게임은 frac.css 를 자기 스타일시트에 넣는다.
// 이미 .frac 규칙이 먹고 있으면(=스타일시트에 있음) 주입하지 않는다(증명왕국 2026-10-12 — CSP 콘솔 에러).
export function injectFracCSS(doc = document) {
  if (!doc || !doc.head || doc.getElementById('gb-frac-css')) return;
  // 탐침 = 숨긴 .frac-n 의 밑줄 — display 로 보면 flex 부모 안에서 inline-flex→flex 로 바뀌어 오판한다(증명왕국 실측)
  const probe = doc.createElement('span'); probe.className = 'frac-n'; probe.hidden = true;
  (doc.body || doc.head).appendChild(probe); const styled = doc.defaultView?.getComputedStyle(probe).borderBottomStyle === 'solid'; probe.remove();
  if (styled) return;
  const s = doc.createElement('style'); s.id = 'gb-frac-css'; s.textContent = FRAC_CSS; doc.head.appendChild(s);
}

// ── 캔버스용: 글자를 «보통 글자 / 분수 / 대분수» 조각으로 나눠 가로로 이어 그린다
function tokens(text) {
  const out = [], re = new RegExp(`${MIXED.source}|${FRAC.source}`, 'g'); let last = 0, m;
  const t = String(text);
  while ((m = re.exec(t))) {
    if (m.index > last) out.push({ s: t.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ w: m[1], n: m[2], d: m[3] }); else out.push({ n: m[4], d: m[5] });
    last = re.lastIndex;
  }
  if (last < t.length) out.push({ s: t.slice(last) });
  return out;
}
export function mathCanvas(text, { font = 'sans-serif', size = 32, color = '#fff', weight = '600', pad = 4, scale = (globalThis.devicePixelRatio || 1) } = {}) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  const big = `${weight} ${size}px ${font}`, small = `${weight} ${Math.round(size * 0.72)}px ${font}`;
  const W = (s, f) => { g.font = f; return g.measureText(s).width; };
  const parts = tokens(text).map((p) => {
    if (p.s !== undefined) return { ...p, wd: W(p.s, big) };
    const fw = Math.max(W(p.n, small), W(p.d, small)) + size * 0.2, ww = p.w ? W(p.w, big) + size * 0.05 : 0;
    return { ...p, ww, fw, wd: ww + fw + size * 0.1 };
  });
  const width = Math.ceil(parts.reduce((a, p) => a + p.wd, 0) + pad * 2), height = Math.ceil(size * 1.9 + pad * 2);
  c.width = width * scale; c.height = height * scale; c.style.width = width + 'px'; c.style.height = height + 'px';
  g.scale(scale, scale); g.fillStyle = color; g.strokeStyle = color; g.textBaseline = 'middle';
  const mid = height / 2; let x = pad;
  for (const p of parts) {
    if (p.s !== undefined) { g.font = big; g.textAlign = 'left'; g.fillText(p.s, x, mid); x += p.wd; continue; }
    if (p.w) { g.font = big; g.textAlign = 'left'; g.fillText(p.w, x, mid); x += p.ww; }
    const cx = x + p.fw / 2 + size * 0.05; g.font = small; g.textAlign = 'center';
    g.fillText(p.n, cx, mid - size * 0.42); g.fillText(p.d, cx, mid + size * 0.46);
    g.lineWidth = Math.max(1.5, size * 0.07); g.beginPath(); g.moveTo(x + size * 0.05, mid); g.lineTo(x + size * 0.05 + p.fw, mid); g.stroke();
    x += p.wd;
  }
  c.dataset.speech = fracSpeech(text);
  return c;
}
