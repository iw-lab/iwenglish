/* gb-nick.js — 아이가 «직접 고르는» 별명(2026-11-04 사용자 «개인 식별은 안 되는데 개인별로 원하는 걸 만들게 · 전체 닉네임에 적용»).
 *   자유 입력 0 — 꾸밈말 하나 + 동물 하나를 정해 둔 낱말 목록에서 고른다(실명·학교·연락처가 들어갈 수 없다).
 *   게임 서버가 별명을 낱말 목록으로 다시 거르는 게임은 «그 게임의 목록»을 adj/noun 으로 넘긴다(목록이 다르면 서버가 막는다).
 *   학교는 별명에 넣지 않는다(«어느 학교가 수업 중에 게임하네» — 학교는 순위판 합계에만).
 *   개인 별명 순위판은 만들지 않는다(gate-baseline B16) — 별명은 «같은 판에서 누가 나인지» 알아보는 데만 쓴다.
 *   CSP 안전: HTML 문자열·인라인 꾸밈 0(textContent·className 만).
 */
export const NICK_ADJ = ['용감한', '씩씩한', '반짝이는', '날쌘', '느긋한', '다정한', '튼튼한', '명랑한', '슬기로운', '엉뚱한', '재빠른', '든든한', '신나는', '부지런한', '호기심 많은', '상냥한'];
export const NICK_NOUN = ['수달', '다람쥐', '호랑이', '토끼', '고래', '펭귄', '여우', '부엉이', '판다', '거북이', '너구리', '참새', '해달', '고양이', '강아지', '반달곰'];

const KEY = 'gb.nick';
/** 기본 꼴 «꾸밈말 동물» — 게임이 다른 꼴(붙여 쓰기·번호)을 쓰면 join/split 을 넘긴다 */
export const joinNick = (a, n) => `${a} ${n}`;
export function splitNick(v, adj = NICK_ADJ, noun = NICK_NOUN) {
  const s = String(v || '');
  const a = [...adj].sort((x, y) => y.length - x.length).find((w) => s.startsWith(w)) || '';
  const rest = s.slice(a.length).trim();
  const n = [...noun].sort((x, y) => y.length - x.length).find((w) => rest.startsWith(w)) || '';
  return { a, n };
}
/** 고른 별명이 목록 안의 낱말로만 되어 있나(게임 서버와 같은 기준) */
export function nickOk(v, { adj = NICK_ADJ, noun = NICK_NOUN, join = joinNick, split } = {}) {
  const { a, n } = (split || ((x) => splitNick(x, adj, noun)))(v);
  return !!a && !!n && adj.includes(a) && noun.includes(n) && join(a, n) === String(v);
}
export function loadNick(key = KEY) { try { return localStorage.getItem(key) || ''; } catch { return ''; } }
export function saveNick(v, key = KEY) { try { localStorage.setItem(key, v); } catch { /* 저장 못 해도 이번 판은 쓴다 */ } }

const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

/** 고르기 판(DOM) — 창 없이 게임 화면 안에 넣을 때. onChange(별명) 를 고를 때마다 부른다 */
export function nickPickerEl({ adj = NICK_ADJ, noun = NICK_NOUN, join = joinNick, split, value = '', onChange } = {}) {
  let { a, n } = (split || ((x) => splitNick(x, adj, noun)))(value);
  if (!adj.includes(a)) a = adj[0]; if (!noun.includes(n)) n = noun[0];
  const box = mk('div', 'gb-nick');
  const out = mk('div', 'gb-nick-out'); out.setAttribute('data-gb', 'nick-out'); out.setAttribute('aria-live', 'polite');
  const row = (list, cur, set, label) => {
    const w = mk('div', 'gb-nick-row'); w.setAttribute('role', 'radiogroup'); w.setAttribute('aria-label', label);
    for (const word of list) {
      const b = mk('button', 'gb-nick-chip' + (word === cur ? ' on' : ''), word); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(word === cur));
      b.addEventListener('click', () => { set(word); for (const x of w.children) { const on = x.textContent === word; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); } paint(); });
      w.append(b);
    }
    return w;
  };
  const paint = () => { const v = join(a, n); out.textContent = v; onChange && onChange(v); };
  box.append(out, mk('div', 'gb-nick-h', '꾸밈말'), row(adj, a, (x) => { a = x; }, '꾸밈말'), mk('div', 'gb-nick-h', '동물'), row(noun, n, (x) => { n = x; }, '동물'),
    mk('p', 'gb-nick-note', '정해진 낱말에서만 골라요 — 이름·학교는 들어가지 않아요'));
  paint();
  return box;
}

/** 창으로 고르기 — 고르면 저장하고 별명을, 그만두면 null */
export function openNickPicker({ title = '내 별명 만들기', key = KEY, ...opts } = {}) {
  return new Promise((done) => {
    let v = opts.value || loadNick(key);
    const back = mk('div', 'gb-modal-back gb-nick-back'); back.setAttribute('data-gb', 'nick-picker');
    const card = mk('div', 'gb-modal gb-nick-card'); card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-label', title);
    const close = (r) => { back.remove(); done(r); };
    const ok = mk('button', 'gb-play gb-nick-ok', '이 별명으로'); ok.type = 'button';
    const no = mk('button', 'gb-nick-cancel', '그만두기'); no.type = 'button';
    ok.addEventListener('click', () => { saveNick(v, key); close(v); });
    no.addEventListener('click', () => close(null));
    card.append(mk('h2', 'gb-nick-title', title), nickPickerEl({ ...opts, value: v, onChange: (x) => { v = x; } }), ok, no);
    back.append(card); document.body.append(back);
    ok.focus();
  });
}
/** 처음이면 고르게 하고, 이미 있으면 그대로 */
export async function ensureNick(opts = {}) {
  const have = loadNick(opts.key);
  if (have && nickOk(have, opts)) return have;
  return (await openNickPicker(opts)) || '';
}
