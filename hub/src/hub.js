// game-builder 학교 허브 — 기기별 학교 · 문제 묶음 출제/채점 · 이용권 · 판 결과 · 학교 순위. 저장소 = D1(daum 계정 «<게임>-hub») 또는 시험용 node:sqlite 껍데기.
// 키트 정본 = ~/.claude/skills/game-builder/kit/school-hub (원본 비트:온 ← 콩콩배구 ← 꿀꺽 행성). 판 판정은 브라우저에서 나므로 결과는 기기가 알린다
//   → 그래서 결과 1건은 반드시 «그 기기가 쓴 경기권 1장»(ref)에 묶이고, 한 장에 한 번만 점수가 된다(scored PRIMARY KEY).
// 🔴 원자성은 «코드의 읽고-쓰기»가 아니라 SQLite 가 집행한다(같은 기기가 두 탭에서 동시에 와도):
//    · 경기권 차감 = spent INSERT 하나. BEFORE 트리거가 «tix>0 인 기기 행»이 없으면 ABORT, AFTER 트리거가 tix-1. 같은 ref 두 번 = PK 충돌(멱등).
//    · 환불 = spent.state 'spent'→'refunded' UPDATE 하나(쓴 지 TICKET_REFUND_SEC 안 · 결과를 아직 안 낸 것만). 트리거가 그 전이일 때만 tix+1.
//    · 채점 보상 = used INSERT 하나(묶음 정규형 해시가 PK). 트리거가 correct·tix 를 올린다 → 같은 묶음 재제출은 충돌로 배치 전체 롤백.
//    · 결과 = scored INSERT 하나(ref 가 PK) + 같은 배치의 점수 갱신 — 같은 경기권 두 번 = 충돌로 배치 전체 롤백(이중 지급 0).
import { makeQuestions } from '../shared/quiz.js';
import { T, kstDay, kstWeek, isDh, isCode, isRef, packKey, seal, unseal, shortName, SIDO, isCanonicalToken, tokenKey, resultPoints } from '../shared/school.js';

