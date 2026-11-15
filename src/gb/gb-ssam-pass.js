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
  const card = mk('div', 'max-width:360px;width:100%;background:#fff;color:#1b2140;border-radius:18px;padding:22px 20px;text-align:center;font:16px/1.5 system-ui,sans-serif;word-break:keep-all;overflow-wrap:anywhere;box-shadow:0 12px 40px rgba(0,0,0,.35)');
  const c = what.charCodeAt(what.length - 1);
  const josa = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? '은' : '는'; // 받침 있으면 «은»
  const title = mk('div', 'font-weight:800;font-size:19px;margin:8px 0 4px', `${what}${josa} 선행쌤에서 열어요`);
  title.dataset.t = '';
  // 2026-11-04 사용자 «그걸 친절하게 알려줘» — 왜 막혔는지 · 누르면 어떻게 되는지 · 기기마다 한 번 · 혼자 하기는 그대로 · 선생님 요령
  const sub = mk('div', 'opacity:.85;margin-bottom:14px;text-align:left;font-size:15px');
  const li = (txt) => { const r = mk('div', 'display:flex;gap:8px;margin:6px 0'); r.append(mk('span', 'flex:none;width:20px;height:20px;border-radius:50%;background:#efeafd;color:#6c5ce7;font:800 12px/20px system-ui,sans-serif;text-align:center', String(sub.childElementCount + 1)), mk('span', '', txt)); sub.append(r); };
  li('친구랑 같이 하는 방은 선행쌤을 한 번 거쳐 온 기기에서 열려요.');
  li('아래 단추를 누르면 선행쌤에 잠깐 들렀다가 이 게임으로 바로 돌아와요.');
  li('기기마다 한 번만 하면 돼요. 그다음부터는 어디서 들어와도 계속 열려요.');
  const door = mk('a', 'display:block;background:linear-gradient(90deg,#6c5ce7,#00b894);color:#fff;text-decoration:none;font-weight:800;padding:13px;border-radius:12px', '선행쌤 들렀다 오기');
  door.dataset.gb = 'ssam-door';
  door.target = '_top';
  door.href = ssamDoorUrl();
  const solo = mk('div', 'margin-top:10px;font-size:13px;opacity:.75', '혼자 하기는 지금 그대로 할 수 있어요.');
  const tip = mk('div', 'margin-top:8px;font-size:12.5px;line-height:1.45;background:#f4f6fb;border-radius:10px;padding:8px 10px;color:#3a4366', '선생님께: 아이들에게 선행쌤(sunhaengssam.web.app)의 게임 링크로 나눠 주면 처음부터 열려 있어요.');
  const x = mk('button', 'margin-top:10px;background:none;border:0;color:#556;font:inherit;padding:8px;cursor:pointer', '혼자 하기로 돌아가기');
  x.type = 'button';
  x.dataset.x = '';
  // 자물쇠 = SVG(이모지는 기기마다 모양이 달라 check-no-emoji 가 막는다 — 2026-11-03 도깨비 서킷 설치 때 키트 자신이 걸렸다)
  const NS = 'http://www.w3.org/2000/svg', lock = d.createElementNS(NS, 'svg');
  lock.setAttribute('viewBox', '0 0 24 24'); lock.setAttribute('width', '44'); lock.setAttribute('height', '44'); lock.setAttribute('aria-hidden', 'true');
  for (const [tag, at] of [['rect', { x: 5, y: 10, width: 14, height: 11, rx: 2.5, fill: '#6c5ce7' }], ['path', { d: 'M8 10V7a4 4 0 0 1 8 0v3', fill: 'none', stroke: '#6c5ce7', 'stroke-width': 2.4, 'stroke-linecap': 'round' }], ['circle', { cx: 12, cy: 15.5, r: 1.8, fill: '#fff' }]]) {
    const e = d.createElementNS(NS, tag); for (const [k, v] of Object.entries(at)) e.setAttribute(k, String(v)); lock.append(e);
  }
  card.append(lock, title, sub, door, solo, x, tip);
  wrap.append(card);
  const close = () => { wrap.remove(); open = null; };
  wrap.querySelector('[data-x]').addEventListener('click', close);
  wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
  d.body.appendChild(wrap);
  open = wrap;
  return wrap;
}

/* ── 첫 화면 안내판(1.28 · 2026-11-13 사용자 «모든 게임에 안내좀 똑바로 · 멀티 플레이 게임») ──
 * 멀티 게임이 선행쌤 없이 열리면 «시작»이 조용히 봇 대전이 되거나, 눌러 봐야 잠금 창이 떠서
 * 아이는 «멀티가 기본 아님?»하고 헤맨다. guardRoom 을 한 번이라도 만든 게임(= 멀티 게임)은
 * 주 행동 단추([data-gb="play"]) 바로 아래에 «지금은 누구와 하는지»를 늘 보이게 붙인다.
 * 게임이 자리를 정하고 싶으면 빈 [data-gb="ssam-notice"] 를 두면 그 안에 채운다. */
