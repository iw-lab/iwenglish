/* gb-tier.js — 모든 게임 공통 «개인 티어·칭호» 화면 + 판 기록 보내기. 키트 정본 = ~/.claude/skills/game-builder/kit/school-hub/client
 * 2026-11-15 사용자 «전체 게임 개인별 칭호나 티어 모두 넣도록 · 학교에서 한 티어가 집에서도 이어지도록 전수 적용 · 전역 코드에 박아»
 *
 * 게임 코드는 아무것도 안 고친다 — gb-school.js 가 판 시작(gbGate·방 시작)·끝(gbFinish·gbLeave)에서 부르고,
 * 첫 화면 학교 순위 카드 머리줄에 배지를 붙인다(첫 화면 높이 0 추가 — 79개 게임 «시작하기 첫 화면 안» 그대로).
 * 서버 = ssam-tier(korea 계정 워커) · 규칙 = gb-tier-core.js(서버와 같은 파일).
 * 학교↔집 = «내 코드»(8글자). 코드 넣기는 글자판 단추로(한글 자판 상태여도 된다). 선행쌤에서 들어오면 주소 #gbt=코드 로 따라온다.
 * 🔴 자동 시험 브라우저(navigator.webdriver)는 서버에 안 보낸다 — 시험이 진짜 기록 칸을 더럽히지 않게. 시험 서버는 ?tier=<주소>(로컬만).
 * 🔴 개인 순위판 없음 — 남과 줄 세우는 화면은 만들지 않는다(gate-baseline B16).
 */
import { tierOf, tierKey, TITLES, titleName, showCode, normCode, codeOk, CODE_ABC, XP } from './gb-tier-core.js';
import { gbIcon } from './gb-icons.js';
import { hubKey } from './hubnet.js';
import { loadNick } from './gb-nick.js';

export const TIER_URL = 'https://ssam-tier.simssijjang-korea.workers.dev';
const KEY = 'gb.tier';
const MIN_ROUND_MS = 15_000;   // 15초 안에 끝난 판은 안 보낸다(서버 같은 게임 간격 15초와 같게 · 시작·나가기 마구 누르기)
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const opt = { url: '', game: '', name: '', minMs: MIN_ROUND_MS };

/** 선택: configureTier({ game: 'id', name: '게임 이름' }) — 안 부르면 허브 키·문서 제목에서 읽는다 */
export function configureTier(o) { Object.assign(opt, o || {}); }

const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* 저장 막힘 — 이번 화면만 */ } };
export const tierState = load();   // { code, xp, plays, wins, games, days, streak, bestStreak, topGame, titles[], nick, at }
let pending = null, lastGain = null, pillEls = new Set();

function baseUrl() {
  if (opt.url) return opt.url;
  try {
    const q = new URLSearchParams(location.search).get('tier');
    if (q && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(q)) { sessionStorage.setItem('gb.tier.url', q); return q; }
    const s = sessionStorage.getItem('gb.tier.url'); if (s) return s;
  } catch { /* */ }
  if (typeof navigator !== 'undefined' && navigator.webdriver) return '';   // 자동 시험은 진짜 서버에 안 간다
  return TIER_URL;
}
function gameId() {
  if (opt.game) return opt.game;
  const k = String(hubKey('x')).split('.hub')[0];
  if (k && k !== 'gb' && /^[a-z0-9-]+$/.test(k)) return k;
  return String(location.hostname.split('.')[0] || 'game').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) || 'game';
}
const gameName = () => opt.name || String(document.title || '').split(/\s[—–|-]\s|[:|]/)[0].trim().slice(0, 24);

async function call(path, body) {
  const u = baseUrl(); if (!u) return null;
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 7000);
  try {
    const r = await fetch(u + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal, keepalive: true } : { signal: ctl.signal });
    return r.ok ? await r.json() : null;
  } catch { return null; } finally { clearTimeout(t); }
}
function take(j) {
  if (!j || !j.ok) return false;
  for (const k of ['xp', 'plays', 'wins', 'games', 'days', 'streak', 'bestStreak', 'topGame']) if (k in j) tierState[k] = Math.max(0, Math.floor(Number(j[k]) || 0));
  if (Array.isArray(j.titles)) tierState.titles = j.titles.filter((t) => typeof t === 'string').slice(0, 40);
  if (typeof j.nick === 'string') tierState.nick = j.nick.slice(0, 24);
  if (j.code && codeOk(j.code)) tierState.code = j.code;
  tierState.at = Date.now(); save(tierState); paintPills(); return true;
}

