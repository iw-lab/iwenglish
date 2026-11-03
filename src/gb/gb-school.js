/* gb-school.js — 첫 화면 학교 순위 카드 · 우리 학교 정하기 · 문제 풀고 이용권 받기 · 판 시작 관문.
 * 키트 정본 = ~/.claude/skills/game-builder/kit/school-hub/client (원본 비트:온 meta-ui.js 2026-10-10).
 * 화면은 엔진과 무관한 DOM 층(#gb-layer)에 그린다 — 캔버스·Phaser·Three 어느 게임에도 그대로 붙는다.
 *
 * 🔴 관문 규칙(gbGate): ① 자동 전체화면(제스처 안 동기) ② 허브가 죽었으면 그냥 한다(학교 점수만 없음)
 *    ③ 학교를 안 정했으면 학교부터(«목록에 없어요»를 고른 기기만 예외) ④ 이용권 없으면 문제부터 ⑤ 이용권 1장 쓰고 시작.
 * 🔴 학교는 공식 목록(NEIS)에서 고르기만 — 자유 입력 0. 서버가 NEIS 에 다시 물어 확인한 이름만 저장된다.
 * 🔴 첫 화면 학교 순위는 «맨 위·접지 않음·상위 5 + 우리 학교»(2026-10-10 사용자 «학교랭킹은 첫화면에 잘 보여줘 접지마»).
 * 🔴 1.4.0(2026-10-16 사용자 «5위까지만 … 더보기로 나머지 학교 순위도 다 · 참여학교 수·참여학생 수·하루 이용자수 등등을 첫화면에»):
 *    6개 이상이면 «더보기» → 전체 순위 창(오늘/이번 주) · 카드 맨 위 통계 줄 [data-gb=hub-stats](참여 학교·참여 기기·오늘 이용·오늘 판).
 *    «학생»이 아니라 «기기»라고 쓴다 — 계정이 없어 학생을 셀 수 없다(한 태블릿을 여럿이 쓰면 1). 게이트 = gate-baseline B11.
 */
import { hubState, hubLoad, hubSave, refreshMe, searchSchool, selectSchool, topSchools, newPack, gradePack,
  newRef, spendTicket, refundTicket, reportResult, onHub, hubKey } from './hubnet.js';
import { autoEnterFullscreen } from './gb-fullscreen.js';
import { gbIcon } from './gb-icons.js';
// 🔴 분수는 위아래로 쌓아 그린다 — 문항은 허브 «서버»가 만들어 보내서 게임 쪽 분수 게이트가 못 봤다(2026-10-12 티샷 사용자 제보 «2/3 + 2/4»).
//    gb-frac.js = kit/frac/frac.js 사본(install.sh 가 복사 — 정본은 하나)
import { fracHTML } from './gb-frac.js';

const SIDO = { B10: '서울', C10: '부산', D10: '대구', E10: '인천', F10: '광주', G10: '대전', H10: '울산', I10: '세종', J10: '경기',
  K10: '강원', M10: '충북', N10: '충남', P10: '전북', Q10: '전남', R10: '경북', S10: '경남', T10: '제주' };
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const shortSchool = (n) => String(n || '').replace(/초등학교$/, '초');

const opt = { playWord: '게임', sfx: null };
/** 게임마다 한 번: playWord = «판»/«곡»/«경기» 등 안내 문구에 들어갈 낱말, sfx = { tick(), win() } (선택) */
export function configureSchool(o) { Object.assign(opt, o || {}); }
// FREE_PLAY 게임 — 게임이 선언(configureSchool({ freePlay: true }))하거나 허브가 알려 주면(/me free) 이용권 화면·표시를 안 쓴다.
//   선언이 먼저다: 허브가 안 닿는 순간에도 «문제 풀고 이용권» 단추가 떠 있으면 안 된다.
const free = () => !!(opt.freePlay || hubState.free);

