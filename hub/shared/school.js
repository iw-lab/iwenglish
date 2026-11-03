// game-builder 학교 대항 · 이용권 · 문제 묶음 — 순수 함수만(허브 워커·시험·브라우저가 같은 파일). 키트 정본 = ~/.claude/skills/game-builder/kit/school-hub
// (원본 비트:온 2026-10-10 ← 콩콩배구·꿀꺽 행성·스쿨 스타즈 규약).
// 🔴 개인정보: 학교는 «공식 목록(NEIS)에서 고른 코드»만(자유 입력 0) — 허브가 NEIS 에 다시 물어 확인한 이름만 저장.
//    기기 식별자(did, 무작위 32자)는 SHA-256 해시 앞 16자(dh)로만 남는다. 이름·나이·반·계정은 없다. 학교별 «합계»만 보인다.
// 🎟 «문제 풀고 사용권 얻기»(2026-10-10 사용자): 게임 1판 = 이용권 1장, 문제 묶음 PACK_Q 개 중 TICKET_PASS_Q 개 정답 = 이용권 TIX_PER_PACK 장.
//    학교 점수의 뿌리는 언제나 «푼 문제»다 — 결과는 기기가 알리지만 이용권 없이는 점수가 안 생기고, 기기 하루 상한이 있다.

export const T = {
  PACK_Q: 5, TICKET_PASS_Q: 4, TIX_PER_PACK: 2, PACK_MIN_MS_PER_Q: 1200, PACK_TTL_MIN: 15,
  /** 이용권을 쓰고 이만큼 안에 나가면(로딩 실패·잘못 고른 판) 돌려준다 */
  TICKET_REFUND_SEC: 90,
  /** 결과 신고는 이용권을 쓴 뒤 이 시간 안에만. 🔴 30분이면 긴 판(캠페인 연속·대연대기 6시나리오·연습 9홀 36분·하트가 차는 모드)의 학교 점수가
   *  통째로 'late' 로 사라졌다(2026-10-14 철모특공대 사용자 제보 → 19게임 전수). 점수의 뿌리는 이용권·하루 상한이라 길게 둬도 새는 곳이 없다 */
  RESULT_TTL_MIN: 180,
  /** 학교 점수 — 클리어 2 · 끝까지 못 감(실패·중간에 나감) 1. 🔴 서버는 판 판정을 확인할 수 없다 — 그래서 차이를 1점으로 작게 두고, 뿌리는 이용권(=푼 문제)이다 */
  SCHOOL_PTS: [1, 2],
  SCHOOL_DAY_CAP: 40,
  /** 새 기기 첫 이용권 — 0. 공짜 표를 주면 기기 토큰만 새로 만들어 학교 점수를 무한히 찍는다(문제 풀이가 점수의 뿌리라는 전제가 깨진다) */
  FIRST_TIX: 0,
  /** 한 IP(학교 와이파이 = 학교 전체가 한 IP) 하루 학교 점수 상한 — 기기 토큰을 갈아 가며 농사하는 뒷문 */
  IP_DAY_CAP: 1500,
};

export const SIDO = { B10: '서울', C10: '부산', D10: '대구', E10: '인천', F10: '광주', G10: '대전', H10: '울산', I10: '세종', J10: '경기',
  K10: '강원', M10: '충북', N10: '충남', P10: '전북', Q10: '전남', R10: '경북', S10: '경남', T10: '제주' };
export const NEIS = 'https://open.neis.go.kr/hub/schoolInfo';
const KIND = '초등학교';