/* ── 판 시작·끝 (gb-school 이 부른다) ─────────────────────────── */
export function tierStart() { flush(false); pending = { at: Date.now() }; }
export function tierEnd(won) { flush(!!won); }
function flush(won) {
  const p = pending; pending = null;
  if (!p || Date.now() - p.at < opt.minMs) return;
  void report(won);
}
async function report(won) {
  const before = tierState.xp || 0, beforeKey = tierKey(before), beforeTitles = [...(tierState.titles || [])];
  const j = await call('/v1/play', { code: tierState.code || '', game: gameId(), name: gameName(), won: !!won, nick: loadNick() || '' });
  if (j && !j.ok && j.why === 'nocode') { delete tierState.code; save(tierState); return report(won); }   // 코드가 사라졌으면(합쳐짐) 새로
  if (!take(j)) return;
  lastGain = { n: Math.max(0, Math.floor(Number(j.gained) || 0)),   /* 숫자로만 — 응답 글자가 innerHTML 에 들어가지 않게(교차검증 codex) */ up: tierKey(tierState.xp) !== beforeKey && tierState.xp > before, titles: (j.newTitles || []).filter((t) => !beforeTitles.includes(t)), at: Date.now(), shown: false };
  paintPills();
}
// 탭을 닫으면 진행 중 판을 보낸다(응답은 못 받는다)
addEventListener('pagehide', (e) => {
  if (e.persisted || !pending || Date.now() - pending.at < opt.minMs) return;
  const u = baseUrl(); pending = null; if (!u || !navigator.sendBeacon) return;
  try { navigator.sendBeacon(u + '/v1/play', new Blob([JSON.stringify({ code: tierState.code || '', game: gameId(), name: gameName(), won: false, nick: loadNick() || '' })], { type: 'text/plain' })); } catch { /* */ }
});

/* ── 다른 기기 코드로 잇기 ─────────────────────────────────── */
export async function tierLink(code) {
  const c = normCode(code); if (!codeOk(c)) return { ok: false, why: 'code' };
  if (c === tierState.code) return { ok: true, same: true };
  const j = await call('/v1/link', { code: c, from: tierState.code || '' });
  if (!j) return { ok: false, why: 'net' };
  if (!j.ok) return j;
  for (const k of Object.keys(tierState)) delete tierState[k];
  tierState.code = c; take(j); return j;
}
// 선행쌤 링크가 붙여 준 #gbt=코드 / ?gbt=코드 — 받아 두고 주소에서 지운다
(function intake() {
  try {
    const u = new URL(location.href), h = new URLSearchParams(u.hash.slice(1));
    const v = h.get('gbt') || u.searchParams.get('gbt'); if (!v) return;
    h.delete('gbt'); u.searchParams.delete('gbt');
    const hash = h.toString(); history.replaceState(history.state, '', u.pathname + (u.search || '') + (hash ? '#' + hash : ''));
    const c = normCode(v); if (codeOk(c) && c !== tierState.code) void tierLink(c);
  } catch { /* */ }
})();
// 다른 기기에서 쌓은 것 — 첫 화면에서 10분에 한 번 새로 받는다
export async function tierRefresh() {
  if (!tierState.code || Date.now() - (tierState.at || 0) < 600_000) return;
  const j = await call(`/v1/me?code=${encodeURIComponent(tierState.code)}`);
  if (j && !j.ok && j.why === 'nocode') { delete tierState.code; save(tierState); paintPills(); return; }
  take(j);
}

