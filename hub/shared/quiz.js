import { createRng } from './rng.js';
import { WORDS } from './data/words.js';
// 꿀꺽 행성 quiz.js(2026-10-09)에서 옮겼다 — 경기권 문제 묶음 전용(허브가 출제·채점, 브라우저는 보여주기만).

// 문항은 코드가 «생성»한다(데이터 손입력 아님). 같은 시드 → 같은 문항 → 리플레이·서버 재계산 결정론.
// 🔴 카드가 열려 있는 동안 «보자마자 아는» 범위만 낸다 — 학습 10% 의 목적은 유창성 유지이지 새 개념 학습이 아니다.

// 🔴 정답 위치 «덱» — 위치 0·1·2 를 «한 장씩» 넣고 셔플해 뽑는다.
//    더 나은 셔플이 아니라 «구조»로 균등을 보장한다(SKILL 절대규칙 ⑨ · L-109).
//    ⚠️ 2장씩 넣은 6장 덱에서 앞 3장만 쓰면 «각 위치 1회»가 되는 확률이 40% 뿐이라
//       판 단위 균등이 깨진다(교차검증 지적 — 총합만 균등해 게이트는 통과했었다).
function makePositionDeck(rnd) {
  const deck = [0, 1, 2];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// 🔵 2026-10-11 다시 짰다 — 이 문제는 «게임 도중 1~2초 암산»(꿀꺽 행성 원본)이 아니라 «노래 전에 차분히 푸는 관문»이다.
//    예전 판은 5학년에 «82−44»(2학년 내용)가, 6학년에 «900÷3» 같은 쉬운 연산만 나왔다(사용자 「학년별 세팅 제대로 한 거 맞아?」).
//    학년마다 교육과정 연산 범위를 따른다: 1 한 자리 덧뺄셈·(십몇)−(몇) / 2 받아올림·내림 두 자리·곱셈구구 /
//    3 세 자리 덧뺄셈·(두 자리)×(한 자리)·나눗셈 / 4 곱셈·나눗셈·같은 분모 분수·소수 덧뺄셈 /
//    5 혼합계산·다른 분모 분수 덧셈·분수×자연수·소수×자연수 / 6 분수÷자연수·소수÷자연수·비율·비례식.
//    🔴 오답은 «아이들이 실제로 하는 실수»로 만든다(받아내림 빠뜨림·분자분모 따로 더함·자릿수 착각) — |정답−b| 같은 엉뚱한 수 금지.
const gcd = (x, y) => (y ? gcd(y, x % y) : Math.abs(x));
const frac = (n, d) => { const g = gcd(n, d); n /= g; d /= g; return d === 1 ? String(n) : `${n}/${d}`; };
const dec = (x) => String(Math.round(x * 100) / 100);
function mathQ(rnd, grade) {
  const R = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  let text, ans, wrongs = [];
  const r = rnd();
  if (grade === 1) {
    if (r < 0.4) { const a = R(3, 9), b = R(3, 9); text = `${a} + ${b} = ?`; ans = a + b; wrongs = [ans - 1, ans + 1, ans + 10 > 20 ? ans - 2 : ans + 2]; }
    else if (r < 0.75) { const a = R(11, 18), b = R(2, 9); text = `${a} − ${b} = ?`; ans = a - b; wrongs = [ans + 1, ans - 1, a - 10 + b]; }
    else { const a = R(2, 8) * 10 + R(1, 4), b = R(1, 5); text = `${a} + ${b} = ?`; ans = a + b; wrongs = [ans + 10, ans - 1, ans + 1]; }
  } else if (grade === 2) {
    if (r < 0.35) {   // 받아올림 있는 두 자리 덧셈
      let a, b; do { a = R(15, 79); b = R(15, 89 - a + 10); } while ((a % 10) + (b % 10) < 10 || a + b > 99);
      text = `${a} + ${b} = ?`; ans = a + b; wrongs = [ans - 10, ans + 10, ans + 1];
    } else if (r < 0.7) {   // 받아내림 있는 두 자리 뺄셈 — 흔한 실수: 일의 자리를 «큰 수−작은 수»로
      let a, b; do { a = R(31, 98); b = R(12, a - 5); } while ((a % 10) >= (b % 10));
      text = `${a} − ${b} = ?`; ans = a - b;
      const slip = (Math.floor(a / 10) - Math.floor(b / 10)) * 10 + ((b % 10) - (a % 10));
      wrongs = [slip, ans + 10, ans - 1];
    } else { const a = R(2, 9), b = R(2, 9); text = `${a} × ${b} = ?`; ans = a * b; wrongs = [a * (b + 1), a * (b - 1) || ans + a, ans + 1]; }
  } else if (grade === 3) {
    if (r < 0.35) { const a = R(120, 680), b = R(110, 300); const add = rnd() < 0.5;
      if (add) { text = `${a} + ${b} = ?`; ans = a + b; wrongs = [ans + 100, ans - 10, ans + 10]; }
      else { const big = Math.max(a, b) + 200, sm = Math.min(a, b); text = `${big} − ${sm} = ?`; ans = big - sm; wrongs = [ans - 100, ans + 10, ans - 10]; } }
    else if (r < 0.7) { const a = R(12, 49), b = R(3, 9); text = `${a} × ${b} = ?`; ans = a * b; wrongs = [(Math.floor(a / 10) * b) * 10 + (a % 10) * b % 10, ans + b, ans - 10]; }
    else { const b = R(3, 9), q = R(11, 25); const a = b * q; text = `${a} ÷ ${b} = ?`; ans = q; wrongs = [q + 1, q - 1, q + 10]; }
  } else if (grade === 4) {
    if (r < 0.3) { const a = R(12, 45) * 10, b = R(2, 9) * 10; text = `${a} × ${b} = ?`; ans = a * b; wrongs = [ans / 10, ans * 10, ans + a]; }
    else if (r < 0.55) { const b = R(12, 25), q = R(12, 39); const a = b * q; text = `${a} ÷ ${b} = ?`; ans = q; wrongs = [q + 1, q - 1, q + 10]; }
    else if (r < 0.8) { const d = pick([5, 6, 7, 8, 9, 10, 11, 12]); const x = R(1, d - 2), y = R(1, d - 1 - x);
      text = `${x}/${d} + ${y}/${d} = ?`; ans = `${x + y}/${d}`; wrongs = [`${x + y}/${d * 2}`, `${x + y + 1}/${d}`, `${Math.abs(x - y) || x + y + 2}/${d}`]; }
    else { const a = R(11, 59) / 10, b = R(11, 39) / 10; text = `${dec(a)} + ${dec(b)} = ?`; ans = dec(a + b); wrongs = [dec(a + b + 1), dec(a + b - 0.1), dec(a + b + 0.1)]; }
  } else if (grade === 5) {
    if (r < 0.25) { const a = R(5, 30), b = R(2, 9), c = R(2, 9); text = `${a} + ${b} × ${c} = ?`; ans = a + b * c; wrongs = [(a + b) * c, ans + 1, ans - b]; }
    else if (r < 0.55) { const [d1, d2] = pick([[2, 3], [2, 5], [3, 4], [2, 7], [3, 5], [4, 5], [3, 8], [5, 6]]); const n1 = R(1, d1 - 1), n2 = R(1, d2 - 1);
      text = `${n1}/${d1} + ${n2}/${d2} = ?`; ans = frac(n1 * d2 + n2 * d1, d1 * d2); wrongs = [`${n1 + n2}/${d1 + d2}`, `${n1 + n2}/${d1 * d2}`, frac(n1 * d2 + n2 * d1 + 1, d1 * d2)]; }
    else if (r < 0.8) { const d = pick([3, 4, 5, 6, 8]), n = R(1, d - 1), k = d * R(1, 3); text = `${n}/${d} × ${k} = ?`; ans = frac(n * k, d); wrongs = [frac(n * k, d * k), frac(n + k, d), frac(n * k + d, d)]; }
    else { const a = R(2, 9) / 10, b = R(3, 9); text = `${dec(a)} × ${b} = ?`; ans = dec(a * b); wrongs = [dec(a * b * 10), dec(a * b / 10), dec(a * b + 0.1)]; }
  } else {
    if (r < 0.3) { const d = pick([3, 4, 5, 7, 9]), k = R(2, 4), n = k * R(1, Math.floor((d - 1) / 1)); const nn = Math.min(n, d * 2);
      text = `${nn}/${d} ÷ ${k} = ?`; ans = frac(nn, d * k); wrongs = [frac(nn * k, d), frac(nn, d + k), frac(nn + k, d * k)]; }
    else if (r < 0.55) { const b = R(2, 6), q = R(11, 49) / 10; const a = Math.round(q * b * 10) / 10; text = `${dec(a)} ÷ ${b} = ?`; ans = dec(q); wrongs = [dec(q * 10), dec(q + 0.1), dec(q / 10)]; }
    else if (r < 0.8) { const tot = pick([20, 25, 40, 50, 200]); const part = tot * pick([0.1, 0.2, 0.25, 0.4, 0.5, 0.6, 0.75]); text = `${tot}개 중 ${part}개는 몇 %?`; ans = `${Math.round(part / tot * 100)}%`;
      wrongs = [`${part}%`, `${Math.round(part / tot * 100) + 5}%`, `${Math.round(100 - part / tot * 100)}%`]; }
    else { const a = R(2, 5), b = R(a + 1, 9), k = R(2, 6); text = `${a} : ${b} = ${a * k} : □`; ans = b * k; wrongs = [b + k, a * k + (b - a), b * k + 1]; }
  }
  text = text.replace(/\s+$/, '');
  const A = String(ans);
  const ws = [...new Set(wrongs.map(String))].filter((w) => w !== A && !/^-|NaN|Infinity|^0$|^0\/|\/0$/.test(w));
  for (let k = 1; ws.length < 2; k++) { const w = /^\d+$/.test(A) ? String(Number(A) + k + 1) : `${A}`; if (w !== A && !ws.includes(w)) ws.push(w); else break; }
  // 3지선다(정답 위치 덱 0·1·2) — 오답 후보를 섞어 둘
  for (let i = ws.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ws[i], ws[j]] = [ws[j], ws[i]]; }
  return { text, answer: A, wrong: ws.slice(0, 2) };
}

