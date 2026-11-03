/* gb-ssam-pass.js — «방 만들어 하는 멀티»는 선행쌤에서 들어온 기기만 연다. 키트 정본 = ~/.claude/skills/game-builder/kit/school-hub/client
 * 2026-11-03 사용자 «방을 만들어서 하는 멀티 … 그런건 선행쌤에서만 · 모든 게임» — 킹수학·티픽스·인디로 들어온 사람도
 *   혼자 하기는 그대로 하고, 방 만들기·방 들어가기만 선행쌤을 거치게 해서 선행쌤 유입을 만든다.
 *   타자왕국처럼 게임 자체가 공유 세계·학교 대항인 멀티는 대상이 아니다(게임 쪽이 guardRoom 을 안 부르면 된다).
 *
 * 통과(한 번 통과하면 그 기기에 기억 — 다음부터 바로 열린다):
 *   ① 주소에 ?via=ssam (선행쌤 링크·/go 문이 붙인다)  ② 선행쌤에서 눌러 온 referrer  ③ 로컬 개발(localhost·127.0.0.1 — QA)
 * 정적 사이트라 «완전한» 잠금은 아니다(주소를 고치면 연다) — 목적은 보안이 아니라 길 안내다.
 */
export const SSAM_HOSTS = [
  'sunhaengssam.web.app', 'sunhaengssam.firebaseapp.com',
  'ssamzip.com', 'www.ssamzip.com', 'ssamzip.kr', 'www.ssamzip.kr',
];
export const SSAM_DOOR = 'https://sunhaengssam.web.app/go';
const KEY = 'gb.ssam';

const hostOf = (u) => { try { return new URL(u).hostname; } catch { return ''; } };
const isDev = (h) => h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.localhost');

/** 선행쌤을 거쳐 온 기기인가. 처음 통과하면 기억하고 주소의 ?via=ssam 은 지운다. */
export function ssamPass(loc = location, ref = document.referrer, store = localStorage) {
  try { if (store.getItem(KEY) === '1') return true; } catch { /* 저장 막힘 — 아래로 */ }
  let ok = isDev(loc.hostname) || SSAM_HOSTS.includes(hostOf(ref));
  try {
    const u = new URL(loc.href);
    if (u.searchParams.get('via') === 'ssam') {
      ok = true;
      u.searchParams.delete('via');
      try { history.replaceState(history.state, '', u.pathname + (u.search || '') + u.hash); } catch { /* */ }
    }
  } catch { /* */ }
  if (ok) { try { store.setItem(KEY, '1'); } catch { /* */ } }
  return ok;
}

/** 선행쌤 문 주소 — 지금 보던 자리(방 코드 포함)로 돌아오게 */
export function ssamDoorUrl(loc = location) {
  return `${SSAM_DOOR}?u=${encodeURIComponent(loc.href)}`;
}

let open = null;
/** 잠금 안내 창 — «선행쌤에서 열기» 한 번이면 이 기기는 계속 열린다 */
export function showRoomLock(what = '친구랑 방 만들어 하기') {
  if (open) return open;
  const d = document;
  const wrap = d.createElement('div');
  wrap.dataset.gb = 'ssam-lock';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:rgba(10,14,30,.62);padding:16px';
  // 🔒 CSP 안전: innerHTML 의 style="…" 속성은 엄격한 CSP(style-src 'unsafe-inline' 없음)에서 버려진다(블록누리 실측)
  //    → 요소를 만들고 style.cssText(CSSOM)로만 칠한다.
  const mk = (tag, css, text) => { const e = d.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; return e; };
  const card = mk('div', 'max-width:360px;width:100%;background:#fff;color:#1b2140;border-radius:18px;padding:22px 20px;text-align:center;font:16px/1.5 system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.35)');
  const c = what.charCodeAt(what.length - 1);
  const josa = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? '은' : '는'; // 받침 있으면 «은»
  const title = mk('div', 'font-weight:800;font-size:19px;margin:8px 0 4px', `${what}${josa} 선행쌤에서`);
  title.dataset.t = '';
  const sub = mk('div', 'opacity:.8;margin-bottom:16px');
  sub.append('선행쌤에서 들어오면 열려요.', d.createElement('br'), '한 번만 들어오면 이 기기에선 계속 열려요.');
  const door = mk('a', 'display:block;background:linear-gradient(90deg,#6c5ce7,#00b894);color:#fff;text-decoration:none;font-weight:800;padding:13px;border-radius:12px', '선행쌤에서 열기');
  door.dataset.gb = 'ssam-door';
  door.target = '_top';
  door.href = ssamDoorUrl();
  const x = mk('button', 'margin-top:10px;background:none;border:0;color:#556;font:inherit;padding:8px;cursor:pointer', '혼자 하기로 돌아가기');
  x.type = 'button';
  x.dataset.x = '';
  // 자물쇠 = SVG(이모지는 기기마다 모양이 달라 check-no-emoji 가 막는다 — 2026-11-03 도깨비 서킷 설치 때 키트 자신이 걸렸다)
  const NS = 'http://www.w3.org/2000/svg', lock = d.createElementNS(NS, 'svg');
  lock.setAttribute('viewBox', '0 0 24 24'); lock.setAttribute('width', '44'); lock.setAttribute('height', '44'); lock.setAttribute('aria-hidden', 'true');
  for (const [tag, at] of [['rect', { x: 5, y: 10, width: 14, height: 11, rx: 2.5, fill: '#6c5ce7' }], ['path', { d: 'M8 10V7a4 4 0 0 1 8 0v3', fill: 'none', stroke: '#6c5ce7', 'stroke-width': 2.4, 'stroke-linecap': 'round' }], ['circle', { cx: 12, cy: 15.5, r: 1.8, fill: '#fff' }]]) {
    const e = d.createElementNS(NS, tag); for (const [k, v] of Object.entries(at)) e.setAttribute(k, String(v)); lock.append(e);
  }
  card.append(lock, title, sub, door, x);
  wrap.append(card);
  const close = () => { wrap.remove(); open = null; };
  wrap.querySelector('[data-x]').addEventListener('click', close);
  wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
  d.body.appendChild(wrap);
  open = wrap;
  return wrap;
}

/** 방 만들기·방 들어가기 단추 처리기를 감싼다 — 통과면 그대로, 아니면 안내 창 */
export function guardRoom(fn, what) {
  return function guarded(...args) {
    if (ssamPass()) return fn.apply(this, args);
    showRoomLock(what);
    return undefined;
  };
}