/* ── 공용 층 ─────────────────────────────────────────────── */
let layer = null;
function show(html) {
  if (!layer) { layer = document.createElement('div'); layer.id = 'gb-layer'; document.body.appendChild(layer); }
  layer.innerHTML = `<div class="gb-sheet" role="dialog" aria-modal="true">${html}</div>`;
  layer.hidden = false;
  return layer;
}
function hide() { qGen++; if (layer) { layer.hidden = true; layer.innerHTML = ''; } }
/** 덮개 세대 — 닫은 뒤 늦게 온 문제·채점 응답이 덮개를 게임 위에 다시 띄우지 않게(교차검증 codex) */
let qGen = 0;
const $ = (s) => layer.querySelector(s);
const $$ = (s) => layer.querySelectorAll(s);

/* ── 첫 화면 학교 순위 카드 ─────────────────────────────── */
let rankEl = null, rankData = null, rankBusy = false, rankAgain = false;
/** 첫 화면 «맨 위» 요소를 넘긴다. 접지 않는다. 다시 그릴 땐 refreshSchoolRank() */
export function mountSchoolRank(el) {
  rankEl = el; el.classList.add('gb-rank'); el.dataset.gb = 'school-rank';
  ensureSiteLink(); requestAnimationFrame(ensureSiteLink);   // 화면에 붙이기 전에 불러도 다음 그림·다음 칠하기에서 붙는다(1.14.1 · 축구 실측)
  paintRank();
  onHub(() => paintRank());
  refreshSchoolRank();
}
export async function refreshSchoolRank() {
  if (!rankEl) return;
  if (rankBusy) { rankAgain = true; return; }   // 🔴 바쁠 때 버리면 방금 낸 점수가 화면에 안 붙는다(교차검증 grok) — 끝나고 한 번 더
  rankBusy = true;
  try {
    if (hubState.online === null) await refreshMe();
    rankData = await topSchools();
  } catch { rankData = rankData || { failed: true, today: [], weekly: [] }; }
  finally { rankBusy = false; paintRank(); if (rankAgain) { rankAgain = false; void refreshSchoolRank(); } }
}
function paintRank() {
  if (!rankEl) return;
  ensureSiteLink();
  const d = rankData;
  const useToday = d && d.today && d.today.length;
  const rows = d ? (useToday ? d.today : d.weekly || []) : [];
  const period = useToday ? '오늘' : '이번 주';
  const mine = d && d.mine ? (useToday ? d.mine.today : d.mine.weekly) : null;
  const myCode = hubState.school && hubState.school.code;
  const top = rows.slice(0, 5);
  const st = d && d.stats;
  const n = (v) => (typeof v === 'number' ? v.toLocaleString('ko-KR') : '–');
  const stats = `<div class="gb-stats" data-gb="hub-stats">${[['참여 학교', st?.schools], ['참여 기기', st?.players], ['오늘 이용', st?.today], [`오늘 ${opt.playWord}`, st?.playsToday]]
    .map(([k, v]) => `<span><b>${n(v)}</b><small>${esc(k)}</small></span>`).join('')}</div>`;
  const li = (r, i, me) => `<li class="${me ? 'me' : ''}${i < 3 ? ' medal' : ''}"><span class="pos${i < 3 ? ` m${i + 1}` : ''}">${i + 1}</span><span class="nm">${esc(r.name)}${r.sido ? ` <small>${esc(r.sido)}</small>` : ''}</span><b class="pt">${r.s}</b></li>`;
  let body;
  if (!d) body = '<li class="dim">불러오는 중…</li>';
  else if (d.failed && !rows.length) body = '<li class="dim">순위를 불러오지 못했어요 — 인터넷을 확인해 주세요</li>';
  else if (!rows.length) body = '<li class="dim">아직 점수가 없어요 — 우리 학교가 첫 점수를 올려요!</li>';
  else {
    body = top.map((r, i) => li(r, i, r.code === myCode)).join('');
    if (myCode && mine && mine.rank > 5) body += `<li class="sep me"><span class="pos">${mine.rank}</span><span class="nm">${esc(shortSchool(hubState.school.name))}</span><b class="pt">${mine.s}</b></li>`;
  }
  const me = !hubState.school
    ? `<button class="gb-link" data-gb-act="school">${gbIcon('school')} 우리 학교 정하기</button>`
    : mine ? `<span class="gb-mine">${esc(shortSchool(hubState.school.name))} <b>${mine.rank}위</b>${mine.gap ? ` · 위 학교까지 ${mine.gap}점` : ' · 1등!'}</span>`
      : `<span class="gb-mine">${esc(shortSchool(hubState.school.name))} — 첫 점수를 올려요!</span>`;
  rankEl.dataset.gbV = '1.5'; rankEl.dataset.gbN = String(rows.length);   // 게이트 B11 이 «통계 줄·더보기»를 판정할 표지
  rankEl.innerHTML = `
    <div class="gb-rank-head"><b>${gbIcon('trophy')} 학교 순위</b><small>${period}</small>${free() ? '' : `<span class="gb-tix" title="이용권">${gbIcon('ticket')} ${hubState.online === false ? '–' : hubState.tix}</span>`}</div>
    ${stats}
    <ol class="gb-rank-list">${body}</ol>
    ${rows.length > 5 ? `<button class="gb-link gb-more" data-gb-act="more">전체 순위 보기 · ${rows.length.toLocaleString('ko-KR')}개 학교</button>` : ''}
    <div class="gb-rank-foot">${me}${free() ? '' : `<button class="gb-link" data-gb-act="quiz">${gbIcon('ticket')} 문제 풀고 이용권</button>`}</div>`;
  rankEl.querySelector('[data-gb-act="school"]')?.addEventListener('click', () => openSchool(() => hide())   /* 순위는 저장 직후 한 번 이미 다시 받는다 — 여기서 또 부르면 /schools 두 번(1.12.0) */);
  rankEl.querySelector('[data-gb-act="quiz"]')?.addEventListener('click', () => openQuiz(null));
  rankEl.querySelector('[data-gb-act="more"]')?.addEventListener('click', () => openRankAll(useToday ? 'd' : 'w'));
}

