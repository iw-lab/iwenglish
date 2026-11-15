/* gb-tier-core.js — 모든 게임 공통 «개인 티어·칭호» 규칙(순수 함수 · 서버 ssam-tier 와 화면이 같은 파일을 쓴다).
 * 키트 정본 = ~/.claude/skills/game-builder/kit/school-hub/client · 서버 사본 = ~/Documents/dev/ssam-tier/src/core.js(시험이 같은지 본다)
 * 2026-11-15 사용자 «전체 게임 개인별 칭호나 티어 모두 넣도록 · 학교에서 한 티어가 집에서도 이어지도록 · 전역 코드에 박아»
 *
 * 🔴 개인 순위판이 아니다 — 티어는 «나만 보는 내 성장»이다(남과 줄 세우지 않는다 · gate-baseline B16 그대로).
 * 🔴 로그인 없음 — 학교↔집은 «내 코드»(8글자)로 잇는다. 코드 = 그 프로필의 열쇠(서버는 해시만 둔다).
 * 점수: 한 판 끝 10 · 이기면 +5 · 그날 첫 판 +20(매일 오는 보상). 하루 상한 = 게임 하나 150 · 전체 400(몰아 하기로 티어를 못 사게).
 */
export const XP = { play: 10, win: 5, dayFirst: 20, capGame: 150, capDay: 400, minGapSec: 15 };

/** 티어 — 낮은 것부터. 마지막(전설)은 단계 없음 · 나머지는 IV → I(4단계) */
export const TIERS = [
  { id: 'bronze', name: '브론즈', at: 0, color: '#b0754a' },
  { id: 'silver', name: '실버', at: 300, color: '#9aa7b4' },
  { id: 'gold', name: '골드', at: 900, color: '#e0a920' },
  { id: 'platinum', name: '플래티넘', at: 2000, color: '#3fb8a8' },
  { id: 'diamond', name: '다이아', at: 4000, color: '#4a8cf0' },
  { id: 'master', name: '마스터', at: 7000, color: '#9b5de5' },
  { id: 'legend', name: '전설', at: 12000, color: '#ff5d73' },
];
const ROMAN = ['IV', 'III', 'II', 'I'];

/** 점수 → 티어·단계·다음까지 */
export function tierOf(xp) {
  const x = Math.max(0, Math.floor(Number(xp) || 0));
  let i = 0; while (i + 1 < TIERS.length && x >= TIERS[i + 1].at) i++;
  const t = TIERS[i], nx = TIERS[i + 1];
  if (!nx) return { i, id: t.id, name: t.name, div: '', label: t.name, color: t.color, xp: x, pct: 1, toNext: 0, nextLabel: '' };
  const span = (nx.at - t.at) / 4, d = Math.min(3, Math.floor((x - t.at) / span));
  const lo = t.at + d * span, hi = t.at + (d + 1) * span;
  const nextLabel = d < 3 ? `${t.name} ${ROMAN[d + 1]}` : `${nx.name} ${ROMAN[0]}`;
  return { i, id: t.id, name: t.name, div: ROMAN[d], label: `${t.name} ${ROMAN[d]}`, color: t.color, xp: x, pct: (x - lo) / (hi - lo), toNext: Math.ceil(hi - x), nextLabel };
}
/** 단계까지 같은지(승급 알림용) */
export const tierKey = (xp) => { const t = tierOf(xp); return `${t.id}:${t.div}`; };

