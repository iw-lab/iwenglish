// 유령 기록(키트 1.26 · 2026-11-10 사용자 «다른 친구 기록에 도전하면 그 친구를 유령처럼 따라가게» — 콩콩 구름계단).
// 서버가 받는 것 = 판 하나의 «시간에 따른 진행» 줄글 + 고른 별명(목록 낱말 둘)뿐. 실명·글쓰기 0(아동 개인정보).
// 별명 낱말 = client/gb-nick.js NICK_ADJ·NICK_NOUN 과 같아야 한다(시험 tests/ghost.test.mjs 가 맞춰 본다)
export const NICK_ADJ = ['용감한', '씩씩한', '반짝이는', '날쌘', '느긋한', '다정한', '튼튼한', '명랑한', '슬기로운', '엉뚱한', '재빠른', '든든한', '신나는', '부지런한', '호기심 많은', '상냥한'];
export const NICK_NOUN = ['수달', '다람쥐', '호랑이', '토끼', '고래', '펭귄', '여우', '부엉이', '판다', '거북이', '너구리', '참새', '해달', '고양이', '강아지', '반달곰'];
export function ghostNickOk(v) { const s = String(v ?? ''); return NICK_ADJ.some((a) => NICK_NOUN.some((n) => s === `${a} ${n}`)); }
export const GHOST_DATA_MAX = 4000;   // 60초·끝없는 하늘 한 판 ≈ 1~3KB(시각 0.01초 정수 · 층 차이)
export const isGhostKey = (k) => /^[a-z0-9_-]{1,24}$/.test(String(k ?? ''));
export const isGhostData = (d) => typeof d === 'string' && d.length > 0 && d.length <= GHOST_DATA_MAX && /^[0-9a-z,;:.\-]+$/.test(d);
export const GHOST_KEEP_DAYS = 2;     // 오늘·어제만 남긴다(넘은 것은 넣을 때 조금씩 지운다)
export const GHOST_LIST = 40;         // 학교 한 곳 · 하루 · 모드에서 읽는 줄 상한