/* ── 첫 화면 선행쌤 배너(1.14.0 맨 아래 → 1.15.0 순위 카드 바로 밑·화려하게) ──
 * 2026-10-22 «모든게임 대시보드 첫화면 아래에 선행쌤 사이트 링크 걸자» → 2026-10-23 «첫화면에 링크 위쪽에 잘보이게 화려하게 눈길끌게 · 모든 앱»
 * (자리 = 사용자 선택 «순위 카드 바로 아래» — 학교 순위는 맨 위 그대로).
 * 순위 카드 «바로 다음 형제»로 저절로 붙는다 — 게임마다 따로 안 고쳐도 된다. 첫 화면을 다시 그려 지워져도 다음 칠하기에서 돌아온다.
 * mountSiteLink(요소) 는 순위 카드가 없는 화면에서만 자리로 쓴다(1.15.0 — 모든 앱이 같은 자리에 둔다).
 * body 에는 붙이지 않는다(게임 중에도 보인다). 게이트 = gate-baseline B12 · site-link-check(순위 바로 밑·첫 화면 안·움직이는 배너). */
// 1.15.1 — 학교 망이 새 도메인 ssamzip.com 을 막아(2026-10-26) 배너를 눌러도 빈 화면 → «두 문» 주소.
//   🔴 2026-10-28 바뀜: 두 문은 이제 ssamzip.com 으로 **넘기지 않고 제자리에 머문다**(simteacher src/lib/oldHostRedirect.ts).
//   넘기면 검색엔진이 따라가 두 문을 색인하지 않아, 막힌 망에서는 검색으로 들어갈 길이 사라지기 때문이다.
//   그래서 배너는 어느 망에서나 열리는 이 주소 하나만 쓴다 — 내용은 본 주소와 같다. 🔒 tests/site-link.test.mjs
export const SITE_LINK = 'https://sunhaengssam.web.app';
let siteHost = null;   // 순위 카드가 없는 화면에서 게임이 mountSiteLink(요소)로 정한 자리
/** 순위 카드가 화면에 붙어 있는데 링크가 없으면 붙인다 — 첫 화면을 다시 그려 링크가 지워져도 다음 칠하기에서 돌아온다 */
function ensureSiteLink() {
  if (!rankEl || !rankEl.isConnected) return;
  const a = document.querySelector('[data-gb="site-link"]');
  if (a && a.isConnected && a.previousElementSibling === rankEl) return;
  const host = rankEl.parentElement;
  if (!host || host === document.body || host === document.documentElement) return;
  rankEl.after(siteLinkEl());
}
function siteLinkEl() {
  let a = document.querySelector('[data-gb="site-link"]');
  if (!a) {
    a = document.createElement('a'); a.dataset.gb = 'site-link'; a.className = 'gb-site';
    a.href = SITE_LINK; a.target = '_blank'; a.rel = 'noopener';
    a.innerHTML = `<span class="gb-site-ic">${gbIcon('sparkle')}</span><span class="gb-site-tx"><b>선행쌤</b><small>선생님이 만든 수업 놀이 더 보기</small></span><span class="gb-site-go">가 보기${gbIcon('out')}</span>`;
  }
  return a;
}
export function mountSiteLink(host) {
  if (!host || host === document.body || host === document.documentElement) return null;
  siteHost = host;
  if (rankEl && rankEl.isConnected) { ensureSiteLink(); return document.querySelector('[data-gb="site-link"]'); }   // 순위 카드가 있으면 그 바로 밑이 자리다
  const a = siteLinkEl(); host.appendChild(a); return a;
}