/** 칭호 — 통계(s)로 정해진다. 위에서부터 «가장 높은 것»이 대표 칭호 */
export const TITLES = [
  { id: 'legend', name: '전설의 게이머', how: '점수 12000', ok: (s) => s.xp >= 12000 },
  { id: 'days100', name: '100일의 기적', how: '100일 놀기', ok: (s) => s.days >= 100 },
  { id: 'games30', name: '게임 도감 완성', how: '게임 30가지', ok: (s) => s.games >= 30 },
  { id: 'streak30', name: '한 달 개근', how: '30일 연속', ok: (s) => s.bestStreak >= 30 },
  { id: 'plays1000', name: '천 판의 주인공', how: '1000판', ok: (s) => s.plays >= 1000 },
  { id: 'wins300', name: '승리의 화신', how: '300번 이기기', ok: (s) => s.wins >= 300 },
  { id: 'games15', name: '만능 박사', how: '게임 15가지', ok: (s) => s.games >= 15 },
  { id: 'master1', name: '한 우물 고수', how: '한 게임 100판', ok: (s) => s.topGame >= 100 },
  { id: 'plays300', name: '백전노장', how: '300판', ok: (s) => s.plays >= 300 },
  { id: 'streak7', name: '일주일 개근', how: '7일 연속', ok: (s) => s.bestStreak >= 7 },
  { id: 'wins100', name: '백승 장군', how: '100번 이기기', ok: (s) => s.wins >= 100 },
  { id: 'games5', name: '게임 탐험가', how: '게임 5가지', ok: (s) => s.games >= 5 },
  { id: 'fan1', name: '단골손님', how: '한 게임 30판', ok: (s) => s.topGame >= 30 },
  { id: 'plays100', name: '백 판 돌파', how: '100판', ok: (s) => s.plays >= 100 },
  { id: 'streak3', name: '사흘 개근', how: '3일 연속', ok: (s) => s.bestStreak >= 3 },
  { id: 'wins10', name: '승리의 맛', how: '10번 이기기', ok: (s) => s.wins >= 10 },
  { id: 'games3', name: '이것저것 해 봄', how: '게임 3가지', ok: (s) => s.games >= 3 },
  { id: 'plays10', name: '열 판 완주', how: '10판', ok: (s) => s.plays >= 10 },
  { id: 'first', name: '첫 발자국', how: '첫 판', ok: (s) => s.plays >= 1 },
];
/** 받은 칭호 id 목록(높은 것부터) */
export const titlesOf = (s) => TITLES.filter((t) => t.ok(normStats(s))).map((t) => t.id);
export const titleName = (id) => TITLES.find((t) => t.id === id)?.name || '';
export function normStats(s = {}) {
  const n = (v) => Math.max(0, Math.floor(Number(v) || 0));
  return { xp: n(s.xp), plays: n(s.plays), wins: n(s.wins), games: n(s.games), days: n(s.days), bestStreak: n(s.bestStreak), topGame: n(s.topGame) };
}

/** 한 판 끝에 붙는 점수 — 하루 상한 적용(가산 전 오늘 쌓인 값 dayGame·dayAll) */
export function gainFor({ won, firstToday, dayGame = 0, dayAll = 0 }) {
  let g = XP.play + (won ? XP.win : 0) + (firstToday ? XP.dayFirst : 0);
  g = Math.min(g, Math.max(0, XP.capGame - dayGame), Math.max(0, XP.capDay - dayAll));
  return Math.max(0, g);
}

/** 내 코드 — 헷갈리는 글자(0·O·1·I) 없는 32자 · 8글자(32^8 ≈ 1.1조) · 보여 줄 땐 4-4 */
export const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** 아이가 친 코드 다듬기 — 소문자·띄어쓰기·하이픈 허용, 글자판 밖 글자는 버린다 */
export const normCode = (v) => [...String(v || '').toUpperCase()].filter((c) => CODE_ABC.includes(c)).join('').slice(0, 8);
export const codeOk = (v) => typeof v === 'string' && v.length === 8 && [...v].every((c) => CODE_ABC.includes(c));
export const showCode = (v) => (codeOk(v) ? `${v.slice(0, 4)}-${v.slice(4)}` : '');

/** KST 날짜 «YYYY-MM-DD» · 하루 차이 */
export const kstDay = (ms = Date.now()) => new Date(ms + 9 * 3600e3).toISOString().slice(0, 10);
export const dayDiff = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400e3);

/** 게임 id·이름 거르기(서버에 남는 문자열) */
export const cleanGame = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
export const cleanName = (v) => String(v || '').replace(/[<>&"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
