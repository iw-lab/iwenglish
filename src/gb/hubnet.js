/* hubnet.js — 학교 허브 클라이언트. 키트 정본 = ~/.claude/skills/game-builder/kit/school-hub/client (원본 비트:온 2026-10-10 ← 콩콩배구).
 * 같은 오리진 /api/hub/<경로> → 중계(Pages 함수 또는 Vercel Edge)가 daum 계정 허브 워커로 넘긴다.
 * 🎟 「문제 풀고 이용권 얻기」: 게임 1판 = 이용권 1장, 문제 묶음 통과 = 이용권 2장.
 * 🔴 허브에 닿지 못하면(학교망 장애·오프라인·로컬 정적 서버) 게임을 막지 않는다 — 그냥 하고 학교 점수만 없다.
 *    아이가 문제 서버 장애 때문에 수업 시간에 아무것도 못 하면 그건 고장이다.
 */
const cfg = { key: 'gb.hub.v1', base: 'api/hub/', timeoutMs: 6000, offline: false };
/** 게임마다 한 번: configureHub({ key: '<게임id>.hub.v1' }) — 같은 도메인의 다른 게임과 저장소 키가 안 겹치게 */
export function configureHub(o) {
  Object.assign(cfg, o || {});
  /* 직결(1.11.1): direct = 허브 워커 주소 — 로컬 시험(localhost·127.0.0.1·.test)이 아닐 때만 중계(/api/hub) 대신 워커로 바로 간다.
     daum Pages 함수 하루 10만 공용 한도가 넘으면 /api 가 첫 화면 html 로 바뀌어 순위가 죽었다(2026-10-19 밤). 로컬 시험은 가짜 중계를 그대로 쓴다 */
  if (cfg.direct && typeof location !== 'undefined' && !/^(localhost|127\.0\.0\.1|\[::1\])$|\.(test|localhost)$/.test(location.hostname)) cfg.base = cfg.direct.replace(/\/?$/, '/');
  hubState.school = localSchool();
}

/* 🏫 학교는 기기에 저장한다(1.6.1 · 2026-10-17 사용자 «한 번만 하면 반드시 로컬에 학교 저장»).
 *  예전엔 학교가 허브 서버에만 있었다 — 첫 /me 가 오기 전에 누르거나(아침 첫 접속 = 서버 콜드 스타트),
 *  허브 저장소가 바뀌거나 비면(계정 이사·DO 초기화) hubState.school 이 null 이라 «우리 학교 정하기»가 다시 떴다.
 *  이제 ① 기기 저장값으로 바로 시작하고 ② 서버가 «학교 없음»이라 하면 기기 값으로 서버를 조용히 되살린다. */
function localSchool() {
  const s = hubLoad().school;
  return s && typeof s.code === 'string' && s.code && typeof s.name === 'string' ? { code: s.code, name: s.name, sido: s.sido || '', region: s.region || '' } : null;
}
let restoring = false;
/** 같은 도메인의 다른 게임과 안 겹치는 저장소 키(문제 선호 등) */
export const hubKey = (suffix) => `${cfg.key}.${suffix}`;

export function hubLoad() { try { return JSON.parse(localStorage.getItem(cfg.key)) || {}; } catch { return {}; } }
export function hubSave(patch) { try { localStorage.setItem(cfg.key, JSON.stringify({ ...hubLoad(), ...patch })); } catch { /* 사생활 모드 */ } }

function hubDid() {
  let d = hubLoad().did;
  if (!/^[0-9a-f]{32}$/.test(d || '')) {
    d = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
    hubSave({ did: d });
  }
  return d;
}

async function hubCall(path, body, method = 'POST') {
  if (cfg.offline) throw new Error('hub offline');
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), cfg.timeoutMs);
  try {
    const r = await fetch(cfg.base + path, method === 'GET' ? { signal: ctl.signal, cache: 'no-store' } : {
      method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify({ ...body, did: hubDid() }), signal: ctl.signal,   // text/plain = 단순 요청 — 워커를 바로 부를 때(DIRECT_ORIGINS) 사전 확인(OPTIONS) 요청이 안 붙는다
      keepalive: true,   // 창을 닫는 순간(pagehide)의 정산도 끝까지 간다
    });
    const j = await r.json().catch(() => null);
    if (!j) throw new Error(`hub ${r.status}`);
    if (j.offline) throw new Error('hub offline');
    if (r.status >= 500) throw new Error(j.error || `hub ${r.status}`);
    return j;
  } finally { clearTimeout(tm); }
}

/** 상태 사본 — 화면 칩·관문이 읽는다. online: null(모름) · true · false */
export const hubState = { online: null, checkedAt: 0, free: false, tix: 0, school: null, todayPts: 0, cap: 40, pass: 4, q: 5, per: 2 };
const hubSubs = new Set();
const hubEmit = () => hubSubs.forEach((f) => { try { f(hubState); } catch { /* 화면 하나가 죽어도 나머지는 산다 */ } });
export const onHub = (f) => { hubSubs.add(f); return () => hubSubs.delete(f); };

