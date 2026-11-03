import { gbIcon } from './gb-icons.js';
/* gb-modes.js — 게임 모드 기본틀(카드 · 상단 모드 띠 · 타이머 · 하트 · 최고 기록). 키트 정본 = ~/.claude/skills/game-builder/kit/school-hub/client
 * 2026-10-11 사용자 «다양한 게임모드 … 스킬 코드에 박아» — 종이하늘 v6 에서 검증한 모드 묶음을 장르 무관 틀로 옮겼다.
 *
 * 기본 모드 «종류»(kind) — 모든 게임은 아래에서 4종 이상(classic 포함)을 갖는다. 게이트 = tools/gate-baseline.mjs
 *   classic  : 레벨을 하나씩(진행 저장·이어하기)
 *   time     : 타임어택 — 시작 N초, 판을 깨면 +초, 실수하면 −초. 기록 = 점수
 *   survival : 서바이벌 — 하트 3개, 실수마다 −1, 판마다 커진다. 힌트 없음. 기록 = 라운드
 *   rule     : 특수 규칙 — 그 게임 고유의 비틀기(종이하늘 = 무지개 색 순서). 기록 = 라운드
 *   big      : 거대 판 — 평소의 수 배 크기 한 판을 느긋하게(태블릿·PC). 기록 = 최단 시간
 *   daily    : 오늘의 판 — 날짜 시드, 하루 한 번(연속 기록)
 * 🔴 UI 규칙: 카드는 모두 같은 크기·같은 모양(이모지 + 이름 + 한 줄 설명 + 최고 기록 한 줄) — 색 띠·«새 모드!» 같은 장식으로 다르게 만들지 않는다.
 */
export const MODE_KINDS = ['classic', 'time', 'survival', 'rule', 'big', 'daily'];

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * 모드 카드 격자. modes = [{ id, kind, icon, label, desc, best? }] · icon = 게임이 만든 SVG 문자열(이모지 금지 — check-no-emoji) · onPick(id) 는 클릭(제스처) 안에서 불린다 → 거기서 gbGate.
 * 다시 그릴 필요 없이 최고 기록만 바꿀 땐 setModeBest(container, id, text).
 */
export function renderModeCards(container, modes, onPick) {
  container.classList.add('gb-modes');
  container.innerHTML = modes.map((m) => `
    <button class="gb-mode" data-gb-mode="${esc(m.kind)}" data-id="${esc(m.id)}">
      <span class="gb-mode-emoji" aria-hidden="true">${m.icon ?? ''}</span>
      <span class="gb-mode-name">${esc(m.label)}</span>
      <span class="gb-mode-desc">${esc(m.desc)}</span>
      <span class="gb-mode-best" data-best>${esc(m.best || '')}</span>
    </button>`).join('');
  container.querySelectorAll('.gb-mode').forEach((b) => b.addEventListener('click', () => onPick(b.dataset.id)));
}
export function setModeBest(container, id, text) {
  const el = container.querySelector(`.gb-mode[data-id="${CSS.escape(id)}"] [data-best]`);
  if (el) el.textContent = text || '';
}

/** 타임어택 시계 — start(ms) · add(ms) · stop(). onTick(남은ms, 긴급?) 매 프레임, onEnd() 0 되면 한 번 */
export class ModeClock {
  constructor({ startMs = 90_000, onTick = () => {}, onEnd = () => {}, urgentMs = 10_000 } = {}) {
    Object.assign(this, { left: startMs, onTick, onEnd, urgentMs, raf: 0, last: 0, running: false });
  }
  start() {
    this.running = true; this.last = performance.now();
    const step = (t) => {
      if (!this.running) return;
      this.left -= t - this.last; this.last = t;
      if (this.left <= 0) { this.left = 0; this.running = false; this.onTick(0, true); this.onEnd(); return; }
      this.onTick(this.left, this.left <= this.urgentMs);
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }
  add(ms) { this.left = Math.max(0, this.left + ms); }
  pause() { this.running = false; cancelAnimationFrame(this.raf); }
  stop() { this.pause(); }
}
export const fmtClock = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/** 상단 모드 띠(게임 화면 위 가운데). parts = [{ type:'round'|'time'|'hearts'|'text', … }] */
export function renderModeBar(el, parts) {
  el.classList.add('gb-modebar');
  el.innerHTML = parts.map((p) => {
    if (p.type === 'time') return `<span class="gb-chip gb-time${p.urgent ? ' urgent' : ''}">${gbIcon('timer')} ${fmtClock(p.ms)}</span>`;
    if (p.type === 'hearts') return `<span class="gb-chip gb-hearts">${Array.from({ length: p.max }, (_, i) => `<i class="${i < p.left ? '' : 'lost'}">${gbIcon('heart')}</i>`).join('')}</span>`;
    if (p.type === 'round') return `<span class="gb-chip">라운드 ${p.n}</span>`;
    return `<span class="gb-chip">${p.html ?? esc(p.text)}</span>`;
  }).join('');
}

/** 모드별 최고 기록(localStorage) — key 는 «게임id:modes» 네임스페이스로 */
export function bestStore(key) {
  const load = () => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } };
  return {
    get: (id) => load()[id] || null,
    /** better(old,new) 가 true 면 바꾼다. 바꿨으면 true */
    put(id, rec, better) {
      const all = load(), old = all[id];
      if (old && !better(old, rec)) return false;
      all[id] = rec; try { localStorage.setItem(key, JSON.stringify(all)); } catch { /* */ }
      return true;
    },
  };
}
