// 조각마다 «왜 이 셈을 하나» 한 줄(2026-11-03 사용자 «지금 뭘 계산하는 건지 단계별로 · 혼합 계산이면 곱셈 먼저 · 다음 앞에서부터 ·
// 분수면 최소공배수를 왜 먼저 하는지(공통분모 구하기) · 마지막엔 그래서 얼마 · 너무 번잡하면 안 돼»).
// 채점과 무관한 화면 글 — 조각(t·a·op·x·y)과 원래 식(q)만 보고 정한다. 짧게(≤ WHY_MAX 글자) · 모든 단계·조각에 하나씩(tests/semwhy).
export const WHY_MAX = 14;   /* 12 → 14(2026-11-04 «조금만 더 자세히») — 한 줄인지는 tools/wrap-check 가 폰 폭에서 잰다 */
export const WHY_FINAL = '그래서 얼마?';
const place = (y) => (y % 1000 === 0 ? '천' : y % 100 === 0 ? '백' : y % 10 === 0 ? '십' : '일');
const isFracQ = (q) => /\d\/\d/.test(q);

/** 한 문제의 조각 이유 목록(조각 수와 같은 길이) */
export function whyOf(stage, p) {
  const st = p.steps, q = String(p.q), n = st.length, out = [];
  for (let j = 0; j < n; j++) out.push(one(stage, st, j, q) || byOp(st[j]));
  return out;
}
function byOp(s) { return { add: '더하기', sub: '빼기', mul: '곱하기', div: '나누기', up: '10 만들기', lcm: '공통분모 구하기', gcd: '약분할 수 찾기', round: '반올림하기', digit: '아래 자리 보기', place: '자릿값 곱하기' }[s.op] || '계산하기'; }

