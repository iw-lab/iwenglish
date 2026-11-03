/* gb-fullscreen.js — 전체화면 단추 + 게임 들어갈 때 자동 전체화면. 키트 정본 = ~/.claude/skills/game-builder/kit/school-hub/client
 * 🔴 requestFullscreen 은 «사용자 제스처 안에서 동기로» 불러야 한다 — await(네트워크) 뒤에 부르면 활성화가 끝나 거절된다.
 *    그래서 gbGate()가 맨 첫 줄에서 enterFullscreen()을 부른다(게임 쪽은 «시작 단추 클릭 → gbGate» 만 지키면 된다).
 * iPhone Safari 는 요소 전체화면이 없다 → 단추를 숨긴다(홈 화면에 추가하면 standalone 으로 꽉 찬다).
 */
const d = document;
const el = () => d.documentElement;
export const canFullscreen = () => !!(d.fullscreenEnabled || d.webkitFullscreenEnabled);
export const isFullscreen = () => !!(d.fullscreenElement || d.webkitFullscreenElement);

const PREF = 'gb.fs.auto';
/** 자동 전체화면 끄기(설정) — 기본 켜짐 */
export const autoFullscreen = () => { try { return localStorage.getItem(PREF) !== '0'; } catch { return true; } };
export const setAutoFullscreen = (on) => { try { localStorage.setItem(PREF, on ? '1' : '0'); } catch { /* */ } };

export function enterFullscreen() {
  if (!canFullscreen() || isFullscreen()) return;
  try {
    const p = el().requestFullscreen ? el().requestFullscreen({ navigationUI: 'hide' }) : el().webkitRequestFullscreen?.();
    if (p && p.catch) p.catch(() => { /* 제스처 밖·정책 거절 — 조용히 */ });
  } catch { /* */ }
}
export function exitFullscreen() {
  if (!isFullscreen()) return;
  try { const p = d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen?.(); if (p && p.catch) p.catch(() => {}); } catch { /* */ }
}
export const toggleFullscreen = () => (isFullscreen() ? exitFullscreen() : enterFullscreen());

/** 게임 시작 직전(제스처 안)에 부른다 — 설정이 켜져 있을 때만 */
export function autoEnterFullscreen() { if (autoFullscreen()) enterFullscreen(); }

const ICON_IN = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
const ICON_OUT = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';

/** 단추 하나를 전체화면 토글로 만든다(아이콘·라벨이 상태를 따라간다). 못 쓰는 기기면 숨긴다. */
export function bindFullscreenButton(btn) {
  if (!btn) return;
  btn.dataset.gb = 'fullscreen';
  if (!canFullscreen()) { btn.hidden = true; btn.style.display = 'none'; return; }
  const paint = () => {
    const on = isFullscreen();
    btn.innerHTML = on ? ICON_OUT : ICON_IN;
    btn.setAttribute('aria-label', on ? '전체화면 끝내기' : '전체화면');
    btn.title = on ? '전체화면 끝내기' : '전체화면';
  };
  btn.addEventListener('click', (e) => { e.stopPropagation(); toggleFullscreen(); });
  d.addEventListener('fullscreenchange', paint);
  d.addEventListener('webkitfullscreenchange', paint);
  paint();
}
