/* gb-tier-badge.js — 개인 티어 배지 그림(SVG · 그림 파일 0 · CSP 무관). 2026-11-17 사용자 «티어는 좀 멋진 배지로 · 갖고 싶게 · 모든 우리 게임에».
 *   티어가 오를수록 모양이 화려해진다: 브론즈 메달 → 실버 방패 → 골드 날개 방패 → 플래티넘 문장 → 다이아 보석 → 마스터 왕관·월계수 → 전설 불꽃 왕관.
 *   단계 IV→I 는 아래 별 1→4개(높을수록 많다). 잠긴 배지는 CSS(.gb-tb.lock)가 흑백으로.
 *   시험 tests/tier-badge.test.mjs(7종이 서로 다르고 · id 가 겹치지 않고 · 이모지·인라인 style 없음) */
let seq = 0;
const P = {
  bronze:   { a: '#f3c08f', b: '#b0754a', c: '#6e3d1c', gem: '#ffd8b0' },
  silver:   { a: '#ffffff', b: '#aab6c2', c: '#5d6b78', gem: '#e8f1fa' },
  gold:     { a: '#fff4b0', b: '#f0b31a', c: '#9a6400', gem: '#fff8d6' },
  platinum: { a: '#d9fff8', b: '#3fc4b2', c: '#16736a', gem: '#bafff3' },
  diamond:  { a: '#e3f0ff', b: '#4a8cf0', c: '#1b3f99', gem: '#bfe0ff' },
  master:   { a: '#f0dcff', b: '#9b5de5', c: '#4b1f86', gem: '#ffd166' },
  legend:   { a: '#fff0c2', b: '#ff5d73', c: '#8f1030', gem: '#ffe066' },
};
const SHIELD = 'M32 6 L52 13 V30 C52 43 43 52 32 58 C21 52 12 43 12 30 V13 Z';
const star = (cx, cy, r, fill) => { const p = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r; p.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`); } return `<polygon points="${p.join(' ')}" fill="${fill}"/>`; };
const laurel = (side, fill) => {   /* 월계수 — 아래에서 위로 휘는 줄기 + 잎 6장(잎은 줄기를 따라 기운다) */
  const s = side < 0 ? -1 : 1, R = 24, pt = (t) => [32 + s * R * Math.sin(t * Math.PI / 180), 34 + R * Math.cos(t * Math.PI / 180)];
  const [x0, y0] = pt(25), [x1, y1] = pt(135);
  let o = `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 0 ${s < 0 ? 1 : 0} ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${fill}" stroke-width="1.5"/>`;
  for (let k = 0; k < 6; k++) { const t = 30 + k * 20, [x, y] = pt(t), rot = s * (t - 20);
    o += `<ellipse cx="${(x + s * 2.6).toFixed(1)}" cy="${y.toFixed(1)}" rx="2" ry="4.6" fill="${fill}" transform="rotate(${rot.toFixed(0)} ${(x + s * 2.6).toFixed(1)} ${y.toFixed(1)})"/>`; }
  return o; };
const crown = (y, f, g) => `<path d="M20 ${y + 9} L22 ${y} L27 ${y + 5} L32 ${y - 3} L37 ${y + 5} L42 ${y} L44 ${y + 9} Z" fill="url(#${f})" stroke="${g}" stroke-width="1.2"/><circle cx="32" cy="${y - 3}" r="1.8" fill="#fff"/>`;
const wings = (f) => `<path d="M12 22 C4 20 2 28 4 34 C8 30 10 30 12 31 Z M52 22 C60 20 62 28 60 34 C56 30 54 30 52 31 Z" fill="url(#${f})" opacity="0.95"/>`;