const READY = new Map();   // 표 모양 해시 → { db, p } — 같은 isolate 의 다음 요청은 DDL·확인 읽기 없이 지나간다
/** 시험용 — 새 isolate(새 워커 기동) 흉내 */
export function resetSchemaMemo() { READY.clear(); }
function fnv(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); }
export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS dev (dh TEXT PRIMARY KEY, school TEXT, sname TEXT, sido TEXT, set_day TEXT DEFAULT '',
     correct INTEGER NOT NULL DEFAULT 0, tix INTEGER NOT NULL DEFAULT 0 CHECK (tix >= 0), packs INTEGER NOT NULL DEFAULT 0,
     pts_day TEXT DEFAULT '', pts INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS used (pk TEXT PRIMARY KEY, dh TEXT NOT NULL, c INTEGER NOT NULL, t INTEGER NOT NULL, at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS spent (ref TEXT PRIMARY KEY, dh TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'ai', state TEXT NOT NULL, at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS scored (ref TEXT PRIMARY KEY, dh TEXT NOT NULL, n INTEGER NOT NULL, at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS ipcap (day TEXT NOT NULL, iph TEXT NOT NULL, s INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, iph))`,
  `CREATE TABLE IF NOT EXISTS board (period TEXT NOT NULL, k TEXT NOT NULL, code TEXT NOT NULL, name TEXT, sido TEXT, s INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (period, k, code))`,
  // 🔴 BEFORE 트리거는 PRIMARY KEY 검사보다 «먼저» 돈다 — 이미 있는 ref 는 비켜서 PK 충돌(= again)로 가게 한다(꿀꺽 행성 첫 실측)
  `CREATE TRIGGER IF NOT EXISTS spend_need BEFORE INSERT ON spent
     WHEN NOT EXISTS (SELECT 1 FROM spent WHERE ref = NEW.ref) AND NOT EXISTS (SELECT 1 FROM dev WHERE dh = NEW.dh AND tix > 0)
     BEGIN SELECT RAISE(ABORT, 'ticket'); END`,
  `CREATE TRIGGER IF NOT EXISTS spend_take AFTER INSERT ON spent BEGIN UPDATE dev SET tix = tix - 1 WHERE dh = NEW.dh; END`,
  `CREATE TRIGGER IF NOT EXISTS refund_give AFTER UPDATE OF state ON spent WHEN OLD.state = 'spent' AND NEW.state = 'refunded'
     BEGIN UPDATE dev SET tix = tix + 1 WHERE dh = NEW.dh; END`,
  // 🔴 결과(scored)는 «그 기기가 쓴, 아직 열린» 경기권에만 — 확인과 닫기가 같은 트랜잭션(트리거)이라 환불과 동시에 와도 둘 중 하나만 된다
  //    (2026-10-10 교차검증 codex·gemini·grok·meta: 결과가 상태를 «배치 밖에서» 읽어 환불+점수 동시 성공)
  `CREATE TRIGGER IF NOT EXISTS score_need BEFORE INSERT ON scored
     WHEN NOT EXISTS (SELECT 1 FROM spent WHERE ref = NEW.ref AND dh = NEW.dh AND state = 'spent')
     BEGIN SELECT RAISE(ABORT, 'ticket'); END`,
  `CREATE TRIGGER IF NOT EXISTS score_close AFTER INSERT ON scored BEGIN UPDATE spent SET state = 'done' WHERE ref = NEW.ref; END`,
  // 🔴 하루 상한은 «읽고 계산»만으로는 동시 요청에 뚫린다 — 넘는 갱신 자체를 DB 가 거절한다(배치 전체 롤백)
  `CREATE TRIGGER IF NOT EXISTS dev_cap BEFORE UPDATE OF pts ON dev WHEN NEW.pts > ${T.SCHOOL_DAY_CAP} BEGIN SELECT RAISE(ABORT, 'cap'); END`,
  `CREATE TRIGGER IF NOT EXISTS ip_cap_u BEFORE UPDATE ON ipcap WHEN NEW.s > ${T.IP_DAY_CAP} BEGIN SELECT RAISE(ABORT, 'cap'); END`,
  `CREATE TRIGGER IF NOT EXISTS ip_cap_i BEFORE INSERT ON ipcap WHEN NEW.s > ${T.IP_DAY_CAP} BEGIN SELECT RAISE(ABORT, 'cap'); END`,
  `CREATE TRIGGER IF NOT EXISTS grade_give AFTER INSERT ON used
     BEGIN UPDATE dev SET correct = correct + NEW.c, tix = tix + NEW.t, packs = packs + 1 WHERE dh = NEW.dh; END`,
  `CREATE INDEX IF NOT EXISTS board_rank ON board (period, k, s DESC)`,
  // 첫 화면 통계(1.4.0) — 🔴 세는 쿼리가 표를 통째로 훑으면 D1/DO 무료 한도(하루 읽은 행 500만)를 갉아먹는다(check-db-reads 게이트).
  //   그래서 «쓸 때 트리거가 센다»: cnt(합계 3칸) · pact(한 번이라도 논 기기) · sch(학교) · dact(그날 논 기기) · dplay(그날 판 수).
  //   첫 화면은 cnt 3행 + 오늘 dact 범위 + dplay 1행만 읽는다. KST 날짜 = date(at/1000 + 9시간).
  `CREATE TABLE IF NOT EXISTS cnt (k TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS pact (dh TEXT PRIMARY KEY)`,
  `CREATE TABLE IF NOT EXISTS sch (code TEXT PRIMARY KEY)`,
  `CREATE TABLE IF NOT EXISTS dact (day TEXT NOT NULL, dh TEXT NOT NULL, PRIMARY KEY (day, dh))`,
  `CREATE TABLE IF NOT EXISTS dplay (day TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TRIGGER IF NOT EXISTS st_pact AFTER INSERT ON pact BEGIN INSERT OR IGNORE INTO cnt (k, n) VALUES ('players', 0); UPDATE cnt SET n = n + 1 WHERE k = 'players'; END`,
  `CREATE TRIGGER IF NOT EXISTS st_sch AFTER INSERT ON sch BEGIN INSERT OR IGNORE INTO cnt (k, n) VALUES ('schools', 0); UPDATE cnt SET n = n + 1 WHERE k = 'schools'; END`,
  `CREATE TRIGGER IF NOT EXISTS st_dev_sch AFTER UPDATE OF school ON dev WHEN NEW.school IS NOT NULL AND NEW.school != '' BEGIN INSERT OR IGNORE INTO sch (code) VALUES (NEW.school); END`,
  `CREATE TRIGGER IF NOT EXISTS st_spent AFTER INSERT ON spent BEGIN
     INSERT OR IGNORE INTO pact (dh) VALUES (NEW.dh); INSERT OR IGNORE INTO dact (day, dh) VALUES (date(NEW.at / 1000 + 32400, 'unixepoch'), NEW.dh);
     INSERT OR IGNORE INTO dplay (day, n) VALUES (date(NEW.at / 1000 + 32400, 'unixepoch'), 0); UPDATE dplay SET n = n + 1 WHERE day = date(NEW.at / 1000 + 32400, 'unixepoch');
     INSERT OR IGNORE INTO cnt (k, n) VALUES ('plays', 0); UPDATE cnt SET n = n + 1 WHERE k = 'plays'; END`,
  `CREATE TRIGGER IF NOT EXISTS st_refund AFTER UPDATE OF state ON spent WHEN OLD.state = 'spent' AND NEW.state = 'refunded' BEGIN
     UPDATE dplay SET n = n - 1 WHERE day = date(OLD.at / 1000 + 32400, 'unixepoch'); UPDATE cnt SET n = n - 1 WHERE k = 'plays'; END`,
  `CREATE TRIGGER IF NOT EXISTS st_used AFTER INSERT ON used BEGIN
     INSERT OR IGNORE INTO pact (dh) VALUES (NEW.dh); INSERT OR IGNORE INTO dact (day, dh) VALUES (date(NEW.at / 1000 + 32400, 'unixepoch'), NEW.dh); END`,
];
/** 1.4.0 이전부터 쌓인 기록을 통계 표로 한 번 옮긴다(허브마다 딱 한 번 — cnt 'v' 표지). 그 한 번만 표를 훑는다. */
const BACKFILL = [
  // gb-scan-ok: 1.4.0 으로 올릴 때 허브마다 한 번(cnt 'v' 가 있으면 안 돈다)
  `INSERT OR IGNORE INTO pact (dh) SELECT dh FROM spent UNION SELECT dh FROM used`,
  // gb-scan-ok: 한 번만
  `INSERT OR IGNORE INTO sch (code) SELECT DISTINCT school FROM dev WHERE school IS NOT NULL AND school != ''`,
  // gb-scan-ok: 한 번만
  `INSERT OR IGNORE INTO dact (day, dh) SELECT date(at / 1000 + 32400, 'unixepoch'), dh FROM spent UNION SELECT date(at / 1000 + 32400, 'unixepoch'), dh FROM used`,
  // gb-scan-ok: 한 번만
  `INSERT OR REPLACE INTO dplay (day, n) SELECT date(at / 1000 + 32400, 'unixepoch'), COUNT(*) FROM spent WHERE state != 'refunded' GROUP BY 1`,
  // gb-scan-ok: 한 번만(트리거가 위에서 올린 수를 정확한 값으로 덮는다)
  `INSERT OR REPLACE INTO cnt (k, n) SELECT 'players', COUNT(*) FROM pact UNION ALL SELECT 'schools', COUNT(*) FROM sch UNION ALL SELECT 'plays', COUNT(*) FROM spent WHERE state != 'refunded'`,
  `INSERT OR REPLACE INTO cnt (k, n) VALUES ('v', 1)`,
];
/** 첫 화면 순위 «더보기» 전체 목록 상한 — 학교 수가 이보다 많으면 위에서부터 이만큼(응답 크기 ≈ 60B × N) */
export const RANK_ALL = 500;
/** 통계는 이 시간만큼 한 번만 센다(첫 화면마다 표 전체를 훑지 않게) */
export const STATS_TTL_MS = 60e3;
/** KST 오늘 0시(ms) */
export const kstDayStart = (ms) => { const d = new Date(ms + 9 * 3600e3); d.setUTCHours(0, 0, 0, 0); return d.getTime() - 9 * 3600e3; };

const json = (body, status = 200) => ({ status, body });
const SUBJ = ['math', 'eng', 'music'];
const dup = (e) => /UNIQUE|PRIMARY|constraint/i.test(String(e?.message || e));

export class Hub {
  // db: D1Database 모양({ prepare, batch }) · secret: 봉인 키 원문(wrangler secret QUIZ_KEY) · now: 시계(시험용)
  // free = FREE_PLAY 게임(판 자체가 문제 풀이 — 구구성 수호대 2026-10-12): 판 영수증(ref)은 그대로 내되 이용권은 안 깎는다.
  //   차감 트리거를 건드리지 않으려고 «같은 batch 안에서 1장 넣고 바로 1장 쓴다» — 학교 점수 정산·하루 상한·환불 창은 그대로 걸린다.
  // nocap = NO_CAP 게임(1.5.0 · 타자왕국 2026-10-16 사용자 «다 풀어 상한»): 기기·IP 하루 학교 점수 상한을 걷는다 — 트리거도 지운다(이미 깔린 DB 포함).
  // switchPerDay = SCHOOL_SWITCH_PER_DAY(1.8.0 · 타자왕국 2026-10-19 사용자 «학교 바꾸기 하루 2번»): 기기 하나가 하루에 학교를 바꿀 수 있는 횟수(기본 1).
  //   센 수는 set_day 칸에 «날짜#횟수»로 적는다(스키마 그대로 · 옛 값 «날짜»만 = 1번 쓴 것).
  constructor({ db, secret, now = () => Date.now(), free = false, nocap = false, switchPerDay = 1 }) {
    this.free = !!free; this.nocap = !!nocap; this.switchPerDay = Math.max(1, Math.min(10, Number(switchPerDay) | 0 || 1));
    if (!secret) throw new Error('QUIZ_KEY 없음 — 봉인 키 없이 묶음을 내면 워커가 바뀔 때마다 채점이 410 이 된다');
    Object.assign(this, { db, now }); this.keyP = packKey(secret); this.ready = null;
  }
  init() {
    const CAP_TRG = /TRIGGER IF NOT EXISTS (dev_cap|ip_cap_u|ip_cap_i) /;
    /* free(1.9.0 · 2026-10-19 타자왕국 DO 무료 «하루 쓴 행 10만» 3시간 반 만에 소진): 판마다 «이용권 +1 → 트리거 −1» 이 dev 행을 두 번 써서 아무것도 안 바꿨다 →
       이용권 트리거(차감·확인·환불)를 걷고 판 영수증만 남긴다. FREE_PLAY 를 끄면 SCHEMA 의 IF NOT EXISTS 가 다시 깐다 */
    const TIX_TRG = /TRIGGER IF NOT EXISTS (spend_need|spend_take|refund_give) /;
    let sql = SCHEMA;
    if (this.nocap) sql = [...sql.filter((s) => !CAP_TRG.test(s)), 'DROP TRIGGER IF EXISTS dev_cap', 'DROP TRIGGER IF EXISTS ip_cap_u', 'DROP TRIGGER IF EXISTS ip_cap_i'];
    if (this.free) sql = [...sql.filter((s) => !TIX_TRG.test(s)), 'DROP TRIGGER IF EXISTS spend_need', 'DROP TRIGGER IF EXISTS spend_take', 'DROP TRIGGER IF EXISTS refund_give'];
    /* 🔴 표 만들기는 한 번만(1.11.1 · 2026-10-19): 워커는 요청마다 new Hub 라 this.ready 캐시가 무력했다 → 요청마다 DDL ~40행 읽기 →
       끝까지 진화 하루 216만 행으로 D1 «하루 읽기 500만»(계정 공유)이 넘쳐 simfeelgood 허브 10개가 전부 1101. 표 모양 해시를 cnt 에 적어 두고
       같으면 건너뛴다(1행 읽기) · 같은 isolate 안에선 그 1행도 안 읽는다(모듈 기억). 표 모양이 바뀌면(free·nocap 전환) 해시가 달라 다시 깐다. 시험 HB-DDL */
    const sig = 'schema:' + fnv(sql.join(';')), memo = READY.get(sig);
    if (memo && memo.db === this.db) return (this.ready = memo.p);
    const p = (async () => {
      const done = await this.db.prepare('SELECT n FROM cnt WHERE k = ?').bind(sig).first().catch(() => null);
      if (!done) {
        await this.db.batch(sql.map((s) => this.db.prepare(s)));
        if (!(await this.db.prepare("SELECT n FROM cnt WHERE k = 'v'").first())) await this.db.batch(BACKFILL.map((s) => this.db.prepare(s)));
        await this.db.prepare('INSERT OR REPLACE INTO cnt (k, n) VALUES (?, 1)').bind(sig).run();
      }
    })().catch((e) => { READY.delete(sig); this.ready = null; throw e; });
    READY.set(sig, { db: this.db, p });
    return (this.ready = p);
  }
  /** 새 기기 = 첫 경기권 FIRST_TIX 장(처음 온 아이가 한 판 맛보고 문제로). 이미 있으면 아무것도 안 한다 */
  ensure(dh) { return this.db.prepare('INSERT INTO dev (dh, tix) VALUES (?, ?) ON CONFLICT (dh) DO NOTHING').bind(dh, T.FIRST_TIX); }
  async dev(dh) { return (await this.db.prepare('SELECT * FROM dev WHERE dh = ?').bind(dh).first()) || null; }
  schoolOfRow(d) { return d?.school ? { code: d.school, name: d.sname, sido: d.sido, region: SIDO[d.sido] || '' } : null; }
  async tix(dh) { try { return ((await this.dev(dh))?.tix) | 0; } catch { return 0; } }

  // path: '/me' | '/select' | '/pack' | '/grade' | '/spend' | '/refund' | '/result' | '/top' · body = 바깥에서 형식 검사한 객체(dh 는 did 해시)
  async handle(path, body = {}) {
    await this.init();
    const t = this.now(), day = kstDay(t), week = kstWeek(t);
    if (path === '/top') return json(await this.top(day, week, isDh(body.dh) ? (await this.dev(body.dh))?.school : null));
    const dh = String(body.dh || ''); if (!isDh(dh)) return json({ error: 'dh' }, 400);
    if (path === '/me') {
      await this.ensure(dh).run();
      const d = await this.dev(dh), used = d.pts_day === day ? d.pts | 0 : 0;
      return json({ school: this.schoolOfRow(d), free: this.free, tix: d.tix | 0, correct: d.correct | 0, pass: T.TICKET_PASS_Q, q: T.PACK_Q, per: T.TIX_PER_PACK, todayPts: used, cap: this.nocap ? 0 : T.SCHOOL_DAY_CAP, nocap: this.nocap });
    }
    if (path === '/spend') {
      const ref = String(body.ref || ''); if (!isRef(ref)) return json({ error: 'ref' }, 400);
      const kind = /^[a-z]{1,12}$/.test(String(body.kind || '')) ? String(body.kind) : 'play';   // 기록용(점수엔 안 쓴다)
      try {
        await this.db.batch([this.ensure(dh), this.db.prepare("INSERT INTO spent (ref, dh, kind, state, at) VALUES (?, ?, ?, 'spent', ?)").bind(ref, dh, kind, t)]);
      } catch (e) {
        if (/ticket/.test(String(e?.message || e))) return json({ ok: false, why: 'ticket', tix: 0 });
        if (dup(e)) {   // 같은 ref — 이미 냈으면 ok(멱등), 돌려받은 ref 는 다시 못 쓴다
          const r = await this.db.prepare('SELECT state, dh FROM spent WHERE ref = ?').bind(ref).first();
          return json({ ok: r?.state === 'spent' && r.dh === dh, again: true, tix: await this.tix(dh) });
        }
        throw e;
      }
      // 차감은 이미 커밋됐다 — 뒤의 조회가 실패해도 ok(응답 유실 = 영수증 없는 차감 — 꿀꺽 행성 교차검증 codex)
      return json({ ok: true, tix: await this.tix(dh) });
    }
    if (path === '/refund') {
      const ref = String(body.ref || ''); if (!isRef(ref)) return json({ error: 'ref' }, 400);
      // 결과가 들어간 표는 score_close 트리거가 'done' 으로 닫아 여기 WHERE 에 안 걸린다(환불+점수 동시 성공 차단)
      const r = await this.db.prepare(`UPDATE spent SET state = 'refunded' WHERE ref = ? AND dh = ? AND state = 'spent' AND at >= ?`)
        .bind(ref, dh, t - T.TICKET_REFUND_SEC * 1000).run();
      // 🔴 «=== 1» 이면 D1 에선 환불이 되고도 ok:false(트리거 행까지 세서 2) → 클라가 쓸데없이 결과를 보냈다(2026-10-14 숲속 오케스트라 배포본 실측)
      return json({ ok: (r.meta?.changes | 0) >= 1, tix: await this.tix(dh) });
    }
    if (path === '/result') {   // 판 끝 = 점수 + 바뀐 순위를 한 번에(1.12.0) — 예전엔 끝나자마자 /schools 를 또 불러 판마다 요청 3번(차감·결과·순위) → 2번
      const r = await this.result(dh, body, day, week, t, String(body.iph || ''));
      if (r && r.ok) r.top = await this.top(day, week, (await this.dev(dh))?.school || null);
      return json(r);
    }
    if (path === '/select') {
      const s = body.school; if (!s || !isCode(s.code) || !SIDO[s.sido]) return json({ error: 'code' }, 400);
      await this.ensure(dh).run();
      const d = await this.dev(dh);
      const [sd, sn] = String(d.set_day || '').split('#'), used = sd !== day ? 0 : sn === undefined ? 1 : Number(sn) | 0;
      if (d.school && d.school !== s.code && used >= this.switchPerDay) return json({ error: 'today', per: this.switchPerDay }, 429);   // 학교 바꾸기는 하루 switchPerDay 회(순위 품앗이 차단)
      const setDay = d.school === s.code ? (d.set_day || '') : !d.school ? (this.switchPerDay > 1 ? `${day}#0` : day) : `${day}#${used + 1}`;   // 처음 고르기: 기본 1 = 옛 뜻 그대로(그날은 못 바꾼다) · 2 이상 = 안 센다
      await this.db.prepare('UPDATE dev SET school = ?, sname = ?, sido = ?, set_day = ? WHERE dh = ?')
        .bind(s.code, String(s.name).slice(0, 30), s.sido, setDay, dh).run();
      return json({ ok: true, school: { code: s.code, name: String(s.name).slice(0, 30), sido: s.sido, region: SIDO[s.sido] } });
    }
    if (path === '/pack') {
      const subject = SUBJ.includes(body.subject) ? body.subject : 'math', grade = Math.max(1, Math.min(6, body.grade | 0 || 3));
      const seed = crypto.getRandomValues(new Uint32Array(1))[0] >>> 1;
      const qs = makeQuestions(seed, { subject, grade, count: T.PACK_Q });
      const pid = await seal(await this.keyP, { dh, a: qs.map((q) => q.answer), at: t });
      return json({ pid, qs: qs.map((q) => ({ text: q.text, choices: q.choices })), pass: T.TICKET_PASS_Q, per: T.TIX_PER_PACK });
    }
    if (path === '/grade') {
      // 🔴 pid 는 정규 형식만 — unseal 이 base64url 밖 문자를 버리므로 원문을 키로 쓰면 pid+'!' 로 같은 묶음을 다시 채점할 수 있다(스쿨 스타즈 교차검증)
      const pid = String(body.pid || ''); if (!/^[A-Za-z0-9_-]{30,4096}$/.test(pid) || !isCanonicalToken(pid)) return json({ error: 'pack' }, 410);
      const P = await unseal(await this.keyP, pid);
      if (!P || P.dh !== dh || t - P.at > T.PACK_TTL_MIN * 60000) return json({ error: 'pack' }, 410);
      if (t - P.at < T.PACK_MIN_MS_PER_Q * P.a.length) return json({ tooFast: true, waitMs: T.PACK_MIN_MS_PER_Q * P.a.length - (t - P.at) });
      const got = (Array.isArray(body.answers) ? body.answers : []).slice(0, P.a.length).map((x) => (Number.isInteger(x) ? x : -1));
      const right = P.a.map((a, i) => got[i] === a), correct = right.filter(Boolean).length, ticket = correct >= T.TICKET_PASS_Q ? T.TIX_PER_PACK : 0;
      try {
        await this.db.batch([this.ensure(dh), this.db.prepare('INSERT INTO used (pk, dh, c, t, at) VALUES (?, ?, ?, ?, ?)').bind(await tokenKey(pid), dh, correct, ticket, t)]);
      } catch (e) { if (dup(e)) return json({ error: 'pack' }, 410); throw e; }
      return json({ correct, total: P.a.length, right, answers: P.a, ticket, tix: await this.tix(dh), pass: T.TICKET_PASS_Q });
    }
    return json({ error: 'not found' }, 404);
  }

  /** 판 결과 — 경기권 한 장(ref)에 한 번. 그 기기가 쓴 표 · 환불 안 됨 · RESULT_TTL 안 · 학교가 있어야 점수 · 기기·IP 하루 상한.
   *  열림 확인·닫기·상한은 SQLite 트리거가 같은 배치(트랜잭션) 안에서 집행한다 — 여기서 읽는 값은 «얼마를 줄까» 계산용일 뿐. */
  async result(dh, body, day, week, t, iph = '') {
    const ref = String(body.ref || ''); if (!isRef(ref)) return { error: 'ref' };
    if (!iph) return { ok: false, why: 'iph' };   // IP 해시 없이 오면 IP 상한이 통째로 꺼진다 — 받지 않는다(교차검증 grok)
    for (let attempt = 0; attempt < 2; attempt++) {
      const sp = await this.db.prepare('SELECT dh, state, at FROM spent WHERE ref = ?').bind(ref).first();
      if (!sp || sp.dh !== dh) return { ok: false, why: 'ticket' };
      if (sp.state === 'done') return { ok: false, why: 'again' };
      if (sp.state !== 'spent') return { ok: false, why: 'ticket' };
      if (t - sp.at > T.RESULT_TTL_MIN * 60000) return { ok: false, why: 'late' };
      const d = await this.dev(dh), sc = this.schoolOfRow(d);
      const used = d.pts_day === day ? d.pts | 0 : 0;
      const ipUsed = this.nocap ? 0 : (await this.db.prepare('SELECT s FROM ipcap WHERE day = ? AND iph = ?').bind(day, iph).first())?.s | 0;
      const want = resultPoints({ won: !!body.won });
      const n = !sc ? 0 : this.nocap ? want : Math.max(0, Math.min(want, T.SCHOOL_DAY_CAP - used, T.IP_DAY_CAP - ipUsed));
      const stmts = [this.db.prepare('INSERT INTO scored (ref, dh, n, at) VALUES (?, ?, ?, ?)').bind(ref, dh, n, t)];
      if (n) {
        // 누적(덮어쓰기 아님) — 날이 바뀌었으면 새로 시작
        if (!this.nocap) {   // 상한 없는 게임은 상한용 누적(기기·IP)을 안 쓴다 — 판마다 2행(1.9.0)
          stmts.push(this.db.prepare('UPDATE dev SET pts = CASE WHEN pts_day = ? THEN pts + ? ELSE ? END, pts_day = ? WHERE dh = ?').bind(day, n, n, day, dh));
          stmts.push(this.db.prepare('INSERT INTO ipcap (day, iph, s) VALUES (?, ?, ?) ON CONFLICT (day, iph) DO UPDATE SET s = s + excluded.s').bind(day, iph, n));
        }
        for (const [period, k] of [['d', day], ['w', week]]) stmts.push(this.db.prepare(
          'INSERT INTO board (period, k, code, name, sido, s) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (period, k, code) DO UPDATE SET s = s + excluded.s, name = excluded.name')
          .bind(period, k, sc.code, String(sc.name).slice(0, 30), sc.sido, n));
      }
      try {
        await this.db.batch(stmts);
        return { ok: true, added: n, school: sc ? shortName(sc.name) : null, capped: !!sc && n < want };
      } catch (e) {
        const m = String(e?.message || e);
        if (/cap/.test(m)) continue;                       // 동시에 온 다른 결과가 상한을 먼저 썼다 — 남은 양으로 한 번 더 계산
        if (/ticket/.test(m)) return { ok: false, why: 'ticket' };   // 그 사이 환불됐다
        if (dup(e)) return { ok: false, why: 'again' };
        throw e;
      }
    }
    return { ok: false, why: 'cap' };
  }

  async top(day, week, myCode) {
    const list = async (period, k) => (await this.db.prepare(`SELECT code, name, sido, s FROM board WHERE period = ? AND k = ? ORDER BY s DESC, code LIMIT ${RANK_ALL}`).bind(period, k).all()).results
      .map((r) => ({ code: r.code, name: shortName(r.name), sido: SIDO[r.sido] || '', s: r.s }));
    const rank = async (period, k) => {
      if (!myCode) return null;
      const me = await this.db.prepare('SELECT s FROM board WHERE period = ? AND k = ? AND code = ?').bind(period, k, myCode).first();
      if (!me) return null;
      const above = await this.db.prepare('SELECT COUNT(*) AS n FROM board WHERE period = ? AND k = ? AND s > ?').bind(period, k, me.s).first();
      const next = await this.db.prepare('SELECT MIN(s) AS s FROM board WHERE period = ? AND k = ? AND s > ?').bind(period, k, me.s).first();
      return { rank: (above?.n | 0) + 1, s: me.s, gap: next?.s ? next.s - me.s : 0 };   // gap = 바로 위 학교까지 남은 점수(«다시 들어올 이유»)
    };
    return { day, week, today: await list('d', day), weekly: await list('w', week), mine: myCode ? { today: await rank('d', day), weekly: await rank('w', week) } : null,
      stats: await this.stats() };
  }

  /** 첫 화면 통계 — 모두 «합계 숫자»뿐(기기·학교 하나하나는 안 나간다).
   *  schools = 학교를 정한 기기가 있는 학교 수 · players = 한 판이라도 하거나 문제를 푼 기기 수(계정이 없어 «학생»이 아니라 기기)
   *  today = 오늘(KST) 판을 하거나 문제를 푼 기기 수 · playsToday / plays = 판 수(환불된 판 제외) */
  async stats() {
    const t = this.now();
    if (this._st && t - this._st.at < STATS_TTL_MS) return this._st.v;
    const day = kstDay(t), one = async (q, ...a) => ((await this.db.prepare(q).bind(...a).first())?.n) | 0;
    try {
      const c = Object.fromEntries((await this.db.prepare("SELECT k, n FROM cnt WHERE k IN ('schools', 'players', 'plays')").all()).results.map((r) => [r.k, r.n | 0]));
      const v = {
        schools: c.schools | 0, players: c.players | 0, plays: c.plays | 0,
        today: await one('SELECT COUNT(*) AS n FROM dact WHERE day = ?', day),
        playsToday: await one('SELECT n FROM dplay WHERE day = ?', day),
      };
      this._st = { at: t, v }; return v;
    } catch { return this._st?.v ?? null; }   // 통계가 깨져도 순위는 나간다
  }
}

/** node:sqlite 를 D1 모양으로 감싼다(시험 전용). batch = 하나의 트랜잭션(실패하면 전부 롤백 — D1 과 같다) */
export async function sqliteD1(file = ':memory:') {
  // getBuiltinModule — vitest(vite)가 'node:sqlite' 접두사를 떼고 «sqlite» 패키지로 찾다 실패한다(2026-10-11 종이하늘 실측)
  const { DatabaseSync } = globalThis.process.getBuiltinModule('node:sqlite');
  const raw = new DatabaseSync(file);
  const stmt = (sql) => {
    let args = [];
    const o = {
      bind: (...a) => { args = a; return o; },
      first: async () => raw.prepare(sql).get(...args) ?? null,
      all: async () => ({ results: raw.prepare(sql).all(...args) }),
      // D1 의 meta.changes 는 트리거가 바꾼 행까지 센다(실측: 트리거 1개 달린 UPDATE 1행 → changes 2) — node:sqlite changes 는 안 센다 → total_changes 차이로 D1 과 같게
      run: async () => { const tc = () => Number(raw.prepare('SELECT total_changes() AS n').get().n); const a = tc(); raw.prepare(sql).run(...args); return { meta: { changes: tc() - a } }; },
      _exec: () => (/^\s*SELECT/i.test(sql) ? raw.prepare(sql).all(...args) : raw.prepare(sql).run(...args)),
    };
    return o;
  };
  return {
    raw, prepare: stmt,
    batch: async (list) => {
      raw.exec('BEGIN');
      try { const out = list.map((s) => s._exec()); raw.exec('COMMIT'); return out; }
      catch (e) { raw.exec('ROLLBACK'); throw e; }
    },
  };
}

/** Durable Object 내장 SQLite(ctx.storage)를 D1 모양으로 감싼다 — D1 자리가 없는 계정(무료 플랜 D1 상한 10개)에서 허브를 돌린다(2026-10-15 빙글스텝: 계정 5개 전부 10/10).
 *  batch = storage.transactionSync(전부 아니면 전무 — D1 batch 와 같은 롤백) · 트리거(RAISE ABORT)·PK 충돌은 SQLite 가 그대로 집행한다.
 *  meta.changes = cursor.rowsWritten(허브는 «≥ 1» 로만 본다). 순수 함수 — cloudflare:workers 를 import 하지 않아 node 시험이 같은 껍데기를 돈다. */
export function doD1(storage) {
  const sql = storage.sql;
  const stmt = (q) => {
    let args = [];
    const o = {
      bind: (...a) => { args = a; return o; },
      first: async () => sql.exec(q, ...args).toArray()[0] ?? null,
      all: async () => ({ results: sql.exec(q, ...args).toArray() }),
      run: async () => { const c = sql.exec(q, ...args); c.toArray(); return { meta: { changes: c.rowsWritten | 0 } }; },
      _exec: () => sql.exec(q, ...args).toArray(),
    };
    return o;
  };
  return { prepare: stmt, batch: async (list) => storage.transactionSync(() => list.map((s) => s._exec())) };
}