/* ── 첫 화면 배지(학교 순위 카드 머리줄) ──────────────────────── */
export function tierPillHTML() {
  const t = tierOf(tierState.xp || 0), g = lastGain && !lastGain.shown && Date.now() - lastGain.at < 120_000 ? lastGain : null;
  const label = g?.up ? `승급! ${t.label}` : t.label;
  return `<button type="button" class="gb-tier-pill${g?.up ? ' up' : ''}${g ? ' gain' : ''}" data-gb="tier" data-tier="${t.id}" aria-label="내 티어 ${esc(t.label)} — 눌러서 칭호·내 코드 보기"><b>${gbIcon('badge')}<span>${esc(label)}</span>${g && g.n ? `<i>+${g.n}</i>` : ''}</b></button>`;
}
/** paintRank 가 innerHTML 을 새로 쓴 뒤 부른다 */
export function bindTierPill(root) {
  const b = root?.querySelector('[data-gb="tier"]'); if (!b) return;
  pillEls.add(b); b.addEventListener('click', () => openTier());
  if (lastGain && !lastGain.shown && b.classList.contains('gain')) setTimeout(() => { if (lastGain) lastGain.shown = true; }, 6000);
  void tierRefresh();
}
function paintPills() {
  for (const b of [...pillEls]) {
    if (!b.isConnected) { pillEls.delete(b); continue; }
    const tmp = document.createElement('div'); tmp.innerHTML = tierPillHTML(); const nb = tmp.firstElementChild;
    b.replaceWith(nb); pillEls.delete(b); pillEls.add(nb); nb.addEventListener('click', () => openTier());
  }
}