function applyMe(j) {
  hubState.online = true; hubState.checkedAt = Date.now();
  if (typeof j.tix === 'number') hubState.tix = j.tix;
  if (typeof j.free === 'boolean') hubState.free = j.free;
  if ('school' in j) {
    const mine = localSchool();
    if (j.school) { hubState.school = j.school; hubSave({ school: { code: j.school.code, name: j.school.name, sido: j.school.sido || '', region: j.school.region || '' }, schoolName: j.school.name, schoolCode: j.school.code }); }
    else if (mine) {   // 서버만 잊었다 — 기기 값을 지키고 서버를 되살린다(서버가 NEIS 로 다시 확인한다)
      hubState.school = mine;
      if (!restoring && mine.sido) { restoring = true; void hubCall('select', { code: mine.code, sido: mine.sido }).catch(() => {}).finally(() => { restoring = false; }); }
    } else hubState.school = null;
  }
  for (const k of ['todayPts', 'cap', 'pass', 'q', 'per']) if (typeof j[k] === 'number') hubState[k] = j[k];
  hubEmit();
}
export async function refreshMe() {
  try {
    const j = await hubCall('me', {});
    // 🔴 403·400 처럼 «대답은 했지만 쓸 수 없는» 허브(중계 키 불일치 등)를 정상으로 읽으면 이용권 0인 아이가 문제 화면에 갇힌다(교차검증 codex)
    if (j.error || typeof j.tix !== 'number') throw new Error(j.error || 'me');
    applyMe(j);
    void flushPending();
  } catch { hubState.online = false; hubState.checkedAt = Date.now(); hubEmit(); }
  return hubState;
}
export async function searchSchool(q, sido = '') {
  const p = new URLSearchParams({ q }); if (sido) p.set('sido', sido);
  return hubCall(`school?${p}`, null, 'GET');
}
export async function selectSchool(code, sido) {
  const j = await hubCall('select', { code, sido });
  if (j.ok) applyMe({ school: j.school });
  return j;
}
export async function topSchools() { return hubCall(`schools?did=${hubDid()}`, null, 'GET'); }
export async function newPack(subject, grade) { return hubCall('pack', { subject, grade }); }
export async function gradePack(pid, answers) {
  const j = await hubCall('grade', { pid, answers });
  if (typeof j.tix === 'number') { hubState.tix = j.tix; hubEmit(); }
  return j;
}

/** 판 하나의 영수증 — 시작에 spend, 끝에 result, 금방 나가면 refund. ref = 기기가 만든 무작위(멱등 키) */
export function newRef(kind = 'play') {
  const r = [...crypto.getRandomValues(new Uint8Array(9))].map((b) => b.toString(36).padStart(2, '0')).join('');
  return `${kind}:${Date.now().toString(36)}:${r}`;
}
/** 🔴 응답 유실(학교망 순단)이 «영수증 없는 차감»이 되지 않게 같은 ref 로 한 번 더 — 서버가 멱등이다 */
export async function spendTicket(ref, kind = 'play') {
  for (let i = 0; i < 2; i++) {
    try {
      const j = await hubCall('spend', { ref, kind });
      if (typeof j.tix === 'number') { hubState.tix = j.tix; hubEmit(); }
      return j;
    } catch { /* 다시 */ }
  }
  hubState.online = false; hubState.checkedAt = Date.now(); hubEmit();
  return { ok: false, why: 'offline' };
}
export async function refundTicket(ref) {
  for (let i = 0; i < 2; i++) {   // spend·result 와 같이 같은 ref 로 한 번 더(서버 멱등)
    try { const j = await hubCall('refund', { ref }); if (typeof j.tix === 'number') { hubState.tix = j.tix; hubEmit(); } return j; }
    catch { /* 다시 */ }
  }
  return { ok: false };
}
export async function reportResult(ref, cleared) {
  for (let i = 0; i < 2; i++) {
    try {
      const j = await hubCall('result', { ref, won: !!cleared });
      if (j.ok && j.added) { hubState.todayPts += j.added; hubEmit(); }
      return j;
    } catch { /* 다시 — 같은 ref 라 두 번 들어가도 한 번만 점수 */ }
  }
  // 🔴 순단이면 미뤄 둔다 — 다음 refreshMe 성공 때 같은 ref 로 다시 보낸다(서버 멱등 · 교차검증 grok: 차감된 판의 점수가 영영 사라졌다)
  const pend = (hubLoad().pending || []).filter((p) => p.ref !== ref);
  pend.push({ ref, won: !!cleared, at: Date.now() });
  hubSave({ pending: pend.slice(-10) });
  return { ok: false, why: 'offline' };
}
let flushing = false;
async function flushPending() {
  const pend = hubLoad().pending || [];
  if (flushing || !pend.length) return;
  flushing = true;
  try {
    const left = [];
    for (const p of pend) {
      if (Date.now() - p.at > 170 * 60000) continue;   // 허브 RESULT_TTL(180분)을 넘기면 어차피 late
      try { await hubCall('result', { ref: p.ref, won: p.won }); } catch { left.push(p); }
    }
    hubSave({ pending: left });
  } finally { flushing = false; }
}

// configureHub 를 안 부르는 게임도 기기에 저장된 학교로 바로 시작한다
hubState.school = localSchool();