/* ── 전체 순위(더보기) ───────────────────────────────────── */
export function openRankAll(which = 'd') {
  const d = rankData || {};
  const tabs = [['d', '오늘', d.today || []], ['w', '이번 주', d.weekly || []]];
  const myCode = hubState.school && hubState.school.code;
  const paint = (w) => {
    const [, label, rows] = tabs.find((t) => t[0] === w) || tabs[0];
    const mine = d.mine ? (w === 'd' ? d.mine.today : d.mine.weekly) : null;
    const list = rows.length ? rows.map((r, i) => `<li class="${r.code === myCode ? 'me' : ''}${i < 3 ? ' medal' : ''}"${r.code === myCode ? ' data-gb-me' : ''}><span class="pos${i < 3 ? ` m${i + 1}` : ''}">${i + 1}</span><span class="nm">${esc(r.name)}${r.sido ? ` <small>${esc(r.sido)}</small>` : ''}</span><b class="pt">${r.s}</b></li>`).join('')
      : `<li class="dim">${label} 점수가 아직 없어요</li>`;
    const extra = myCode && mine && !rows.some((r) => r.code === myCode) ? `<li class="sep me"><span class="pos">${mine.rank}</span><span class="nm">${esc(shortSchool(hubState.school.name))}</span><b class="pt">${mine.s}</b></li>` : '';
    show(`
      <div class="gb-rank-all" data-gb="rank-all">
        <h2>${gbIcon('trophy')} 학교 순위</h2>
        <div class="gb-tabs" role="tablist">${tabs.map(([k, l, r]) => `<button class="gb-tab${k === w ? ' on' : ''}" role="tab" aria-selected="${k === w}" data-tab="${k}">${l} · ${r.length}</button>`).join('')}</div>
        <ol class="gb-rank-list gb-rank-scroll">${list}${extra}</ol>
        <div class="gb-btns"><button class="gb-btn ghost" data-gb-back>닫기</button></div>
      </div>`);
    $$('[data-tab]').forEach((b) => b.addEventListener('click', () => paint(b.dataset.tab)));
    $('[data-gb-back]').addEventListener('click', hide);
    $('[data-gb-me]')?.scrollIntoView({ block: 'center' });
  };
  paint(which);
}