/* ── 내 티어 창 ────────────────────────────────────────────── */
let layer = null;
function sheet(html) {
  if (!layer) { layer = document.createElement('div'); layer.id = 'gb-tier-layer'; document.body.appendChild(layer); layer.addEventListener('click', (e) => { if (e.target === layer) closeTier(); }); }
  layer.innerHTML = `<div class="gb-sheet gb-tier-sheet" role="dialog" aria-modal="true" aria-label="내 티어">${html}</div>`;
  layer.hidden = false; return layer;
}
export function closeTier() { if (layer) { layer.hidden = true; layer.innerHTML = ''; } }
export function openTier(view = 'main') {
  const s = tierState, t = tierOf(s.xp || 0), got = new Set(s.titles || []);
  if (lastGain) lastGain.shown = true;
  if (view === 'enter') return openEnter();
  const top = (s.titles || [])[0];
  const titles = TITLES.slice().reverse().map((x) => `<li class="${got.has(x.id) ? 'on' : ''}">${got.has(x.id) ? gbIcon('check') : gbIcon('lock')}<b>${esc(x.name)}</b><small>${esc(x.how)}</small></li>`).join('');
  const stats = [['판', s.plays], ['이김', s.wins], ['해 본 게임', s.games], ['연속', s.streak ? `${s.streak}일` : 0]].map(([k, v]) => `<span><b>${esc(v ?? 0)}</b><small>${k}</small></span>`).join('');
  const code = s.code ? showCode(s.code) : '';
  const L = sheet(`
    <div class="gb-tier-badge" data-tier="${t.id}">${gbIcon('badge')}</div>
    <h2>${esc(t.label)}</h2>
    <p class="gb-tier-title">${top ? `칭호 «${esc(titleName(top))}»` : '첫 판을 끝내면 칭호가 생겨요'}${s.nick ? ` · ${esc(s.nick)}` : ''}</p>
    <div class="gb-tier-bar" data-tier="${t.id}" aria-hidden="true"><u></u></div>
    <p class="gb-hint">${t.toNext ? `다음 «${esc(t.nextLabel)}»까지 ${t.toNext}점 · 한 판 ${XP.play}점 · 이기면 +${XP.win} · 그날 첫 판 +${XP.dayFirst}` : '가장 높은 티어예요!'}<br>모든 선행쌤 게임의 판이 한 티어로 모여요</p>
    <div class="gb-tier-stats">${stats}</div>
    <div class="gb-tier-code">
      ${code ? `<div class="gb-tier-mycode"><small>내 코드</small><b data-tier-code>${esc(code)}</b><button type="button" class="gb-link" data-act="copy">${gbIcon('copy')} 복사</button></div>
      <p class="gb-hint">학교·집·다른 기기에서 이 코드를 넣으면 티어가 그대로 이어져요. 공책에 적어 두세요!</p>` : '<p class="gb-hint">한 판을 끝내면 «내 코드»가 생겨요 — 다른 기기에서 넣으면 이어져요</p>'}
      <button type="button" class="gb-play gb-tier-enter" data-act="enter">${gbIcon('key')} 다른 기기 코드 넣기</button>
    </div>
    <details class="gb-tier-titles"><summary>칭호 ${got.size} / ${TITLES.length}</summary><ul>${titles}</ul></details>
    ${s.code ? '<button type="button" class="gb-link gb-tier-reset" data-act="reset">내 기록이 아니에요(이 기기에서 새로 시작)</button>' : ''}
    <button type="button" class="gb-link" data-act="close">닫기</button>`);
  // 🔴 인라인 style 속성 금지 — CSP style-src 'self' 게임(벽란도·별 수비대)이 막았다. 색은 CSS [data-tier], 너비는 CSSOM(스크립트로 넣는 건 CSP 가 허용)
  const bar = L.querySelector('.gb-tier-bar u'); if (bar) bar.style.width = `${Math.round(t.pct * 100)}%`;
  L.querySelector('[data-act="close"]').onclick = closeTier;
  L.querySelector('[data-act="enter"]').onclick = () => openEnter();
  L.querySelector('[data-act="copy"]')?.addEventListener('click', (e) => { try { void navigator.clipboard?.writeText(code); e.currentTarget.textContent = '복사했어요'; } catch { /* */ } });
  const rs = L.querySelector('[data-act="reset"]'); let armed = false;
  rs?.addEventListener('click', () => {
    if (!armed) { armed = true; rs.textContent = '한 번 더 누르면 이 기기에서 지워요(코드를 알면 다시 이어져요)'; return; }
    for (const k of Object.keys(tierState)) delete tierState[k]; save(tierState); lastGain = null; paintPills(); openTier();
  });
}
function openEnter() {
  let v = '';
  const keys = [...CODE_ABC].map((c) => `<button type="button" data-k="${c}">${c}</button>`).join('');
  const L = sheet(`
    <h2>${gbIcon('key')} 코드 넣기</h2>
    <p class="gb-hint">다른 기기에서 본 «내 코드» 8글자를 눌러요. 이 기기에서 한 판도 이어서 합쳐져요</p>
    <div class="gb-tier-boxes" data-tier-boxes>${'<b></b>'.repeat(8)}</div>
    <div class="gb-tier-keys">${keys}<button type="button" data-k="back" class="wide">지우기</button></div>
    <p class="gb-tier-msg" data-tier-msg role="status"></p>
    <button type="button" class="gb-play" data-act="go" disabled>이어 하기</button>
    <button type="button" class="gb-link" data-act="back">돌아가기</button>`);
  const boxes = [...L.querySelectorAll('[data-tier-boxes] b')], go = L.querySelector('[data-act="go"]'), msg = L.querySelector('[data-tier-msg]');
  const paint = () => { boxes.forEach((b, i) => { b.textContent = v[i] || ''; }); go.disabled = v.length !== 8; };
  const put = (k) => { if (k === 'back') v = v.slice(0, -1); else if (v.length < 8 && CODE_ABC.includes(k)) v += k; msg.textContent = ''; paint(); };
  L.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => put(b.dataset.k)));
  const onKey = (e) => { if (!layer || layer.hidden) { removeEventListener('keydown', onKey); return; } if (e.key === 'Backspace') put('back'); else if (e.key.length === 1) put(e.key.toUpperCase()); };
  addEventListener('keydown', onKey);
  L.querySelector('[data-act="back"]').onclick = () => { removeEventListener('keydown', onKey); openTier(); };
  go.onclick = async () => {
    go.disabled = true; msg.textContent = '확인하는 중…';
    const r = await tierLink(v);
    if (r.ok) { removeEventListener('keydown', onKey); openTier(); return; }
    msg.textContent = r.why === 'nocode' ? '그런 코드가 없어요 — 다시 확인해 주세요' : r.why === 'slow' ? '너무 많이 틀렸어요 — 잠시 뒤에 다시 해요' : '지금은 연결이 안 돼요 — 잠시 뒤에 다시 해요';
    go.disabled = v.length !== 8;
  };
}
export { MIN_ROUND_MS as _MIN_ROUND_MS_FOR_TEST };