const NOTE = 'gb-ssam-notice';
export function noticeText(passed) {
  return passed
    ? { title: '친구랑 같이 하기가 열려 있어요', sub: '빠른 대전·방 만들기로 친구들과 겨뤄요. 빈자리는 컴퓨터 친구가 채워요.' }
    : { title: '지금은 컴퓨터 친구(봇)와 해요', sub: '진짜 친구랑 같이 하려면 선행쌤을 한 번 들렀다 오세요. 기기마다 한 번이면 계속 열려요.' };
}
function buildNotice(d, passed) {
  const t = noticeText(passed);
  const box = d.createElement('div');
  box.className = NOTE; box.dataset.gbNotice = passed ? 'open' : 'locked';
  box.setAttribute('role', 'note');
  box.style.cssText = 'display:block;box-sizing:border-box;flex:none;align-self:stretch;width:100%;max-width:440px;margin:8px auto 0;padding:9px 12px;border-radius:12px;text-align:left;font:14px/1.4 system-ui,sans-serif;word-break:keep-all;overflow-wrap:anywhere;pointer-events:auto;'
    + (passed ? 'background:rgba(255,255,255,.94);color:#0b4d3c;border:1.5px solid #00b894;box-shadow:0 4px 14px rgba(0,0,0,.18)' : 'background:rgba(255,255,255,.94);color:#1b2140;border:1.5px solid #6c5ce7;box-shadow:0 4px 14px rgba(0,0,0,.18)');
  const h = d.createElement('div'); h.style.cssText = 'font-weight:800;font-size:15px'; h.textContent = t.title; h.dataset.t = '';
  const s = d.createElement('div'); s.style.cssText = 'opacity:.85;font-size:13px;margin-top:2px'; s.textContent = t.sub;
  box.append(h, s);
  if (!passed) {
    const a = d.createElement('a');
    a.dataset.gb = 'ssam-door'; a.target = '_top'; a.href = ssamDoorUrl();
    a.style.cssText = 'display:inline-flex;align-items:center;margin-top:7px;background:linear-gradient(90deg,#6c5ce7,#00b894);color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:0 16px;border-radius:10px;min-height:44px';   /* 누름 자리 44px(B5) — 36px 였다(2026-11-13 초성 번개 배포본) */
    a.textContent = '선행쌤 들렀다 오기';
    box.append(a);
  }
  return box;
}
/** 안내판을 지금 붙인다(이미 있으면 갱신). 붙인 개수를 돌려준다. */
export function mountMultiNotice(root = document) {
  const d = root.ownerDocument || root;
  const passed = ssamPass();
  let n = 0;
  for (const host of root.querySelectorAll('[data-gb="ssam-notice"]')) {
    if (host.querySelector('.' + NOTE)?.dataset.gbNotice === (passed ? 'open' : 'locked')) { n++; continue; }
    host.replaceChildren(buildNotice(d, passed)); n++;
  }
  if (n) return n;
  for (const play of root.querySelectorAll('[data-gb="play"]')) {
    /* 주 단추 바로 뒤의 재방문 «반김 카드»는 건너뛴다 — 안내판이 그 사이에 끼면 작은 폰·PC 첫 화면 밖으로 밀린다(2026-11-13 넉자 정령 · SN-8) */
    let at = play; while (at.nextElementSibling && at.nextElementSibling.matches('[data-ret="comeback"]')) at = at.nextElementSibling;
    const nx = at.nextElementSibling;
    const shown = play.getClientRects().length > 0 && getComputedStyle(play).visibility !== 'hidden';
    if (nx && nx.classList.contains(NOTE)) {
      if (nx.dataset.gbNotice === (passed ? 'open' : 'locked')) { if (nx.hidden === shown) nx.hidden = !shown; n++; break; }
      nx.remove();
    }
    const box = buildNotice(d, passed); box.hidden = !shown; /* 단추가 숨으면(판 안) 안내판도 숨는다 */
    at.after(box); n++;
    break; /* 주 단추 하나에만 */
  }
  return n;
}
let watching = false;
/** 멀티 게임 표시 — 첫 화면이 다시 그려져도 안내판이 따라 붙는다 */
export function watchMultiNotice() {
  if (watching || typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  watching = true;
  let busy = false, due = 0;
  const run = () => { due = 0; if (busy) return; busy = true; try { mountMultiNotice(document); } finally { busy = false; } };
  /* 판 안 HUD 가 매 프레임 바뀌어도 0.25초에 한 번만 본다 */
  const go = () => { run(); new MutationObserver(() => { if (!busy && !due) due = setTimeout(run, 250); }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class', 'style'] }); };
  if (document.body) go(); else document.addEventListener('DOMContentLoaded', go, { once: true });
}

/** 방 만들기·방 들어가기 단추 처리기를 감싼다 — 통과면 그대로, 아니면 안내 창 */
export function guardRoom(fn, what) {
  watchMultiNotice();
  return function guarded(...args) {
    if (ssamPass()) return fn.apply(this, args);
    showRoomLock(what);
    return undefined;
  };
}