export const isDid = (d) => /^[0-9a-f]{32}$/.test(String(d ?? ''));
export const isDh = (d) => /^[0-9a-f]{16}$/.test(String(d ?? ''));
export const isCode = (c) => /^\d{7}$/.test(String(c ?? ''));
export const isSido = (s) => typeof s === 'string' && Object.prototype.hasOwnProperty.call(SIDO, s);
export const isRef = (r) => /^[A-Za-z0-9:_-]{6,120}$/.test(String(r ?? ''));
/** 검색어 정리 — 한글·영문·숫자 1~12자. «초»·«초등학교» 꼬리는 떼고 찾는다(NEIS 는 부분 일치) */
export function cleanQuery(q) {
  const s = String(q ?? '').normalize('NFC').replace(/[^0-9A-Za-z가-힣]/g, '').replace(/(초등학교|초교|초)$/, '');
  return s.length >= 1 && s.length <= 12 ? s : '';
}
/** 표시용 약칭 — «서울한빛초등학교» → «서울한빛초» */
export const shortName = (name) => String(name || '').replace(/초등학교$/, '초').slice(0, 10);
export function fromRow(r, todayYmd) {
  const code = String(r.SD_SCHUL_CODE ?? '').trim(), name = String(r.SCHUL_NM ?? '').trim();
  if (!isCode(code) || !name || name.startsWith('(가칭)') || String(r.SCHUL_KND_SC_NM) !== KIND) return null;
  if (Number(r.FOND_YMD) > todayYmd) return null;
  const sido = String(r.ATPT_OFCDC_SC_CODE ?? '');
  return { code, name, sido, region: SIDO[sido] ?? '' };
}
export function searchUrl(q, sido) {
  const p = new URLSearchParams({ Type: 'json', pIndex: '1', pSize: '6', SCHUL_KND_SC_NM: KIND, SCHUL_NM: q });
  if (sido) p.set('ATPT_OFCDC_SC_CODE', sido);
  return `${NEIS}?${p}`;
}
export function codeUrl(code, sido) {
  const p = new URLSearchParams({ Type: 'json', pIndex: '1', pSize: '5', SD_SCHUL_CODE: code });
  if (sido) p.set('ATPT_OFCDC_SC_CODE', sido);
  return `${NEIS}?${p}`;
}
/** NEIS 응답 → 학교 배열(없으면 []). 형식이 이상하면 null(= 장애, 캐시하지 않는다) */
export function parseNeis(j, todayYmd) {
  if (j?.RESULT?.CODE === 'INFO-200') return [];
  const rows = j?.schoolInfo?.[1]?.row;
  if (!Array.isArray(rows)) return null;
  return rows.map((r) => fromRow(r, todayYmd)).filter(Boolean);
}

export const ymdKst = (ms = Date.now()) => Number(new Date(ms + 9 * 3600e3).toISOString().slice(0, 10).replace(/-/g, ''));
export const kstDay = (ms = Date.now()) => new Date(ms + 9 * 3600e3).toISOString().slice(0, 10);
export function kstWeek(ms = Date.now()) {
  const d = new Date(ms + 9 * 3600e3); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

// ── 문제 묶음 봉인(AES-GCM) — 정답은 서버 메모리가 아니라 토큰에 들어 있다(워커가 바뀌어도 채점된다) ──
const b64u = (u) => btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
export async function packKey(secret) {
  const k = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('bo-quiz:' + secret));
  return crypto.subtle.importKey('raw', k, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function seal(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(obj))));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
  return b64u(out);
}
export async function unseal(key, tok) {
  try {
    const u = unb64u(String(tok || '').replace(/[^0-9A-Za-z_-]/g, ''));
    if (u.length < 29) return null;
    return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, key, u.slice(12))));
  } catch { return null; }
}
/** 봉인 토큰의 «정규형» — base64url 마지막 글자의 남는 비트를 바꾼 변종은 같은 바이트로 풀린다(교차검증 codex: 같은 묶음 재채점 구멍).
 *  디코드 → 다시 인코드한 값이 원문과 같을 때만 정규형이다. 쓴 묶음 키는 정규형의 SHA-256 으로 만든다. */