/** 티어 배지 SVG — id(브론즈…전설) · div(0=IV … 3=I, 전설은 무시) · cls(크기 등) */
export function tierBadgeSVG(id, div = 0, cls = '') {
  const c = P[id] || P.bronze, u = `gbtb${++seq}`, gM = `${u}m`, gI = `${u}i`;
  const defs = `<defs><linearGradient id="${gM}" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="${c.a}"/><stop offset="0.55" stop-color="${c.b}"/><stop offset="1" stop-color="${c.c}"/></linearGradient>`
    + `<radialGradient id="${gI}" cx="0.4" cy="0.3" r="0.8"><stop offset="0" stop-color="${c.gem}"/><stop offset="0.6" stop-color="${c.b}"/><stop offset="1" stop-color="${c.c}"/></radialGradient>`
    + '</defs>';
  let body = '';
  if (id === 'bronze') body = `<path d="M22 44 L18 60 L26 56 L30 62 L32 46 Z M42 44 L46 60 L38 56 L34 62 L32 46 Z" fill="${c.c}"/><circle cx="32" cy="30" r="21" fill="url(#${gM})" stroke="${c.c}" stroke-width="2"/><circle cx="32" cy="30" r="15" fill="url(#${gI})" stroke="${c.a}" stroke-width="1.5" opacity="0.95"/>${star(32, 30, 8, c.a)}`;
  else if (id === 'silver') body = `<path d="${SHIELD}" fill="url(#${gM})" stroke="${c.c}" stroke-width="2"/><path d="M32 12 L47 17.5 V30 C47 40 40 47 32 52 C24 47 17 40 17 30 V17.5 Z" fill="url(#${gI})" opacity="0.9"/><path d="M22 26 L32 34 L42 26 L42 32 L32 40 L22 32 Z" fill="${c.a}"/>`;
  else if (id === 'gold') body = `${wings(gM)}<path d="${SHIELD}" fill="url(#${gM})" stroke="${c.c}" stroke-width="2"/><path d="M32 12 L47 17.5 V30 C47 40 40 47 32 52 C24 47 17 40 17 30 V17.5 Z" fill="url(#${gI})"/>${star(32, 31, 10, '#fffbe6')}`;
  else if (id === 'platinum') body = `${wings(gM)}<polygon points="32,4 54,16 54,42 32,58 10,42 10,16" fill="url(#${gM})" stroke="${c.c}" stroke-width="2"/><polygon points="32,12 47,20 47,38 32,49 17,38 17,20" fill="url(#${gI})"/><polygon points="32,18 41,30 32,42 23,30" fill="#ffffff" opacity="0.92"/><polygon points="32,18 41,30 32,30" fill="${c.a}"/>`;
  else if (id === 'diamond') body = `<g fill="${c.a}" opacity="0.9">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<polygon points="32,2 35,10 29,10" transform="rotate(${a} 32 31)"/>`).join('')}</g><circle cx="32" cy="31" r="22" fill="url(#${gM})" stroke="${c.c}" stroke-width="2"/><polygon points="20,25 26,17 38,17 44,25 32,47" fill="url(#${gI})" stroke="#fff" stroke-width="1"/><polygon points="20,25 44,25 32,47" fill="${c.b}" opacity="0.55"/><polygon points="26,17 32,25 38,17" fill="#fff" opacity="0.8"/><path d="M20 25 L26 17 L32 25 L38 17 L44 25" fill="none" stroke="#fff" stroke-width="0.8"/>`;
  else if (id === 'master') body = `${laurel(-1, '#ffd166')}${laurel(1, '#ffd166')}<path d="M32 14 L50 20 V33 C50 44 42 51 32 57 C22 51 14 44 14 33 V20 Z" fill="url(#${gM})" stroke="${c.c}" stroke-width="2"/>${crown(6, gM, c.c)}<circle cx="32" cy="34" r="9" fill="url(#${gI})" stroke="#fff" stroke-width="1.2"/>${star(32, 34, 5.5, '#fff')}`;
  else body = `<path d="M32 0 C38 8 46 6 44 16 C52 12 56 20 52 28 C58 30 56 40 50 42 L14 42 C8 40 6 30 12 28 C8 20 12 12 20 16 C18 6 26 8 32 0 Z" fill="#ff9a3c" opacity="0.9"/><path d="M32 6 C36 12 42 11 40 18 C46 16 48 22 46 28 L18 28 C16 22 18 16 24 18 C22 11 28 12 32 6 Z" fill="#ffe066" opacity="0.85"/>${laurel(-1, '#ffd166')}${laurel(1, '#ffd166')}<path d="M32 16 L50 22 V34 C50 45 42 52 32 58 C22 52 14 45 14 34 V22 Z" fill="url(#${gM})" stroke="${c.c}" stroke-width="2"/>${crown(8, gM, c.c)}<polygon points="32,26 40,34 32,46 24,34" fill="url(#${gI})" stroke="#fff" stroke-width="1.4"/><polygon points="32,26 40,34 32,34" fill="#fff" opacity="0.7"/>`;
  const n = Math.max(0, Math.min(3, div | 0)) + 1, pips = id === 'legend' || /\bsm\b/.test(cls) ? '' : `<g>${Array.from({ length: n }, (_, k) => star(32 + (k - (n - 1) / 2) * 7, 61, 3.4, '#ffe9a8')).join('')}</g>`;
  const shine = `<ellipse cx="26" cy="18" rx="11" ry="4.5" fill="#fff" opacity="0.28" transform="rotate(-24 26 18)"/>`;   /* 윤기 — 작게 위쪽만 */
  return `<svg class="gb-tb ${cls}" data-tier="${id}" viewBox="0 0 64 66" aria-hidden="true" focusable="false">${defs}${body}${shine}${pips}</svg>`;
}