/* ── 우리 학교 정하기 ─────────────────────────────────────── */
let schoolThen = null;
export function openSchool(then = null) {
  schoolThen = then;
  show(`
    <div class="gb-school" data-gb="school-pick">
      <h2>${gbIcon('school')} 우리 학교 정하기</h2>
      <p class="gb-hint">학교 이름만 골라요 — 순위에는 <b>학교별 합계</b>만 보여요. 이름·반은 받지 않아요.</p>
      <div class="gb-row">
        <select data-gb-sido aria-label="시도"><option value="">전국</option>${Object.entries(SIDO).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
        <input data-gb-q type="search" inputmode="search" maxlength="12" placeholder="학교 이름 (예: 한빛)" aria-label="학교 이름" />
        <button class="gb-btn" data-gb-find>찾기</button>
      </div>
      <ul class="gb-list" data-gb-results></ul>
      <p class="gb-msg" data-gb-msg></p>
      <div class="gb-btns">
        ${then ? '<button class="gb-link" data-gb-none>우리 학교가 목록에 없어요 (학교 점수 없이 할게요)</button>' : ''}
        <button class="gb-btn ghost" data-gb-back>${then ? '취소' : '닫기'}</button>
      </div>
    </div>`);
  const find = () => findSchool();
  $('[data-gb-find]').onclick = find;
  $('[data-gb-q]').onkeydown = (e) => { if (e.key === 'Enter') find(); };
  $('[data-gb-back]').onclick = () => { schoolThen = null; hide(); };
  const none = $('[data-gb-none]');
  if (none) none.onclick = () => { hubSave({ noSchool: true }); const go = schoolThen; schoolThen = null; hide(); go && go(); };
  setTimeout(() => $('[data-gb-q]')?.focus(), 50);
}
let schoolSearchMod = null;   // 학교 목록 모듈(한 번만 받는다)
async function findSchool() {
  const q = $('[data-gb-q]').value.trim(), sido = $('[data-gb-sido]').value;
  const msg = $('[data-gb-msg]'), out = $('[data-gb-results]');
  if (!q) { msg.textContent = '학교 이름을 한 글자 이상 써 주세요'; return; }
  msg.textContent = '찾는 중…'; out.innerHTML = '';
  try {
    /* 기기에서 먼저 찾는다(1.12.0) — 전국 초등학교 목록(정적 파일 · 처음 한 번 받고 캐시)이라 찾기마다 서버 요청 0.
       목록에 없을 때만(새로 연 학교) 허브에 묻는다(허브가 나이스로) */
    let j = null;
    try { const m = await (schoolSearchMod ||= import('./gb-school-search.js')); const list = m.searchSchools(q, sido); if (list.length) j = { list }; } catch { schoolSearchMod = null; }
    j ||= await searchSchool(q, sido);
    const list = j.list || [];
    msg.textContent = list.length ? '' : j.error ? '학교 목록 서버가 잠시 대답이 없어요' : '찾는 학교가 없어요 — 시도를 고르거나 이름을 줄여 보세요';
    out.innerHTML = list.map((s, i) => `<li><button class="gb-pick" data-i="${i}">${esc(s.name)} <small>${esc(s.region || SIDO[s.sido] || '')}</small></button></li>`).join('');
    out.querySelectorAll('[data-i]').forEach((b) => b.onclick = async () => {
      const sc = list[Number(b.dataset.i)];
      if (schoolThen) autoEnterFullscreen();   // 저장(await) 뒤엔 제스처가 끝난다 — 고르는 클릭 순간에
      msg.textContent = '저장 중…';
      try {
        const r = await selectSchool(sc.code, sc.sido);
        if (r.ok) { hubSave({ noSchool: false }); const go = schoolThen; schoolThen = null; hide(); refreshSchoolRank(); go && go(); return; }
        msg.textContent = r.error === 'today' ? (r.per > 1 ? `학교는 하루에 ${r.per}번까지 바꿀 수 있어요 — 내일 다시 바꿀 수 있어요` : '학교는 하루에 한 번만 바꿀 수 있어요') : '저장하지 못했어요 — 다시 해 주세요';
      } catch { msg.textContent = '서버가 잠시 대답이 없어요 — 다시 해 주세요'; }
    });
  } catch { msg.textContent = '서버가 잠시 대답이 없어요 — 인터넷을 확인해 주세요'; }
}

/* ── 문제 풀고 이용권 받기 ───────────────────────────────── */
const quizPref = () => { try { const j = JSON.parse(localStorage.getItem(hubKey('quiz'))) || {}; return { s: ['eng', 'music', 'math'].includes(j.s) ? j.s : (opt.quizSubject || 'math'), g: j.g >= 1 && j.g <= 6 ? j.g : 3 }; } catch { return { s: opt.quizSubject || 'math', g: 3 }; } };
const saveQuizPref = (p) => { try { localStorage.setItem(hubKey('quiz'), JSON.stringify(p)); } catch { /* */ } };
const qz = { pack: null, i: 0, answers: [], busy: false, passed: false, msg: '', review: '' };
let quizThen = null;