function engQ(rnd, grade) {
  const list = WORDS[String(Math.min(6, Math.max(3, grade)))] || WORDS['3'];
  const i = Math.floor(rnd() * list.length);
  const [ko, en] = list[i];
  const wrong = [];
  while (wrong.length < 2) {
    const j = Math.floor(rnd() * list.length);
    if (j !== i && list[j][1][0] !== en[0] && !wrong.includes(list[j][1])) wrong.push(list[j][1]);
  }
  return { text: `${ko} → ?`, answer: en, wrong };
}

// 🎵 음악 과목(1.2.0 · 2026-10-14 휘휘! 숲속 오케스트라 «음악도 추가해서» · 1.6.0 2026-10-17 «음악문제 풀이 너무 작다 — 대폭 늘려»).
//    초등 음악은 3학년부터 교과 — 1·2학년이 오면 3학년 문항을 낸다(클라이언트도 3학년부터만 고르게 한다).
//    학년마다 «그 학년까지 배운 것»만(아래 MUS_KINDS 의 g = 처음 나오는 학년 · 그 위 학년엔 계속 나온다).
//    🔴 오답은 «같은 종류»에서만 뽑는다(셈여림 뜻 문제에 악기 이름이 보기로 나오면 지우기만으로 맞힌다).
//    🔴 사실(작곡가·지역·박 수)은 뜻이 하나로 갈리는 것만 — 작곡가가 둘인 곡(터키 행진곡)·작자 논란 곡(장난감 교향곡)은 넣지 않는다.
//    검수 2026-10-17 GPT 웹·Meta: 중중모리 박 수(4박/12박 서술이 갈림) 뺌 · 거문고=술대 · 꽹과리·징=채 · 늘임표=음이나 쉼 · «사계»는 비발디 외에도 있어 범위 지정.
//    시험 HB-8(학년마다 서로 다른 문항 ≥ 100 — 1.5 까지는 3학년 25개였다).
const MUS = {
  dyn: [['p', '여리게'], ['f', '세게'], ['mp', '조금 여리게'], ['mf', '조금 세게']],
  dyn5: [['pp', '매우 여리게'], ['ff', '매우 세게'], ['p', '여리게'], ['f', '세게'], ['mp', '조금 여리게'], ['mf', '조금 세게']],
  inst: [['바이올린', '현악기'], ['비올라', '현악기'], ['첼로', '현악기'], ['콘트라베이스', '현악기'], ['하프', '현악기'],
    ['피콜로', '목관악기'], ['플루트', '목관악기'], ['오보에', '목관악기'], ['클라리넷', '목관악기'], ['바순', '목관악기'],
    ['트럼펫', '금관악기'], ['호른', '금관악기'], ['트롬본', '금관악기'], ['튜바', '금관악기'],
    ['팀파니', '타악기'], ['큰북', '타악기'], ['작은북', '타악기'], ['트라이앵글', '타악기'], ['심벌즈', '타악기'], ['실로폰', '타악기'], ['탬버린', '타악기'], ['캐스터네츠', '타악기']],
  tempo: [['알레그로(Allegro)', '빠르게'], ['모데라토(Moderato)', '보통 빠르게'], ['안단테(Andante)', '느리게']],
  tempo5: [['라르고(Largo)', '아주 느리게'], ['안단테(Andante)', '느리게'], ['모데라토(Moderato)', '보통 빠르게'], ['알레그로(Allegro)', '빠르게'], ['프레스토(Presto)', '매우 빠르게']],
  change4: [['크레셴도(cresc.)', '점점 세게'], ['데크레셴도(decresc.)', '점점 여리게'], ['늘임표(페르마타)', '음이나 쉼을 알맞게 늘여서']],
  change: [['크레셴도(cresc.)', '점점 세게'], ['데크레셴도(decresc.)', '점점 여리게'], ['리타르단도(rit.)', '점점 느리게'], ['아첼레란도(accel.)', '점점 빠르게'], ['아 템포(a tempo)', '본래 빠르기로']],
  sign4: [['도돌이표', '되돌아가 한 번 더 연주'], ['늘임표(페르마타)', '음이나 쉼을 알맞게 늘여서'], ['쉼표', '소리를 쉬기'], ['숨표', '숨을 쉬는 곳'],
    ['스타카토', '음을 짧게 끊어서'], ['악센트', '그 음을 특히 세게'], ['이음줄', '높이가 다른 음들을 부드럽게 이어서'], ['붙임줄', '같은 높이의 두 음을 한 음처럼 이어서']],
  sign5: [['올림표(샤프)', '반음 올려서'], ['내림표(플랫)', '반음 내려서'], ['제자리표', '본래 음높이로'], ['스타카토', '음을 짧게 끊어서'], ['붙임줄', '같은 높이의 두 음을 한 음처럼 이어서']],
  rest: [['온쉼표', '4'], ['2분쉼표', '2'], ['4분쉼표', '1']],
  // 사물놀이 악기와 자연 — 교과서의 «꽹과리=천둥(번개) · 장구=비 · 북=구름 · 징=바람»
  samul: [['꽹과리', '천둥'], ['장구', '비'], ['북', '구름'], ['징', '바람']],
  kplay: [['가야금', '손가락으로 줄을 뜯어서'], ['거문고', '술대로 줄을 치거나 뜯어서'], ['해금', '활로 줄을 문질러서'], ['아쟁', '활로 줄을 문질러서'],
    ['대금', '입으로 불어서'], ['소금', '입으로 불어서'], ['단소', '입으로 불어서'], ['피리', '입으로 불어서'], ['태평소', '입으로 불어서'],
    ['장구', '채로 쳐서'], ['북', '채로 쳐서'], ['꽹과리', '채로 쳐서'], ['징', '채로 쳐서']],
  jangdan: [['세마치장단', '3'], ['굿거리장단', '4'], ['자진모리장단', '4'], ['중모리장단', '12']],
  minyo: [['정선아리랑', '강원도'], ['한오백년', '강원도'], ['진도아리랑', '전라도'], ['강강술래', '전라도'], ['밀양아리랑', '경상도'], ['쾌지나칭칭나네', '경상도'],
    ['도라지타령', '경기도'], ['늴리리야', '경기도'], ['몽금포타령', '황해도']],
  sing: [['독창', '혼자 부르기'], ['제창', '모두 같은 가락을 함께 부르기'], ['합창', '여러 성부로 나누어 함께 부르기'],
    ['돌림노래', '같은 가락을 사이를 두고 이어 부르기'], ['메기고 받는 형식', '한 사람이 메기면 여럿이 받아 부르기']],
  ensemble: [['이중창', '2'], ['삼중창', '3'], ['사중창', '4']],
  voice: [['소프라노', '여자의 높은 목소리'], ['알토', '여자의 낮은 목소리'], ['테너', '남자의 높은 목소리'], ['베이스', '남자의 낮은 목소리']],
  works: [['운명 교향곡', '베토벤'], ['엘리제를 위하여', '베토벤'], ['바이올린 협주곡 사계', '비발디'], ['호두까기 인형', '차이콥스키'], ['백조의 호수', '차이콥스키'],
    ['아이네 클라이네 나흐트무지크', '모차르트'], ['마술피리', '모차르트'], ['동물의 사육제', '생상스'], ['페르 귄트 모음곡', '그리그'],
    ['놀람 교향곡', '하이든'], ['신세계 교향곡', '드보르자크'], ['카르멘', '비제'], ['송어', '슈베르트'], ['마왕', '슈베르트'], ['헝가리 무곡', '브람스'],
    ['위풍당당 행진곡', '엘가'], ['윌리엄 텔 서곡', '로시니'], ['왕벌의 비행', '림스키코르사코프'], ['볼레로', '라벨'], ['피터와 늑대', '프로코피예프'],
    ['메시아', '헨델'], ['수상 음악', '헨델'], ['강아지 왈츠', '쇼팽'], ['아름답고 푸른 도나우', '요한 슈트라우스 2세'], ['전람회의 그림', '무소륵스키'], ['핀란디아', '시벨리우스']],
  kworks: [['고향의 봄', '홍난파'], ['반달', '윤극영'], ['그리운 금강산', '최영섭'], ['가고파', '김동진'], ['보리밭', '윤용하'], ['섬집 아기', '이흥렬'], ['애국가', '안익태']],
  nick: [['음악의 아버지', '바흐'], ['음악의 어머니', '헨델'], ['교향곡의 아버지', '하이든'], ['피아노의 시인', '쇼팽'], ['가곡의 왕', '슈베르트'], ['왈츠의 왕', '요한 슈트라우스 2세']],
  nation: [['베토벤', '독일'], ['바흐', '독일'], ['브람스', '독일'], ['모차르트', '오스트리아'], ['하이든', '오스트리아'], ['슈베르트', '오스트리아'],
    ['쇼팽', '폴란드'], ['차이콥스키', '러시아'], ['비발디', '이탈리아'], ['로시니', '이탈리아'], ['드보르자크', '체코'], ['그리그', '노르웨이'],
    ['시벨리우스', '핀란드'], ['생상스', '프랑스'], ['비제', '프랑스'], ['엘가', '영국']],
};
const SOLFA = ['도', '레', '미', '파', '솔', '라', '시'];
// 받침 따라 조사(은/는·을/를) — «바이올린» 는 같은 틀린 조사가 아이 화면에 나갔다(2026-10-14)
const jo = (w, withB, noB) => { const h = [...w].reverse().find((c) => c >= '가' && c <= '힣'); return h && (h.charCodeAt(0) - 0xac00) % 28 !== 0 ? withB : noB; };
// 종류 → 처음 나오는 학년. 학년 g 는 g 이하 전부에서 고른다(배운 것은 계속 나온다).
const MUS_KINDS = { dyn: 3, inst: 3, meter: 3, note: 3, noteSum: 3, rest: 3, solfa: 3,
  change4: 4, tempo: 4, dotted: 4, noteSum8: 4, sign4: 4, samul: 4, kplay: 4, sing: 4, fill: 4, jangdan: 4,
  dyn5: 5, meter68: 5, works: 5, kworks: 5, low: 5, tempo5: 5, sign5: 5, minyo: 5, ensemble: 5,
  change6: 6, pattern: 6, nick: 6, nation: 6, voice: 6 };