export function isCanonicalToken(tok) { try { return b64u(unb64u(String(tok))) === String(tok); } catch { return false; } }
export async function tokenKey(tok) { const h = await crypto.subtle.digest('SHA-256', unb64u(String(tok))); return [...new Uint8Array(h).slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join(''); }
/** did → dh(해시 16자). 원문 did 는 어디에도 저장하지 않는다 */
export async function didHash(did) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('bo-school:' + did));
  return [...new Uint8Array(buf).slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** 판 결과 → 학교 점수(순수). won = 판을 클리어했나(실패·중간 나감 = false) */
export function resultPoints({ won }) {
  return T.SCHOOL_PTS[won ? 1 : 0];
}

// ── 학교 찾기(1.7.0 · 2026-10-18 사용자 «다른 게임도 학교 이름 모두 제대로 찾을 수 있게») ──
// 나이스는 인증키 없이 한 번에 5곳까지만 줘서 «중앙»(91곳)·«동산» 같은 흔한 이름은 우리 학교가 영영 안 나왔다.
// 허브에 실은 전체 목록(data/schools.js — 6,330곳)에서 찾는다: 띄어 쓴 낱말마다 «학교 이름 또는 지역(시도·시군구)»에 들어 있으면 고른다.
//   «김제 중앙» · «중앙초 김제» · «전북 중앙» · «서울 옥수» · «옥수초등학교» 다 된다. 목록에 없으면(새로 연 학교) 나이스에 묻는다(index.js).
import { SCHOOL_ROWS } from './data/schools.js';
let ROWS = null;
const normQ = (s) => String(s ?? '').normalize('NFC').replace(/[^0-9A-Za-z가-힣\s]/g, ' ').trim();
const stripKind = (t) => t.replace(/(초등학교|초등|초교|초)$/, '');
export function searchSchools(rawQ, sido = '', limit = 20) {
  if (!ROWS) ROWS = SCHOOL_ROWS.split('\n').map((l) => { const [code, name, sd, sgg] = l.split('|'); const base = name.replace(/초등학교$/, ''); return { code, name, sido: sd, sgg, base, hay: base, reg: `${SIDO[sd] || ''} ${sgg} ${sgg.replace(/[시군구]( |$)/g, '$1')}` }; });
  const toks = normQ(rawQ).split(/\s+/).map(stripKind).filter(Boolean).slice(0, 4); if (!toks.length || toks.join('').length > 24) return [];
  const whole = toks.join('');
  const out = [];
  for (const r of ROWS) {
    if (sido && r.sido !== sido) continue;
    let nameHit = 0, ok = true;
    for (const t of toks) { if (r.base.includes(t)) nameHit++; else if (!r.reg.includes(t)) { ok = false; break; } }
    if (!ok && toks.length === 1 && r.base.includes(whole)) ok = true;
    if (!ok || !nameHit) { if (!(ok && toks.length > 1 && r.base.includes(whole))) continue; }
    const score = r.base === whole || toks.some((t) => r.base === t) ? 0 : toks.some((t) => r.base.startsWith(t) || r.base.endsWith(t)) ? 1 : 2;
    out.push([score, r.base.length, r]);
  }
  out.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2].name.localeCompare(b[2].name, 'ko'));
  return out.slice(0, limit).map(([, , r]) => ({ code: r.code, name: r.name, sido: r.sido, region: [SIDO[r.sido], r.sgg].filter(Boolean).join(' ') }));
}
/** 코드로 한 곳 — 학교 저장(/select) 때 나이스 대신 목록으로 확인한다(외부 요청 0 · 1.12.0). 목록에 없으면 null(→ 나이스) */
export function schoolByCode(code, sido = '') {
  if (!ROWS) searchSchools('가');
  const r = ROWS.find((x) => x.code === String(code) && (!sido || x.sido === sido));
  return r ? { code: r.code, name: r.name, sido: r.sido, region: [SIDO[r.sido], r.sgg].filter(Boolean).join(' ') } : null;
}