export function openQuiz(then = null, why = '') {
  qGen++;
  quizThen = then;
  Object.assign(qz, { pack: null, i: 0, answers: [], busy: false, passed: false, review: '', msg: why });
  renderQuiz();
}
function renderQuiz() {
  const pref = quizPref();
  const lo = pref.s === 'math' ? 1 : 3;   // 영어·음악 교과는 3학년부터
  if (pref.g < lo) pref.g = lo;
  const grades = []; for (let g = lo; g <= 6; g++) grades.push(`<button class="gb-pill ${g === pref.g ? 'on' : ''}" data-grade="${g}">${g}학년</button>`);
  const q = qz.pack && qz.pack.qs[qz.i];
  const body = qz.review ? `<div class="gb-review">${qz.review}</div>`
    : q ? `<div class="gb-qprog">${qz.pack.qs.map((_, k) => `<i class="${k < qz.i ? 'done' : k === qz.i ? 'now' : ''}"></i>`).join('')}</div>
           <p class="gb-qtext">${fracHTML(q.text)}</p>
           <div class="gb-choices">${q.choices.map((c, k) => `<button class="gb-choice" data-pick="${k}">${fracHTML(c)}</button>`).join('')}</div>`
      : '';
  const goLabel = qz.passed ? (quizThen ? `${gbIcon('play')} ${opt.playWord} 시작` : '한 묶음 더 풀기') : qz.pack ? '처음부터 다시' : qz.review ? '다시 도전' : '문제 시작';
  show(`
    <div class="gb-quiz" data-gb="quiz">
      <h2>${gbIcon('ticket')} 문제 풀고 이용권 받기</h2>
      <p class="gb-hint">${hubState.q}문제 중 <b>${hubState.pass}개</b> 맞히면 <b>이용권 ${hubState.per}장</b> · ${opt.playWord} 한 판 = 이용권 1장 · 지금 <b>${hubState.tix}장</b></p>
      ${qz.pack ? '' : `<div class="gb-opts">
        <div class="gb-seg">${[['math', '수학'], ['eng', '영어'], ['music', '음악']].map(([v, t]) => `<button class="gb-pill ${pref.s === v ? 'on' : ''}" data-subj="${v}">${t}</button>`).join('')}</div>
        <div class="gb-seg">${grades.join('')}</div></div>`}
      ${body}
      <p class="gb-msg" data-frac-ok>${qz.msg}</p>
      <div class="gb-btns">
        <button class="gb-btn" data-qgo ${qz.busy ? 'disabled' : ''}>${goLabel}</button>
        <button class="gb-btn ghost" data-qback>${quizThen ? '취소' : '닫기'}</button>
      </div>
    </div>`);
  $$('[data-subj]').forEach((b) => b.onclick = () => { saveQuizPref({ ...pref, s: b.dataset.subj }); renderQuiz(); });
  $$('[data-grade]').forEach((b) => b.onclick = () => { saveQuizPref({ ...pref, g: Number(b.dataset.grade) }); renderQuiz(); });
  $$('[data-pick]').forEach((b) => b.onclick = () => pickAnswer(Number(b.dataset.pick)));
  $('[data-qgo]').onclick = () => startPack();
  $('[data-qback]').onclick = () => { quizThen = null; hide(); paintRank(); };
  const free = $('[data-qfree]');
  // «그냥 하기» = 이번 판만 학교 점수 없이(허브 전체를 오프라인으로 찍지 않는다 — 교차검증 grok)
  if (free) free.onclick = () => { autoEnterFullscreen(); const go = quizThen; quizThen = null; hide(); go && go(true); };
}
function pickAnswer(k) {
  if (!qz.pack || qz.busy) return;
  qz.answers[qz.i] = k; qz.i += 1;
  opt.sfx?.tick?.();
  if (qz.i < qz.pack.qs.length) renderQuiz(); else submitPack();
}
async function submitPack() {
  qz.busy = true; qz.msg = '채점 중…'; renderQuiz();
  const pack = qz.pack, gen = qGen;
  try {
    let j = await gradePack(pack.pid, qz.answers);
    if (j.tooFast) { await new Promise((r) => setTimeout(r, Math.min(8000, j.waitMs + 200))); j = await gradePack(pack.pid, qz.answers); }
    if (gen !== qGen) return;
    if (j.error) throw new Error(j.error);
    qz.review = pack.qs.map((q, k) => `<div class="${j.right[k] ? 'ok' : 'no'}">${gbIcon(j.right[k] ? 'check' : 'x', j.right[k] ? 'gb-ic-ok' : 'gb-ic-no')} ${fracHTML(q.text.replace('= ?', '').replace('→ ?', '→'))} <b>${fracHTML(q.choices[j.answers[k]])}</b></div>`).join('');
    if (j.ticket) { qz.passed = true; qz.msg = `${gbIcon('sparkle')} ${j.total}문제 중 ${j.correct}문제 정답! <b>이용권 +${j.ticket}</b> (지금 ${j.tix}장)`; opt.sfx?.win?.(); }
    else { qz.passed = false; qz.msg = `${j.total}문제 중 ${j.correct}문제 — <b>${j.pass}개</b> 이상 맞히면 이용권! 다시 도전해요`; }
  } catch {
    // 🔴 채점 서버만 죽어도 이용권 0 인 아이가 갇힌다 — 시작 관문에서 왔으면 «그냥 하기» 출구(교차검증 codex)
    qz.msg = quizThen ? '채점 서버가 잠시 대답이 없어요. <button class="gb-link" data-qfree>학교 점수 없이 그냥 하기</button>' : '채점 서버가 잠시 대답이 없어요. 조금 뒤에 다시 해 주세요.';
  } finally { if (gen === qGen) { qz.pack = null; qz.busy = false; renderQuiz(); } }
}
async function startPack() {
  if (qz.busy) return;
  if (qz.passed && quizThen) { const go = quizThen; quizThen = null; qz.passed = false; hide(); go(); return; }
  qz.busy = true; qz.passed = false; qz.review = ''; qz.msg = '문제 가져오는 중…'; renderQuiz();
  const gen = qGen;
  try {
    const pref = quizPref();
    const p = await newPack(pref.s, pref.g);
    if (gen !== qGen) return;
    if (!p || !p.qs || !p.qs.length) throw new Error('pack');
    Object.assign(qz, { pack: p, i: 0, answers: [], msg: '' });
  } catch {
    // 🔴 문제 서버가 죽었는데 이용권이 0이면 아이가 이 화면에 갇힌다 — «그냥 하기»로 빠져나갈 문을 연다(교차검증 codex)
    qz.msg = quizThen ? `문제 서버에 닿지 않아요. <button class="gb-link" data-qfree>학교 점수 없이 그냥 하기</button>` : '문제 서버에 닿지 않아요. 인터넷을 확인해 주세요.';
  } finally { if (gen === qGen) { qz.busy = false; renderQuiz(); } }
}