function musicQ(rnd, grade) {
  const R = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const shuf = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const fromPairs = (pairs, ask, k = 0, v = 1) => {
    const p = pick(pairs), ans = p[v];
    const pool = shuf([...new Set(pairs.filter((x) => x[v] !== ans).map((x) => x[v]))]);
    return { text: ask(p[k]), answer: ans, wrong: pool.slice(0, 2) };
  };
  // 숫자 답 — 정답 둘레의 다른 양수 둘
  const numQ = (text, n) => ({ text, answer: String(n), wrong: shuf([n - 2, n - 1, n + 1, n + 2].filter((x) => x > 0)).slice(0, 2).map(String) });
  const g = Math.max(3, Math.min(6, grade));
  const kinds = Object.keys(MUS_KINDS).filter((k) => MUS_KINDS[k] <= g);
  const kind = pick(kinds);
  if (kind === 'dyn') return fromPairs(MUS.dyn, (s) => `셈여림표 «${s}»의 뜻은?`);
  if (kind === 'dyn5') return fromPairs(rnd() < 0.5 ? MUS.dyn5 : MUS.dyn5.map(([a, b]) => [b, a]), (s) => /[a-z]/.test(s) ? `셈여림표 «${s}»의 뜻은?` : `«${s}»${jo(s, '을', '를')} 나타내는 셈여림표는?`);
  if (kind === 'inst') return fromPairs(MUS.inst, (s) => `«${s}»${jo(s, '은', '는')} 어느 악기군일까?`);
  if (kind === 'tempo') return fromPairs(MUS.tempo, (s) => `빠르기말 «${s}»의 뜻은?`);
  if (kind === 'tempo5') return fromPairs(MUS.tempo5, (s) => `빠르기말 «${s}»의 뜻은?`);
  if (kind === 'change4') return fromPairs(MUS.change4, (s) => `«${s}»의 뜻은?`);
  if (kind === 'change6') return rnd() < 0.5 ? fromPairs(MUS.change, (s) => `«${s}»의 뜻은?`) : fromPairs(MUS.change, (s) => `«${s}»${jo(s, '을', '를')} 나타내는 말은?`, 1, 0);
  if (kind === 'sign4') return fromPairs(MUS.sign4, (s) => `«${s}»${jo(s, '은', '는')} 무엇을 뜻할까?`);
  if (kind === 'sign5') return fromPairs(MUS.sign5, (s) => `«${s}»${jo(s, '은', '는')} 무엇을 뜻할까?`);
  if (kind === 'rest') { const [nm, n] = pick(MUS.rest); return numQ(`«${nm}»${jo(nm, '은', '는')} 4분음표 몇 개만큼 쉴까?`, Number(n)); }
  if (kind === 'samul') return rnd() < 0.5 ? fromPairs(MUS.samul, (s) => `사물놀이에서 «${s}»${jo(s, '은', '는')} 자연의 무엇을 닮은 소리일까?`)
    : fromPairs(MUS.samul, (s) => `사물놀이에서 «${s}» 소리를 닮은 악기는?`, 1, 0);
  if (kind === 'kplay') return fromPairs(MUS.kplay, (s) => `우리 악기 «${s}»${jo(s, '은', '는')} 어떻게 소리를 낼까?`);
  if (kind === 'jangdan') return fromPairs(MUS.jangdan, (s) => `«${s}»${jo(s, '은', '는')} 한 장단이 몇 박일까?`);
  if (kind === 'minyo') return fromPairs(MUS.minyo, (s) => `민요 «${s}»${jo(s, '은', '는')} 어느 지역의 민요일까?`);
  if (kind === 'sing') return rnd() < 0.5 ? fromPairs(MUS.sing, (s) => `«${s}»${jo(s, '은', '는')} 어떻게 부르는 걸까?`)
    : fromPairs(MUS.sing, (s) => `«${s}»${jo(s, '은', '는')} 무엇이라고 할까?`, 1, 0);
  if (kind === 'ensemble') return fromPairs(MUS.ensemble, (s) => `«${s}»${jo(s, '은', '는')} 몇 사람이 부를까?`);
  if (kind === 'voice') return rnd() < 0.5 ? fromPairs(MUS.voice, (s) => `성악에서 «${s}»${jo(s, '은', '는')} 어떤 목소리일까?`)
    : fromPairs(MUS.voice, (s) => `성악에서 «${s}»${jo(s, '을', '를')} 무엇이라고 할까?`, 1, 0);
  if (kind === 'works') return fromPairs(MUS.works, (s) => `«${s}»${jo(s, '을', '를')} 지은 작곡가는?`);
  if (kind === 'kworks') return fromPairs(MUS.kworks, (s) => `노래 «${s}»의 가락을 지은 작곡가는?`);
  if (kind === 'nick') return fromPairs(MUS.nick, (s) => `«${s}»라고 불리는 작곡가는?`);
  if (kind === 'nation') return fromPairs(MUS.nation, (s) => `작곡가 «${s}»${jo(s, '은', '는')} 오늘날의 어느 나라에서 태어났을까?`);
  if (kind === 'solfa') {
    const up = rnd() < 0.5, i = up ? R(0, 5) : R(1, 6), ans = SOLFA[up ? i + 1 : i - 1];
    return { text: `계이름 «${SOLFA[i]}» 바로 ${up ? '위' : '아래'}의 음은?`, answer: ans, wrong: shuf(SOLFA.filter((x) => x !== ans && x !== SOLFA[i])).slice(0, 2) };
  }
  if (kind === 'meter') { const n = pick([2, 3, 4]); return { text: `${n}/4박자 한 마디에 4분음표는 몇 개 들어갈까?`, answer: String(n), wrong: [2, 3, 4, 6].filter((x) => x !== n).slice(0, 2).map(String) }; }
  if (kind === 'meter68') { return { text: '6/8박자 한 마디에 8분음표는 몇 개 들어갈까?', answer: '6', wrong: pick([['3', '8'], ['4', '8'], ['3', '4']]) }; }
  if (kind === 'note') { const [nm, n] = pick([['2분음표', 2], ['온음표', 4]]); return { text: `${nm}는 4분음표 몇 개만큼 길까?`, answer: String(n), wrong: [1, 2, 3, 4, 8].filter((x) => x !== n).sort(() => rnd() - 0.5).slice(0, 2).map(String) }; }
  if (kind === 'dotted') {
    const [nm, unit, n] = pick([['점4분음표', '8분음표', 3], ['점2분음표', '8분음표', 6], ['점2분음표', '4분음표', 3], ['온음표', '8분음표', 8], ['2분음표', '8분음표', 4]]);
    return numQ(`${nm}는 ${unit} 몇 개만큼 길까?`, n);
  }
  if (kind === 'noteSum' || kind === 'noteSum8') {
    // 음표 두세 가지를 더한 길이 — 4분음표(3학년) 또는 8분음표(4학년) 단위
    const kinds8 = kind === 'noteSum8';
    const notes = kinds8 ? [['2분음표', 4], ['4분음표', 2], ['8분음표', 1], ['점4분음표', 3]] : [['온음표', 4], ['2분음표', 2], ['4분음표', 1]];
    const use = shuf(notes.slice()).slice(0, 2), cnt = use.map(() => R(1, kinds8 ? 2 : 3));
    const total = use.reduce((a, [, v], i) => a + v * cnt[i], 0);
    return numQ(`${use.map(([nm], i) => `${nm} ${cnt[i]}개`).join('와 ')}를 합하면 ${kinds8 ? '8분음표' : '4분음표'} 몇 개만큼 길까?`, total);
  }
  if (kind === 'fill') {
    // 한 마디 채우기 — n/4박자에서 2분음표 a개를 쓰고 남은 박을 4분음표로
    const n = pick([3, 4]), a = 1, rest = n - 2 * a;
    return numQ(`${n}/4박자 한 마디를 2분음표 ${a}개와 4분음표 몇 개로 채울 수 있을까?`, rest);
  }
  if (kind === 'low') {
    // 오답은 «같은 악기군» — 다른 악기군 이름이면 문제를 안 읽어도 지워진다
    const [fam, hi, ans, w1, w2] = pick([['현악기', '낮은', '콘트라베이스', '바이올린', '비올라'], ['금관악기', '낮은', '튜바', '트럼펫', '호른'], ['목관악기', '낮은', '바순', '플루트', '오보에'],
      ['현악기', '높은', '바이올린', '첼로', '콘트라베이스'], ['금관악기', '높은', '트럼펫', '튜바', '트롬본'], ['목관악기', '높은', '피콜로', '바순', '클라리넷']]);
    return { text: `${fam} 가운데 가장 ${hi} 소리를 내는 악기는?`, answer: ans, wrong: [w1, w2] };
  }
  // pattern — 오른손 지휘 도형
  const pt = pick([['2박자의 첫째 박', '아래로'], ['2박자의 둘째 박', '위로'], ['3박자의 첫째 박', '아래로'], ['3박자의 둘째 박', '오른쪽으로'], ['3박자의 셋째 박', '위로'],
    ['4박자의 첫째 박', '아래로'], ['4박자의 둘째 박', '왼쪽으로'], ['4박자의 셋째 박', '오른쪽으로'], ['4박자의 넷째 박', '위로']]);
  return { text: `오른손으로 지휘할 때 ${pt[0]}은 지휘봉을 어느 쪽으로 저을까?`, answer: pt[1], wrong: shuf(['아래로', '위로', '왼쪽으로', '오른쪽으로'].filter((x) => x !== pt[1])).slice(0, 2) };
}

