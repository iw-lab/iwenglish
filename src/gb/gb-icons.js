/* gb-icons.js — 키트 화면 아이콘(직접 그린 24px 선 SVG · currentColor). 이모지 대신 쓴다 — 기기마다 모양이 달라 톤이 깨진다
 * (2026-10-13 사용자 «이모지좀 게임화면에 넣지마 촌스러»). 게이트 = tools/check-no-emoji.mjs */
const P = {
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4.5a2.5 2.5 0 0 0 2.5 4M17 6h2.5A2.5 2.5 0 0 1 17 10"/>',
  ticket: '<path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z"/><path d="M15 7v2M15 11v2M15 15v2"/>',
  school: '<path d="M3 10l9-6 9 6"/><path d="M5 9v11h14V9"/><path d="M10 20v-5h4v5"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4"/>',
  heart: '<path d="M12 20.5s-7.5-4.6-9.3-9.2A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 9.3 4.7C19.5 15.9 12 20.5 12 20.5z" fill="currentColor"/>',
  out: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  sparkle: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
};
/** gbIcon('trophy') → 인라인 SVG 문자열. cls 로 크기·색을 CSS 에서 맞춘다(.gb-ic 기본 1.1em) */
export function gbIcon(name, cls = '') {
  const d = P[name]; if (!d) return '';
  return `<svg class="gb-ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}