/* ── 판 시작 관문 · 정산 ──────────────────────────────────── */
/**
 * 시작 단추 클릭 핸들러에서 «바로» 부른다: gbGate((ref) => startGame(ref), { kind: 'level' }).
 * ref = 이번 판 영수증(허브가 죽었으면 null). 판이 끝나면 gbFinish(ref, cleared), 중간에 나가면 gbLeave(ref).
 */
let gating = false;
export async function gbGate(go, { kind = 'play', chain = false } = {}) {
  autoEnterFullscreen();   // 🔴 맨 첫 줄 — await 전(제스처 안)이어야 브라우저가 받아 준다
  // 🔴 시작 단추 두 번 누름(아이들은 자주 그런다) = 이용권 2장·게임 두 번 시작 — 관문 하나가 도는 동안 다음 것은 버린다
  if (gating) return;
  gating = true;
  try { await (chain ? chainOnce(go, kind) : gateOnce(go, kind)); } finally { gating = false; }
}
/**
 * 🔗 이어 하기(1.13 · 2026-10-22 보카웜 사용자 «게임할 때는 문제 빼라» — 결과 화면 «다음 단계·다시 도전»에서 문제 창이 떠
 * 게임 도중처럼 느껴졌다). 결과 화면에서 바로 다음 판으로 갈 땐 **문제 창을 절대 띄우지 않는다**:
 * 이용권이 있으면 조용히 1장 쓰고(학교 점수 그대로), 없거나 허브가 안 닿으면 점수 없이 바로 시작한다.
 * 첫 화면의 시작 단추는 그대로 gbGate(go) — 문제는 판 «밖»에서만 푼다.
 */