// 한 판(시드)의 문항 전체를 통째로 만든다. 서버·클라·프로브가 같은 결과를 얻는다.
// 🔴 count 기본값을 숫자로 적으면 QUIZ_AT 을 늘렸을 때 «호출부 N 곳 중 M 곳만» 갱신된다.
//    (실제로 QUIZ_AT 을 3→6 으로 늘리자 서버·프로브·테스트가 3문항만 만들어 4~6번 카드가
//     빈 문항이 될 뻔했다.) 개수의 진실원은 QUIZ_AT 하나다.
export function makeQuestions(seed, { subject = 'math', grade = 2, count = 5 } = {}) {
  grade = Math.max(1, Math.min(6, Math.round(Number(grade) || 2)));   // 3.5 같은 값이 오면 WORDS[3.5] 로 죽는다
  count = Math.max(1, Math.min(8, count | 0));
  // 🔴 정답 «위치»가 시드만으로 정해지면, 문항을 하나도 모르는 사람이 위치만 재현해
  //    전부 맞힐 수 있다 — 서버가 «직접 채점»해도 소용이 없다(실측: eng/5 답을 math/2 로
  //    채점해도 6/6 이 나왔다). 과목·학년을 스트림에 섞어 판마다 위치가 달라지게 한다.
  const salt = (0x51A7 * 0x9E3779B1) ^ (grade * 0x85EBCA6B) ^ (subject === 'eng' ? 0xC2B2AE35 : subject === 'music' ? 0x165667B1 : 0x27D4EB2F);
  const R = createRng((seed ^ salt) >>> 0), rnd = R.next;
  const deck = makePositionDeck(rnd);
  const out = [], seen = new Set();
  const gen = () => (subject === 'eng' ? engQ(rnd, grade) : subject === 'music' ? musicQ(rnd, grade) : mathQ(rnd, grade));
  for (let i = 0; i < count; i++) {
    // 같은 문항은 다시 뽑는다(같은 시드 = 같은 결과는 그대로) — 음악 3학년 5문제에 «3/4박자…»가 세 번 나왔다(2026-10-14)
    let q = gen();
    for (let k = 0; k < 24 && seen.has(q.text); k++) q = gen();
    seen.add(q.text);
    const pos = deck[i % deck.length];
    const choices = [...q.wrong];
    choices.splice(pos, 0, q.answer);
    out.push({ text: q.text, choices, answer: pos, subject, grade });
  }
  return out;
}
