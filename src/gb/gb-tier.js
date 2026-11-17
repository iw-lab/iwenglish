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
import { tierOf, tierKey, TITLES, TIERS, titleName, showCode, normCode, codeOk, CODE_ABC, XP } from './gb-tier-core.js';
import { tierBadgeSVG } from './gb-tier-badge.js';
const divIx = (t) => Math.max(0, ['IV', 'III', 'II', 'I'].indexOf(t.div));   /* IV=0 … I=3 → 배지 아래 별 1~4개 */
import { gbIcon } from './gb-icons.js';
import { hubKey } from './hubnet.js';
import { loadNick } from './gb-nick.js';

/* ── 모양(1.32) — 키트 CSS(gb-ui.css)를 안 읽는 게임(새벽등불)·게임 CSS 가 «.gb-rank button{min-height:0}» 로 덮는 게임(퐁당)에서도 같게.
 *   구성 스타일시트(adoptedStyleSheets)는 CSP style-src 'self' 에 막히지 않는다. 안 되는 옛 브라우저만 <style>. */
const TIER_CSS = `/* 🏅 개인 티어(1.30) — 배지는 학교 순위 머리줄 안(첫 화면 높이 0 추가), 누르면 내 티어 창 */
#gb-tier-layer { z-index: 1001; }
/* 누름 영역 44px(B5) · 겉모양은 28px 알약 — 위아래 −8px 여백으로 머리줄 높이는 거의 그대로 */
.gb-rank button.gb-tier-pill[data-gb="tier"] { display: inline-flex; align-items: center; min-height: 44px; margin: -8px 0; padding: 0; border: 0; background: none; color: var(--gb-text); font: 800 12.5px var(--gb-font); cursor: pointer; white-space: nowrap; position: relative; }
.gb-rank button.gb-tier-pill[data-gb="tier"] > b { display: inline-flex; align-items: center; gap: 4px; min-height: 28px; padding: 1px 10px 1px 7px; border-radius: 999px; border: 2px solid var(--tier); background: color-mix(in srgb, var(--tier) 22%, transparent); }
.gb-rank button.gb-tier-pill[data-gb="tier"] i { font-style: normal; font-size: 11.5px; color: var(--gb-accent); margin-left: 2px; }
button.gb-tier-pill[data-gb="tier"].gain { animation: gb-tier-pop 0.6s ease-out 2; }
button.gb-tier-pill[data-gb="tier"].up > b { background: var(--tier); color: #fff; } button.gb-tier-pill[data-gb="tier"].up .gb-ic { color: #fff; }
@keyframes gb-tier-pop { 50% { transform: scale(1.12); } }
@media (prefers-reduced-motion: reduce) { button.gb-tier-pill[data-gb="tier"].gain { animation: none; } }
.gb-rank-head { flex-wrap: wrap; align-items: center; }
.gb-tier-sheet { max-width: 440px; }
.gb-tier-badge { width: 112px; height: 116px; margin: 0 auto 2px; display: grid; place-items: center; position: relative; }
.gb-tier-badge .gb-tb { width: 112px; height: 116px; filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.45)); }
/* 🏅 배지(1.33 · gb-tier-badge.js) — 골드 위는 빛이 숨 쉬고, 전설은 더 세게 · 잠긴 배지는 흑백 */
.gb-tier-badge[data-tier="gold"] .gb-tb, .gb-tier-badge[data-tier="platinum"] .gb-tb, .gb-tier-badge[data-tier="diamond"] .gb-tb, .gb-tier-badge[data-tier="master"] .gb-tb, .gb-tier-badge[data-tier="legend"] .gb-tb { animation: gb-tb-glow 2.4s ease-in-out infinite; }
@keyframes gb-tb-glow { 50% { filter: drop-shadow(0 0 14px var(--tier)) drop-shadow(0 4px 10px rgba(0, 0, 0, 0.45)); } }
.gb-tier-ladder { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 2px; margin: 4px 0 8px; }
.gb-tier-ladder span { display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 4px 0 2px; border-radius: 10px; }
.gb-tier-ladder .gb-tb { width: 34px; height: 35px; } .gb-tier-ladder small { font-size: 10.5px; color: var(--gb-dim); white-space: nowrap; }
.gb-tier-ladder .lock .gb-tb { filter: grayscale(1) brightness(0.55); opacity: 0.7; } .gb-tier-ladder .lock small { opacity: 0.6; }
.gb-tier-ladder .now { background: color-mix(in srgb, var(--gb-gold) 22%, transparent); box-shadow: inset 0 0 0 2px var(--gb-gold); } .gb-tier-ladder .now small { color: var(--gb-text); font-weight: 800; }
.gb-tier-next { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 0 0 6px; font-size: 14px; } .gb-tier-next .gb-tb { width: 30px; height: 31px; filter: grayscale(0.6); } .gb-tier-next b { color: var(--gb-gold); }
.gb-rank button.gb-tier-pill[data-gb="tier"] .gb-tb { width: 22px; height: 23px; margin: -2px 0; }
.gb-tier-reveal { position: fixed; left: 50%; top: 42%; translate: -50% -50%; z-index: 1002; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 16px 30px 14px; border-radius: 22px; pointer-events: none;
  background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--tier) 55%, #10142e), #10142e 75%); box-shadow: 0 0 0 2px var(--tier), 0 0 50px color-mix(in srgb, var(--tier) 70%, transparent); color: #fff; animation: gb-tb-in 2.4s ease-out forwards; }
.gb-tier-reveal .gb-tb { width: 132px; height: 136px; filter: drop-shadow(0 0 16px var(--tier)); } .gb-tier-reveal b { font: 900 28px var(--gb-font); color: var(--gb-gold); } .gb-tier-reveal span { font: 800 16px var(--gb-font); }
@keyframes gb-tb-in { 0% { scale: 0.3; opacity: 0; rotate: -12deg; } 16% { scale: 1.1; opacity: 1; rotate: 4deg; } 26% { scale: 1; rotate: 0deg; } 82% { opacity: 1; } 100% { opacity: 0; scale: 1.05; } }
@media (prefers-reduced-motion: reduce) { .gb-tier-badge .gb-tb, .gb-tier-reveal { animation: none; } }
.gb-tier-title { margin: 0 0 8px; font-weight: 800; color: var(--gb-gold); font-size: 15px; }
.gb-tier-bar { height: 10px; border-radius: 6px; background: var(--gb-panel-2); overflow: hidden; margin: 4px 0 6px; } .gb-tier-bar u { display: block; height: 100%; }
.gb-tier-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 6px 0 10px; }
.gb-tier-stats span { background: var(--gb-panel); border-radius: 10px; padding: 6px 2px; display: flex; flex-direction: column; } .gb-tier-stats b { font-size: 17px; } .gb-tier-stats small { color: var(--gb-dim); font-size: 12px; }
.gb-tier-mycode { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; background: var(--gb-panel); border: 1px dashed var(--gb-line); border-radius: 12px; padding: 8px; }
.gb-tier-mycode small { color: var(--gb-dim); } .gb-tier-mycode b { font: 900 22px ui-monospace, Menlo, Consolas, monospace; letter-spacing: 2px; }
.gb-tier-enter { width: 100%; margin: 6px 0; min-height: 48px; font-size: 16px; }
.gb-tier-titles { text-align: left; margin: 8px 0; } .gb-tier-titles summary { cursor: pointer; font-weight: 800; padding: 6px 0; min-height: 32px; }
.gb-tier-titles ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
.gb-tier-titles li { display: flex; align-items: center; gap: 5px; font-size: 13px; padding: 4px 6px; border-radius: 8px; background: var(--gb-panel); color: var(--gb-dim); }
.gb-tier-titles li.on { color: var(--gb-text); background: color-mix(in srgb, var(--gb-gold) 18%, transparent); }
.gb-tier-titles li b { flex: 1; font-size: 13px; } .gb-tier-titles li small { font-size: 12px; opacity: 0.85; } .gb-tier-titles .gb-ic { width: 14px; height: 14px; flex: none; }
.gb-tier-reset { display: block; margin: 6px auto 0; font-size: 12.5px; color: var(--gb-dim); }
.gb-tier-boxes { display: flex; justify-content: center; gap: 4px; margin: 6px 0 10px; }
.gb-tier-boxes b { width: 32px; height: 40px; border-radius: 8px; border: 2px solid var(--gb-line); display: grid; place-items: center; font: 900 20px ui-monospace, Menlo, monospace; background: var(--gb-panel); }
.gb-tier-boxes b:nth-child(4) { margin-right: 10px; }
.gb-tier-keys { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 4px; margin-bottom: 8px; }
.gb-tier-keys button { min-height: 44px; border-radius: 8px; border: 1px solid var(--gb-line); background: var(--gb-panel-2); color: var(--gb-text); font: 800 16px ui-monospace, Menlo, monospace; cursor: pointer; padding: 0; }
.gb-tier-keys button.wide { grid-column: span 8; font-family: var(--gb-font); font-size: 14px; }
.gb-tier-msg { min-height: 20px; margin: 0 0 6px; font-size: 13.5px; color: var(--gb-danger); }
/* 티어 색 — 인라인 style 없이(CSP style-src 'self' 게임) · gb-tier-core.js TIERS 색과 같게 */
[data-tier], [data-tier="bronze"] { --tier: #b0754a; } [data-tier="silver"] { --tier: #9aa7b4; } [data-tier="gold"] { --tier: #e0a920; } [data-tier="platinum"] { --tier: #3fb8a8; }
[data-tier="diamond"] { --tier: #4a8cf0; } [data-tier="master"] { --tier: #9b5de5; } [data-tier="legend"] { --tier: #ff5d73; }
.gb-tier-bar u { background: var(--tier, var(--gb-accent)); }
`;
(function sheetOnce() {
  try {
    if (typeof document === 'undefined' || document.documentElement.dataset.gbTierCss) return;
    document.documentElement.dataset.gbTierCss = '1';
    if ('adoptedStyleSheets' in Document.prototype && typeof CSSStyleSheet === 'function' && 'replaceSync' in CSSStyleSheet.prototype) {
      const sh = new CSSStyleSheet(); sh.replaceSync(TIER_CSS); document.adoptedStyleSheets = [...document.adoptedStyleSheets, sh];
    } else { const st = document.createElement('style'); st.textContent = TIER_CSS; document.head.appendChild(st); }
  } catch { /* 모양 없이도 동작은 한다 */ }
})();

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
/** 첫 화면(순위 카드)이 다시 보였다 = 판이 끝났다. gbFinish 를 안 부르는 게임(이용권 없는 판은 정산을 건너뜀 — 냥장난 카페 2026-11-15 배포본 실측: 한 판 끝내도 요청 0)도 여기서 보낸다(이김 여부는 모름 → 기본 점수) */
export function tierHomeSeen() { if (pending && Date.now() - pending.at >= opt.minMs) flush(false); }
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
  if (lastGain.up) revealBadge();
}
/** 승급 — 새 배지가 화면 가운데 반짝이며 나타난다(2.4초 · 누름을 막지 않는다) · 2026-11-17 «멋진 배지 · 갖고 싶게» */
function revealBadge() {
  if (typeof document === 'undefined' || document.querySelector('.gb-tier-reveal')) return;
  const t = tierOf(tierState.xp || 0), el = document.createElement('div'); el.className = 'gb-tier-reveal'; el.dataset.tier = t.id; el.setAttribute('role', 'status');
  el.innerHTML = `${tierBadgeSVG(t.id, divIx(t), 'big')}<b>승급!</b><span>${esc(t.label)} 배지</span>`;
  document.body.append(el); setTimeout(() => el.remove(), 2400);
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
  return `<button type="button" class="gb-tier-pill${g?.up ? ' up' : ''}${g ? ' gain' : ''}" data-gb="tier" data-tier="${t.id}" aria-label="내 티어 ${esc(t.label)} — 눌러서 칭호·내 코드 보기"><b>${tierBadgeSVG(t.id, divIx(t), 'sm')}<span>${esc(label)}</span>${g && g.n ? `<i>+${g.n}</i>` : ''}</b></button>`;
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
    <div class="gb-tier-badge" data-tier="${t.id}">${tierBadgeSVG(t.id, divIx(t), 'big')}</div>
    <h2>${esc(t.label)}</h2>
    <div class="gb-tier-ladder" aria-label="배지 7단계">${TIERS.map((x, k) => `<span class="${k < t.i ? 'got' : k === t.i ? 'now' : 'lock'}">${tierBadgeSVG(x.id, k < t.i ? 3 : k === t.i ? divIx(t) : 0, 'sm')}<small>${esc(x.name)}</small></span>`).join('')}</div>
    ${t.i + 1 < TIERS.length ? `<p class="gb-tier-next" data-tier="${TIERS[t.i + 1].id}">${tierBadgeSVG(TIERS[t.i + 1].id, 0, 'sm')}<span>다음 배지 <b>${esc(TIERS[t.i + 1].name)}</b>까지 <b>${Math.max(0, TIERS[t.i + 1].at - (s.xp || 0))}점</b></span></p>` : ''}
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