async function chainOnce(go, kind) {
  if (hubState.online === false || !hubState.school || hubState.tix <= 0) { go(null); return; }
  const ref = newRef(kind);
  const r = await spendTicket(ref, kind);
  if (r.ok || r.why === 'offline') { liveRef = { ref, at: Date.now() }; go(ref); return; }
  go(null);
}
async function gateOnce(go, kind) {
  // 모름이거나, «안 닿음» 판정이 1분 넘게 묵었으면 다시 본다 — 한 번 순단이 세션 끝까지 학교 점수를 끊지 않게(교차검증 grok)
  if (hubState.online === null || (hubState.online === false && Date.now() - (hubState.checkedAt || 0) > 60000)) await refreshMe();
  if (hubState.online === false) { go(null); return; }
  if (!hubState.school && !hubLoad().noSchool) { openSchool(() => gbGate(go, { kind })); return; }
  // 문제 화면의 «그냥 하기»(free=true)면 이번 판만 점수 없이 바로 시작
  const retry = (free) => (free ? go(null) : gbGate(go, { kind }));
  // FREE_PLAY 허브면 이용권 화면을 건너뛴다(서버가 판마다 1장 넣고 바로 쓴다)
  if (hubState.tix <= 0 && !free()) { openQuiz(retry, `${gbIcon('ticket')} 이용권이 없어요 — 문제를 풀면 바로 ${opt.playWord}할 수 있어요!`); return; }
  const ref = newRef(kind);
  const r = await spendTicket(ref, kind);
  if (r.ok) { liveRef = { ref, at: Date.now() }; go(ref); return; }
  if (r.why === 'ticket' && !free()) { openQuiz(retry, `${gbIcon('ticket')} 이용권이 없어요 — 문제를 풀면 바로 시작해요!`); return; }
  // 🔴 순단 = 차감이 커밋됐는지 모른다 — ref 를 버리지 않고 넘긴다. 끝·이탈에서 같은 ref 로 result/refund(서버 멱등 · 안 깎였으면 조용히 거절)
  //    (교차검증 codex·grok: ref 를 버리면 «깎였는데 정산 길이 없는» 이용권이 생긴다)
  if (r.why === 'offline') { liveRef = { ref, at: Date.now() }; go(ref); return; }
  go(null);
}
let liveRef = null;
/** 판이 끝남(이김·짐 모두). 학교 점수 결과 {added, school} 를 돌려준다(없으면 null) */
export async function gbFinish(ref, cleared) {
  if (!ref) return null;
  if (liveRef && liveRef.ref === ref) liveRef = null;
  const j = await reportResult(ref, cleared);
  if (j && j.ok && j.top && rankEl) { rankData = j.top; paintRank(); }   // 결과에 순위가 같이 온다(1.12.0) — /schools 를 또 부르지 않는다
  else refreshSchoolRank();
  return j && j.ok ? j : null;
}
/** 판 중간에 나감 — 90초 안이면 이용권 환불, 넘었으면 «끝까지 못 감»(1점)으로 정산 */
export async function gbLeave(ref) {
  if (!ref) return null;
  const fresh = liveRef && liveRef.ref === ref && Date.now() - liveRef.at < 85_000;
  if (liveRef && liveRef.ref === ref) liveRef = null;
  if (fresh) {
    const r = await refundTicket(ref);
    if (r && r.ok) return null;   // 환불 = 점수 없음 → 순위가 안 바뀌니 다시 받지 않는다(1.12.0)
    // 환불 창(서버 90초)을 넘겼거나 거절 — «끝까지 못 감»으로 닫는다(교차검증 codex·grok: 이용권만 깎이고 정산 0)
  }
  return gbFinish(ref, false);
}

// 탭을 닫거나 다른 주소로 떠날 때 진행 중 판을 정산한다(keepalive — hubnet). 앱 전환(visibilitychange)엔 안 건다 — 돌아와 이어 할 수 있다
addEventListener('pagehide', (e) => { if (!e.persisted && liveRef) void gbLeave(liveRef.ref); });