function one(stage, st, j, q) {
  const s = st[j], t = String(s.t);
  /* 2026-11-04 사용자 «조금만 더 자세히 — 모든 셈»: 무엇을 왜 하는지 한 걸음 더(자리 이름·끼리·먼저) · 숫자는 넣지 않는다(이유마다 미리 구운 목소리 하나) */
  switch (stage) {
    case 'g1_add10': return ['10이 되게 채우기', '채우고 남은 수', '10에 남은 수 더하기'][j];
    case 'g1_sub10': return ['먼저 10까지 빼기', '더 빼야 할 수', '10에서 마저 빼기'][j];
    case 'g2_times': return '구구단';
    case 'g2_add2': return s.op === 'up' ? '다음 몇십까지 채우기' : s.op === 'sub' ? '채우고 남은 수' : j === 0 ? '몇십 먼저 더하기' : '남은 수 마저 더하기';
    case 'g2_sub2': if (st.length === 2) return j === 0 ? '몇십 먼저 빼기' : '일의 자리 빼기';   /* 50 − 22 처럼 받아내림 없는 두 조각 */
      return j === 0 ? '몇십 먼저 빼기' : j === 1 ? '몇십까지 내려 빼기' : j === 2 ? '더 빼야 할 수' : '남은 수 마저 빼기';
    case 'g3_add3': return `${place(s.y)}의 자리끼리 더하기`;
    case 'g3_sub3': return `${place(s.y)}의 자리끼리 빼기`;
    case 'g3_mul1': case 'g3_mul2': case 'g4_mul3': case 'g5_dmul':
      if (s.op === 'div') return '소수점 자리 되돌리기';
      if (st.length === 1) return '곱하기';
      return s.op === 'mul' ? '자리별로 나눠 곱하기' : '곱한 것 모두 더하기';
    case 'g3_div': case 'g4_div2':
      if (/□/.test(t)) return '0을 하나씩 지우기';
      if (s.op === 'mul') return '몫을 몇십으로 어림';
      if (s.op === 'sub') return j > 0 && st[j - 1].op === 'mul' ? '어림한 만큼 빼기' : '나눠서 마저 빼기';
      if (s.op === 'div') return '남은 수 나누기';
      return '몫끼리 더하기';
    case 'g4_frac':
      if (j === 0) return '자연수끼리 더하기';
      if (/분자/.test(t)) return '분자끼리 더하기';
      if (s.op === 'sub') return '분모만큼 모이면 1';
      return '1을 자연수에 더하기';
    case 'g4_dec':
      if (s.op === 'sub') return j === 0 ? '자연수만큼 먼저 빼기' : '소수 부분 빼기';
      return j === 0 ? '자연수끼리 더하기' : j === 1 ? '소수끼리 더하기' : '둘을 합치기';
    case 'g5_mix':
      if (q.includes('(') && j === 0) return '괄호 안 먼저';
      if ((s.op === 'mul' || s.op === 'div') && /[+−]/.test(q.replace(/\([^)]*\)/g, ''))) return '×÷가 +−보다 먼저';   /* 괄호 안 + 는 셈하지 않는다 — «(5 + 2) × 8» 의 7 × 8 을 «×÷ 먼저» 라 했다(2026-11-04 전수 확인) */
      return '앞에서부터 차례로';
    case 'g5_lcd': {   // 나눈 뒤에도 어느 분수를 바꾸는 중인지 보이게 — 조각은 ÷ 와 × 로 쪼갰다
      const m = q.match(/(\d+)\/(\d+) \+ (\d+)\/(\d+)/), L = st[0].a;
      if (m && j >= 1 && j <= 4) { const [u, v] = j <= 2 ? [m[1], m[2]] : [m[3], m[4]]; return `${u}/${v} = □/${L} · ${j % 2 ? '분모가 몇 배?' : '분자도 같은 배로'}`; }
      return fracWhy(st, j, '같은 분모로 바꾸기');
    }
    case 'g5_fmul': case 'g6_fdiv': return fracWhy(st, j, '', stage === 'g6_fdiv');
    case 'g6_ddiv': return j === 0 ? '소수점 떼고 나누기' : '소수점 자리 되돌리기';
    case 'g6_ratio': return j === 0 ? '앞쪽이 몇 배인지' : '뒤쪽도 같은 배로';
    case 'k2_time': return j === 0 ? '시간 → 분(×60)' : '남은 분 더하기';
    case 'k2_cm': return j === 0 ? 'm → cm(×100)' : '남은 cm 더하기';
    case 'k3_unit': { const u = q.match(/\d+\s*([a-zA-Z]+)\s*\d+\s*([a-zA-Z]+)/); const f = Math.round(st[0].a / Number(q.match(/\d+/)[0])); return j === 0 ? (u ? `${u[1]} → ${u[2]} ×${f}` : '단위 바꾸기') : `남은 ${u ? u[2] : '작은 단위'} 더하기`; }   /* 곱하는 수는 조각 값에서(cm → mm 는 ×10) */
    case 'k4_angle': return s.op === 'add' ? '아는 두 각 더하기' : /삼각형/.test(q) ? '세 각의 합 180°' : '직선은 180°';
    case 'k4_place': return '숫자 × 자릿값';
    case 'k4_perim': return st.length === 1 ? (/정삼각형/.test(q) ? '정삼각형: 한 변×3' : '정사각형: 한 변×4') : j === 0 ? '(가로+세로)×2' : '그다음 ×2';   /* 공식째 읽어 준다(2026-11-04 사용자 «들을 때 의미가 있어야 — 공식을 외우는 효과») */   /* 정삼각형 3 × 8 에 «네 변» 이라 했다 */
    case 'k5_round': { const low = String(st[0].t).match(/^(.)의 자리/)?.[1] ?? ''; return j === 0 ? '반올림할 자리 보기' : `${low}의 자리에서 ${st[0].a >= 5 ? '올림' : '버림'}`; }   /* 둘째 조각 = 어느 자리에서 올림·버림인지(2026-11-04 사용자 «두 번째에서 일의 자리에서 반올림 — 어느 자리에서 올림 버림을 하는지 알려 주면 되잖아» · «바로 아래 일의 자리» 는 헷갈렸다) */
    case 'k5_area': return s.op === 'div' ? '반으로(÷2)' : j > 0 ? (s.op === 'mul' ? '자리별로 나눠 곱하기' : '곱한 것 모두 더하기') : /직사각형/.test(q) ? '직사각형: 가로×세로' : /평행사변형/.test(q) ? '평행사변형: 밑변×높이' : '삼각형: 밑변×높이÷2';   /* 직사각형에도 «밑변 × 높이» 라 했다 · 공식째 읽기(11-04) */
    case 'k6_pct': return j === 0 ? (s.y === 2 ? '50%는 절반' : s.y === 4 ? '25%는 4등분' : '10% 구하기') :   /* 50% 의 30 ÷ 2 에 «10% 구하기» 라 했다 */ s.op === 'mul' ? '10%의 몇 배' : '원래 값에서 빼기';
    case 'k6_vol': return j === 0 ? '밑넓이: 가로×세로' : '부피: 밑넓이×높이';
    default: return null;
  }
}
/** 분수 조각 이유 — 통분·약분·곱하기·대분수 */
function fracWhy(st, j, mulWhy, flip = false) {
  const s = st[j], t = String(s.t);
  if (s.op === 'lcm') return '공통분모 구하기';
  if (s.op === 'gcd') return '최대공약수 찾기';
  if (/□\//.test(t)) return mulWhy || '같은 분모로 바꾸기';
  if (/^분자/.test(t)) return flip && !st.slice(0, j).some((x) => /^분자/.test(String(x.t))) ? '뒤집어 곱하기(분자)' : '분자끼리 곱하기';
  if (/^분모/.test(t)) return '분모끼리 곱하기';
  if (/의 몫$/.test(t)) return '자연수 부분 구하기';
  if (s.op === 'div') return '최대공약수로 약분';
  if (s.op === 'add') return '분자끼리 더하기';
  if (s.op === 'sub') return j > 0 && /의 몫$/.test(String(st[j - 1].t)) ? '남는 분자 구하기' : '분모만큼 모이면 1';
  return null;
}

/* ── 읽어 주기(2026-11-03 사용자 «계산하기 바빠서 못 읽을 것 같아 — 개념·계산 순서를 읽어 주자») ──
   이유 글을 아이 귀에 맞는 말로(기호·단위를 풀어). 음원 = tools/build-why-voice.mjs 가 Supertonic 으로 미리 구운 public/voice/why/<id>.mp3 */
const SAY = {
  '×÷가 +−보다 먼저': '곱셈 나눗셈이 덧셈 뺄셈보다 먼저', '분모만큼 모이면 1': '분모만큼 모이면 1이 돼요', '몫을 몇십으로 어림': '몫을 몇십으로 어림하기', '뒤집어 곱하기(분자)': '뒤집어서 분자끼리 곱하기',
  '시간 → 분(×60)': '한 시간은 60 분, 60 곱하기', 'm → cm(×100)': '1 미터는 100 센티미터, 100 곱하기', '직선은 180°': '직선이 이루는 각은 180도', '세 각의 합 180°': '삼각형 세 각의 합은 180도',
  '(가로+세로)×2': '직사각형의 둘레는 가로 더하기 세로, 곱하기 2', '그다음 ×2': '그다음 2 곱하기', '정사각형: 한 변×4': '정사각형의 둘레는 한 변 곱하기 4', '정삼각형: 한 변×3': '정삼각형의 둘레는 한 변 곱하기 3',
  '직사각형: 가로×세로': '직사각형의 넓이는 가로 곱하기 세로', '평행사변형: 밑변×높이': '평행사변형의 넓이는 밑변 곱하기 높이', '삼각형: 밑변×높이÷2': '삼각형의 넓이는 밑변 곱하기 높이 나누기 2', '반으로(÷2)': '그다음 반으로, 2로 나누기',
  '밑넓이: 가로×세로': '밑넓이는 가로 곱하기 세로', '부피: 밑넓이×높이': '직육면체의 부피는 밑넓이 곱하기 높이',
  '10% 구하기': '10퍼센트 구하기', '10%의 몇 배': '10퍼센트의 몇 배', '50%는 절반': '50퍼센트는 절반', '25%는 4등분': '25퍼센트는 4등분',
  '0을 하나씩 지우기': '0을 하나씩 지우기', '숫자 × 자릿값': '숫자 곱하기 자릿값', '1을 자연수에 더하기': '1을 자연수에 더하기', '그래서 얼마?': '그래서 얼마?',
};
/* 받침 따라 조사 — «킬로그램를 그램로» 로 읽혔다 */
const jong = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 ? c % 28 : 0; };
const UNIT = { kg: '킬로그램', g: '그램', km: '킬로미터', m: '미터', cm: '센티미터', mm: '밀리미터', L: '리터', mL: '밀리 리터' };   /* 붙여 쓰면 Supertonic 이 «밀리»를 삼켰다(ASR «리터를 리터로») */
/* 숫자는 한글로 — Supertonic 이 «1, 1을» 을 «이를» 로·«1000» 뒤를 삼켰다(ASR 대조 2026-11-03) */
const DG = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
export function koNum(n) { n = Number(n); if (!n) return '영'; let o = ''; for (const [u, k] of [[1000, '천'], [100, '백'], [10, '십'], [1, '']]) { const d = Math.floor(n / u) % 10; if (d) o += (d === 1 && u > 1 ? '' : DG[d]) + k; } return o; }
const ko = (t) => t.replace(/\d+/g, (m) => koNum(m));
export function sayOf(w) { return ko(say0(w)); }
function say0(w) {
  if (SAY[w]) return SAY[w];
  let m = w.match(/^([a-zA-Z]+) → ([a-zA-Z]+) ×(\d+)$/); if (m) { const a = UNIT[m[1]] || m[1], b = UNIT[m[2]] || m[2]; return `1 ${a}${jong(a) ? '은' : '는'} ${m[3]} ${b}, ${m[3]} 곱하기`; }   /* «1킬로그램은 1000그램» — 바꾸는 말보다 사실을(11-04) */
  m = w.match(/^(남은 )?([a-zA-Z]+) 더하기$/); if (m) return ko(`${m[1] || ''}${UNIT[m[2]] || m[2]} 더하기`);
  return w.replace(/×/g, ' 곱하기 ').replace(/÷/g, ' 나누기 ').replace(/\+/g, ' 더하기 ').replace(/−/g, ' 빼기 ').replace(/%/g, '퍼센트').replace(/°/g, '도').replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
}
/** 음원 이름 = 읽는 말의 해시(말을 고치면 새로 굽는다) */
export function voiceIdOf(w) { let h = 2166136261; for (const ch of sayOf(w)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return (h >>> 0).toString(36); }
/** 모든 이유 글(31단계 × 씨앗 600 + 마지막 «그래서 얼마?») — 굽기·시험이 같은 목록 */
export function allWhys(SEM_IDS, semProblem) { const set = new Set([WHY_FINAL]); for (const id of SEM_IDS) for (let s = 0; s < 600; s++) for (const w of whyOf(id, semProblem(id, s, 0))) set.add(w); return [...set]; }
