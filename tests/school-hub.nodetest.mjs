// 학교 허브 시험 — 실제 스키마(트리거 포함)를 node:sqlite 에 얹어 D1 과 같은 배치 의미로 돌린다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Hub, sqliteD1, doD1, resetSchemaMemo } from '../hub/src/hub.js';
import { T, didHash } from '../hub/shared/school.js';

const DID = 'a'.repeat(32), DID2 = 'b'.repeat(32), IPH = 'e'.repeat(16);
const SCHOOL = { code: '7010000', name: '서울한빛초등학교', sido: 'B10' };
// 저장소 두 갈래를 같은 시험으로 — HUB_STORE=do 면 Durable Object 껍데기(doD1)를 node:sqlite 위의 가짜 DO 저장소에 얹는다(tests/hub-do.test.mjs)
const STORE = process.env.HUB_STORE === 'do' ? 'do' : 'd1';
/** 가짜 DO storage — sql.exec(q, ...args) 커서(toArray·rowsWritten) + transactionSync(실패면 롤백). 실제 DO 와 같은 SQLite 라 트리거·PK 충돌이 그대로 난다 */
function fakeDOStorage() {
  const { DatabaseSync } = globalThis.process.getBuiltinModule('node:sqlite');
  const raw = new DatabaseSync(':memory:');
  const tc = () => Number(raw.prepare('SELECT total_changes() AS n').get().n);
  return {
    sql: { exec(q, ...args) { const st = raw.prepare(q), a = tc(); const rows = st.columns().length ? st.all(...args) : (st.run(...args), []); const w = tc() - a; return { toArray: () => rows, rowsWritten: w }; } },
    transactionSync(fn) { raw.exec('BEGIN'); try { const r = fn(); raw.exec('COMMIT'); return r; } catch (e) { raw.exec('ROLLBACK'); throw e; } },
  };
}
async function mk({ free = false, nocap = false, switchPerDay = 1 } = {}) {
  let now = Date.UTC(2026, 9, 10, 3, 0, 0);
  const hub = new Hub({ db: STORE === 'do' ? doD1(fakeDOStorage()) : await sqliteD1(), secret: 'test-key', now: () => now, free, nocap, switchPerDay });
  const dh = await didHash(DID), dh2 = await didHash(DID2);
  const call = async (p, b) => (await hub.handle(p, b)).body;
  const tick = (ms) => { now += ms; };
  // 문제 묶음 하나를 다 맞혀 경기권을 받는다
  const earn = async (who = dh) => { const p = await call('/pack', { dh: who, subject: 'math', grade: 3 }); tick(T.PACK_MIN_MS_PER_Q * T.PACK_Q + 10);
    const raw = await hub.keyP; const { unseal } = await import('../hub/shared/school.js'); const P = await unseal(raw, p.pid);
    return call('/grade', { dh: who, pid: p.pid, answers: P.a }); };
  return { hub, dh, dh2, call, tick, earn };
}

test('HB-1 새 기기 = 경기권 0(공짜 표 없음) · 묶음 다 맞히면 +TIX_PER_PACK · 같은 묶음 재채점 410 · 너무 빠르면 보류', async () => {
  const { dh, call, tick, earn, hub } = await mk();
  assert.equal((await call('/me', { dh })).tix, 0);
  const p = await call('/pack', { dh, subject: 'eng', grade: 4 });
  assert.equal(p.qs.length, T.PACK_Q);
  assert.ok((await call('/grade', { dh, pid: p.pid, answers: [0, 0, 0, 0, 0] })).tooFast, '1.2초×5 안에 내면 보류');
  const g = await earn();
  assert.equal(g.ticket, T.TIX_PER_PACK); assert.equal(g.tix, T.TIX_PER_PACK);
  const { unseal } = await import('../hub/shared/school.js');
  const p2 = await call('/pack', { dh, subject: 'math', grade: 2 }); tick(9000);
  const P2 = await unseal(await hub.keyP, p2.pid);
  await call('/grade', { dh, pid: p2.pid, answers: P2.a });
  const again = await hub.handle('/grade', { dh, pid: p2.pid, answers: P2.a });
  assert.equal(again.status, 410, '같은 묶음 두 번 = 410');
  const wrong = await call('/pack', { dh, subject: 'math', grade: 2 }); tick(9000);
  const W = await unseal(await hub.keyP, wrong.pid);
  const g3 = await call('/grade', { dh, pid: wrong.pid, answers: W.a.map((a, i) => (i < 2 ? a : (a + 1) % 3)) });
  assert.equal(g3.ticket, 0, '5개 중 2개 정답 = 경기권 0');
});

test('HB-2 경기권 차감 — 0장이면 거절 · 같은 ref 두 번은 한 번만 깎임(멱등)', async () => {
  const { dh, call, earn } = await mk();
  assert.equal((await call('/spend', { dh, ref: 'm:abc:1' })).why, 'ticket');
  await earn();
  const a = await call('/spend', { dh, ref: 'm:abc:1' }), b = await call('/spend', { dh, ref: 'm:abc:1' });
  assert.ok(a.ok && b.ok && b.again); assert.equal(b.tix, T.TIX_PER_PACK - 1);
});

test('HB-3 결과 — 한 경기권에 한 번 · 학교 없으면 0 · 이김 2(판 종류 무관) · 남의 경기권 거절 · 30분 지나면 late · IP 해시 없으면 거절', async () => {
  const { dh, dh2, call, earn, tick } = await mk();
  await earn(); await earn(dh2);
  await call('/spend', { dh, ref: 'ref:r1:0001', kind: 'online' });
  assert.equal((await call('/result', { dh, ref: 'ref:r1:0001', won: true, iph: IPH })).added, 0, '학교 안 고름 = 0점(경기권은 소모)');
  await call('/select', { dh, school: SCHOOL });
  await call('/spend', { dh, ref: 'ref:r2:0001', kind: 'online' });
  assert.equal((await call('/result', { dh, ref: 'ref:r2:0001', won: true, iph: IPH })).added, 2, '온라인이라 우겨도 2');
  assert.equal((await call('/result', { dh, ref: 'ref:r2:0001', won: true, iph: IPH })).why, 'again', '같은 경기권 두 번 = 0');
  assert.equal((await call('/result', { dh: dh2, ref: 'ref:r2:0001', won: true, iph: IPH })).why, 'ticket', '남의 경기권');
  await earn(); await call('/spend', { dh, ref: 'ref:r3:0001' }); tick(T.RESULT_TTL_MIN * 60000 + 1);
  assert.equal((await call('/result', { dh, ref: 'ref:r3:0001', won: true, iph: IPH })).why, 'late');
  const top = await call('/top', { dh });
  assert.equal(top.weekly[0].s, 2); assert.equal(top.mine.weekly.rank, 1);
});

test('HB-4 환불 — 쓴 지 90초 안·결과 전만 · 두 번 환불 0 · 결과 낸 표는 환불 0', async () => {
  const { dh, call, earn, tick } = await mk();
  await earn(); await call('/select', { dh, school: SCHOOL });
  await call('/spend', { dh, ref: 'ref:f1:0001' });
  const r = await call('/refund', { dh, ref: 'ref:f1:0001' });
  assert.ok(r.ok); assert.equal(r.tix, T.TIX_PER_PACK);
  assert.equal((await call('/refund', { dh, ref: 'ref:f1:0001' })).ok, false);
  await call('/spend', { dh, ref: 'ref:f2:0001' }); await call('/result', { dh, ref: 'ref:f2:0001', won: false, iph: IPH });
  assert.equal((await call('/refund', { dh, ref: 'ref:f2:0001' })).ok, false, '점수 받은 표 환불 = 이중 이득');
  await call('/spend', { dh, ref: 'ref:f3:0001' }); tick(T.TICKET_REFUND_SEC * 1000 + 1);
  assert.equal((await call('/refund', { dh, ref: 'ref:f3:0001' })).ok, false, '90초 지나면 환불 0');
});

test('HB-5 하루 상한 — 기기 40 · IP 상한', async () => {
  const { dh, call, earn } = await mk();
  await call('/select', { dh, school: SCHOOL });
  let sum = 0;
  for (let i = 0; i < 12; i++) { await earn(); await call('/spend', { dh, ref: `ref:c${i}a:01`, kind: 'online' }); sum += (await call('/result', { dh, ref: `ref:c${i}a:01`, won: true, iph: IPH })).added;
    await call('/spend', { dh, ref: `ref:c${i}b:01`, kind: 'online' }); sum += (await call('/result', { dh, ref: `ref:c${i}b:01`, won: true, iph: IPH })).added; }
  assert.equal(sum, T.SCHOOL_DAY_CAP);
  assert.equal((await call('/result', { dh, ref: 'ref:noiph:01', won: true })).why, 'iph', 'IP 해시 없음 = 거절');
  const m = await mk(); await m.call('/select', { dh: m.dh, school: SCHOOL });
  await m.hub.db.prepare('INSERT INTO ipcap (day, iph, s) VALUES (?, ?, ?)').bind('2026-10-10', 'f'.repeat(16), T.IP_DAY_CAP - 1).run();
  await m.earn(); await m.call('/spend', { dh: m.dh, ref: 'ref:ip1:0001', kind: 'online' });
  assert.equal((await m.call('/result', { dh: m.dh, ref: 'ref:ip1:0001', won: true, iph: 'f'.repeat(16) })).added, 1, 'IP 상한에 1 남음');
});

test('HB-6 경합 — 환불된 표에 결과 0 · 결과 낸 표 환불 0 · 상한 넘는 갱신은 DB 가 거절', async () => {
  const { dh, call, earn, hub } = await mk();
  await earn(); await call('/select', { dh, school: SCHOOL });
  await call('/spend', { dh, ref: 'ref:race1:01' });
  assert.ok((await call('/refund', { dh, ref: 'ref:race1:01' })).ok);
  assert.equal((await call('/result', { dh, ref: 'ref:race1:01', won: true, iph: IPH })).why, 'ticket', '환불된 표로 점수 0');
  await call('/spend', { dh, ref: 'ref:race2:01' });
  assert.equal((await call('/result', { dh, ref: 'ref:race2:01', won: true, iph: IPH })).added, 2);
  assert.equal((await call('/refund', { dh, ref: 'ref:race2:01' })).ok, false, '점수 받은 표 환불 0');
  // 배치 안의 트리거가 직접 막는지 — «읽고 계산»을 건너뛴 갱신(동시 요청 흉내)
  await hub.db.prepare("UPDATE dev SET pts = 39, pts_day = '2026-10-10' WHERE dh = ?").bind(dh).run();
  await assert.rejects(hub.db.batch([hub.db.prepare("UPDATE dev SET pts = pts + 2 WHERE dh = ?").bind(dh)]), /cap/);
  await assert.rejects(hub.db.batch([hub.db.prepare("INSERT INTO ipcap (day, iph, s) VALUES ('2026-10-10', 'x', ?)").bind(T.IP_DAY_CAP + 1)]), /cap/);
  // 남의 dh 로 scored 를 직접 넣어도 트리거가 막는다
  await call('/spend', { dh, ref: 'ref:race3:01' }).catch(() => {});
  await assert.rejects(hub.db.batch([hub.db.prepare("INSERT INTO scored (ref, dh, n, at) VALUES ('ref:race3:01', 'ffffffffffffffff', 2, 1)")]), /ticket/);
});

test('HB-7 FREE_PLAY — 이용권 0장이어도 판 영수증이 나오고 학교 점수 정산 · 같은 ref 멱등 · 끄면(기본) 그대로 거절', async () => {
  const off = await mk();
  assert.equal((await off.call('/me', { dh: off.dh })).free, false);
  assert.equal((await off.call('/spend', { dh: off.dh, ref: 'r'.repeat(20), kind: 'level' })).ok, false, '기본 허브 = 0장이면 거절');
  const { dh, call, tick } = await mk({ free: true });
  const me = await call('/me', { dh });
  assert.equal(me.free, true); assert.equal(me.tix, 0);
  await call('/select', { dh, school: SCHOOL });
  const ref = 'f'.repeat(20);
  assert.equal((await call('/spend', { dh, ref, kind: 'level' })).ok, true, 'FREE_PLAY = 0장이어도 판 시작');
  assert.equal((await call('/spend', { dh, ref, kind: 'level' })).ok, true, '같은 ref 재전송 멱등');
  assert.equal((await call('/me', { dh })).tix, 0, '차감 전후 이용권 0장 그대로(넣고 바로 씀)');
  tick(60_000);
  const r = await call('/result', { dh, ref, won: true, iph: IPH });
  assert.equal(r.added, 2, '판 끝 학교 점수 정산: ' + JSON.stringify(r));
});

// HB-8 (1.2.0) — 음악 과목: 학년마다 문항이 만들어지고, 보기 3개가 서로 다르며 정답이 그 안에 있고, 정답 위치가 고르다
test('HB-8 음악 과목 문항', async () => {
  const { makeQuestions } = await import('../hub/shared/quiz.js');
  const pos = [0, 0, 0];
  const texts = new Set();
  for (const grade of [1, 3, 4, 5, 6]) {
    for (let seed = 1; seed <= 300; seed++) {
      for (const q of makeQuestions(seed * 7919 + grade, { subject: 'music', grade, count: 6 })) {
        assert.equal(q.choices.length, 3, '보기 3개: ' + JSON.stringify(q));
        assert.equal(new Set(q.choices).size, 3, '보기 중복: ' + JSON.stringify(q));
        assert.ok(q.answer >= 0 && q.answer < 3);
        assert.ok(!/undefined|NaN/.test(q.text + q.choices.join()), '빈 값: ' + JSON.stringify(q));
        pos[q.answer]++; texts.add(q.text);
      }
    }
  }
  const n = pos.reduce((a, b) => a + b, 0);
  for (const c of pos) assert.ok(Math.abs(c / n - 1 / 3) < 0.03, '정답 위치 쏠림: ' + pos);
  assert.ok(texts.size >= 40, '문항 종류가 너무 적다: ' + texts.size);
  // 1.6.0 — 2026-10-17 사용자 «음악문제 풀이 너무 작다 — 대폭 늘려»(1.5 까지 3학년 서로 다른 문항 25개 → 한 판 5문제면 몇 판 만에 다 외운다)
  for (const [grade, min] of [[3, 90], [4, 180], [5, 240], [6, 280]]) {
    const t = new Set();
    for (let seed = 0; seed < 4000; seed++) for (const q of makeQuestions(seed * 31 + grade, { subject: 'music', grade, count: 5 })) t.add(q.text);
    assert.ok(t.size >= min, `음악 ${grade}학년 서로 다른 문항 ${t.size}개 < ${min}`);
  }
  // 허브 출제 경로도 music 을 받는다(예전엔 SUBJ 에 없어 수학으로 바뀌었다)
  const { dh, call } = await mk();
  const p = await call('/pack', { dh, subject: 'music', grade: 4 });
  assert.ok(p.qs.every((q) => !/[=×÷+]/.test(q.text)), '음악을 골랐는데 수학 문제: ' + p.qs.map((q) => q.text).join(' / '));
});

test('HB-Q 한 묶음 안 같은 문항 0 — 음악 3학년 5문제에 «3/4박자…»가 세 번 나왔다(2026-10-14 배포본)', async () => {
  const { makeQuestions } = await import('../hub/shared/quiz.js');
  const dup = [];
  for (const subject of ['math', 'eng', 'music']) for (let grade = 1; grade <= 6; grade++) for (let seed = 0; seed < 400; seed++) {
    const qs = makeQuestions(seed, { subject, grade, count: 5 });
    if (new Set(qs.map((q) => q.text)).size !== qs.length) dup.push(`${subject}/${grade}/${seed}`);
  }
  assert.equal(dup.length, 0, `중복 문항 묶음 ${dup.length}개 — 예 ${dup.slice(0, 5).join(' ')}`);
});

test('HB-J 문항 조사 — 받침 따라 은/는·을/를, «낱말» 뒤 띄어쓰기 없음(«바이올린» 는 → «바이올린»은)', async () => {
  const { makeQuestions } = await import('../hub/shared/quiz.js');
  const bat = (w) => { const h = [...w].reverse().find((c) => c >= '가' && c <= '힣'); return h ? (h.charCodeAt(0) - 0xac00) % 28 !== 0 : false; };
  const bad = new Set();
  for (const subject of ['math', 'eng', 'music']) for (let grade = 1; grade <= 6; grade++) for (let seed = 0; seed < 300; seed++) for (const q of makeQuestions(seed, { subject, grade, count: 5 })) {
    for (const m of q.text.matchAll(/«([^»]+)»(\s*)(은|는|을|를)(?=\s)/g)) {
      const want = bat(m[1]) ? { 은: '은', 는: '은', 을: '을', 를: '을' }[m[3]] : { 은: '는', 는: '는', 을: '를', 를: '를' }[m[3]];
      if (m[2] || m[3] !== want) bad.add(q.text);
    }
    if (/«[^»]+»\s+(의|은|는|을|를|이|가)\s/.test(q.text)) bad.add(q.text);
  }
  assert.equal(bad.size, 0, `조사 틀린 문항 ${bad.size}개 — 예 ${[...bad].slice(0, 4).join(' / ')}`);
});

test('HB-TTL 결과 허용 시간 ≥ 2시간 — 30분이면 긴 판(캠페인 연속·대연대기·연습 9홀 36분·하트가 차는 모드)의 학교 점수가 late 로 사라졌다(2026-10-14 19게임 전수)', () => {
  assert.ok(T.RESULT_TTL_MIN >= 120, `RESULT_TTL_MIN ${T.RESULT_TTL_MIN}분`);
});

// HB-S (1.4.0) — 2026-10-16 사용자 «5위까지만 … 더보기로 나머지 다 · 참여학교 수·참여학생 수·하루 이용자수 등등을 첫화면에»
test('HB-S 전체 순위(20개 넘게) · 통계 — 학교 수·기기 수·오늘 이용·판 수(환불 제외) · 다음 날 오늘 0 · 60초 캐시', async () => {
  const { hub, dh, dh2, call, earn, tick } = await mk();
  // 학교 30곳이 오늘 점수를 가진 상태(옛 LIMIT 20 이면 21위부터 «더보기»에 안 나온다)
  const top0 = await call('/top', {});
  assert.deepEqual(top0.stats, { schools: 0, players: 0, today: 0, playsToday: 0, plays: 0 }, '빈 허브 = 전부 0');
  for (let i = 0; i < 30; i++) await hub.db.prepare('INSERT INTO board (period, k, code, name, sido, s) VALUES (?, ?, ?, ?, ?, ?)').bind('d', top0.day, String(7100000 + i), `학교${i}초등학교`, 'B10', 100 - i).run();
  await earn(); await call('/select', { dh, school: SCHOOL });
  await call('/spend', { dh, ref: 'ref:s1:0001' }); await call('/spend', { dh, ref: 'ref:s2:0001' });
  await call('/refund', { dh, ref: 'ref:s2:0001' });
  await earn(dh2);   // 문제만 푼 기기도 «이용»
  tick(61e3);
  const t = await call('/top', { dh });
  assert.equal(t.today.length, 30, '20개 넘는 학교도 다 온다');
  assert.equal(t.today[29].s, 71);
  assert.deepEqual(t.stats, { schools: 1, players: 2, today: 2, playsToday: 1, plays: 1 }, '환불한 판은 안 센다 · 문제만 푼 기기도 이용');
  // 60초 안에는 다시 안 센다
  await earn(); await call('/spend', { dh, ref: 'ref:s3:0001' });
  assert.equal((await call('/top', {})).stats.plays, 1, '캐시 안');
  tick(61e3); assert.equal((await call('/top', {})).stats.plays, 2, '캐시 지나면 다시 셈');
  // 다음 날(KST) — 오늘 이용·오늘 판은 0, 누적은 그대로
  tick(24 * 3600e3);
  const n = (await call('/top', {})).stats;
  assert.equal(n.today, 0); assert.equal(n.playsToday, 0); assert.equal(n.plays, 2); assert.equal(n.players, 2);
});

test('HB-S2 1.4.0 전에 쌓인 기록 — 처음 한 번 통계 표로 옮긴다(옛 허브를 올려도 0 으로 시작하지 않는다) · 통계 읽기는 표를 훑지 않는다', async () => {
  const { hub, dh, dh2, call, earn } = await mk();
  await earn(); await call('/select', { dh, school: SCHOOL }); await call('/spend', { dh, ref: 'ref:b1:0001' }); await earn(dh2);
  // 옛 허브 흉내 — 통계 표와 표지를 비운다(트리거가 없던 시절)
  for (const q of ['DELETE FROM cnt', 'DELETE FROM pact', 'DELETE FROM sch', 'DELETE FROM dact', 'DELETE FROM dplay']) await hub.db.prepare(q).run();
  resetSchemaMemo();   // 옛 허브를 새 워커로 올린 것 — 새 isolate 는 모듈 기억이 비어 있다
  const h2 = new Hub({ db: hub.db, secret: 'test-key', now: hub.now });
  const s = (await h2.handle('/top', {})).body.stats;
  assert.deepEqual(s, { schools: 1, players: 2, plays: 1, today: 2, playsToday: 1 });
  // 두 번째 허브는 다시 옮기지 않는다(표지) — 옮기면 표를 또 훑는다. 일부러 틀린 값을 넣어 두고 그대로인지 본다
  await hub.db.prepare("UPDATE cnt SET n = 99 WHERE k = 'players'").run();
  resetSchemaMemo(); const h3 = new Hub({ db: hub.db, secret: 'test-key', now: hub.now }); await h3.init();
  assert.equal((await hub.db.prepare("SELECT n FROM cnt WHERE k = 'players'").first()).n, 99, '표지가 있으면 다시 옮기지 않는다');
});

// HB-R — 허브 쿼리가 표를 통째로 훑지 않는다(D1/DO 무료 한도 하루 500만 행). 2026-10-16 1.4.0 첫 통계가 COUNT 로 훑다가 오케스트라 배포 게이트에 막혔다 — 키트 시험이 먼저 잡게.
test('HB-R 허브 쿼리 전체 훑기 0(check-db-reads)', async () => {
  const { execFileSync } = await import('node:child_process'); const { fileURLToPath } = await import('node:url'); const path = await import('node:path');
  const here = path.dirname(fileURLToPath(import.meta.url));
  const os = await import('node:os');
  // 배포 스크립트가 HOME 을 계정별 폴더(.cf-home)로 바꿔도 찾게 — 실제 사용자 홈(2026-10-16 art-museum deploy.sh 실측)
  const gate = path.join(os.userInfo().homedir, '.claude/skills/game-builder/tools/check-db-reads.mjs');
  const dir = path.join(here, '../hub');   // 키트 안이든 게임 안(tests/school-hub.nodetest.mjs)이든 tests/../hub
  const out = execFileSync(process.execPath, [gate, dir], { encoding: 'utf8' });
  assert.match(out, /전체 훑기 0/);
});

test('HB-8 NO_CAP — 기기 40·IP 상한 없이 학교 점수가 계속 쌓인다 · 이미 깔린 상한 트리거도 지운다', async () => {
  const { dh, call, earn, hub } = await mk({ nocap: true });
  await hub.init();
  await call('/select', { dh, school: SCHOOL });
  let sum = 0;
  for (let i = 0; i < 12; i++) { await earn(); for (const s of 'ab') { await call('/spend', { dh, ref: `ref:n${i}${s}:01`, kind: 'online' }); sum += (await call('/result', { dh, ref: `ref:n${i}${s}:01`, won: true, iph: IPH })).added; } }
  assert.equal(sum, 48, '기기 40 상한을 넘어 계속');
  assert.equal((await call('/me', { dh })).nocap, true);
  await hub.db.batch([hub.db.prepare("INSERT INTO ipcap (day, iph, s) VALUES ('2026-10-10', 'x', ?)").bind(T.IP_DAY_CAP + 5)]);
  /* 상한 트리거가 깔린 DB 를 NO_CAP 허브가 열면 지운다 */
  const old = await mk(); await old.hub.init();
  const h2 = new Hub({ db: old.hub.db, secret: 'test-key', now: old.hub.now, nocap: true }); await h2.init();
  await old.hub.db.batch([old.hub.db.prepare("INSERT INTO ipcap (day, iph, s) VALUES ('2026-10-10', 'y', ?)").bind(T.IP_DAY_CAP + 5)]);
});

test('HB-SW 학교 바꾸기 = 하루 switchPerDay 번(기본 1) · 처음 고르기·같은 학교는 안 센다 · 다음 날 다시', async () => {
  const A = SCHOOL, B = { code: '7010001', name: '서울나래초등학교', sido: 'B10' }, C = { code: '7010002', name: '서울가람초등학교', sido: 'B10' };
  { const { dh, call } = await mk();
    assert.equal((await call('/select', { dh, school: A })).ok, true, '처음 고르기');
    assert.equal((await call('/select', { dh, school: B })).error, 'today', '기본 1 = 처음 고른 날엔 못 바꾼다(옛 뜻 그대로)'); }
  { const { dh, call, tick } = await mk({ switchPerDay: 2 });
    assert.equal((await call('/select', { dh, school: A })).ok, true, '처음 고르기');
    assert.equal((await call('/select', { dh, school: A })).ok, true, '같은 학교는 안 센다');
    assert.equal((await call('/select', { dh, school: B })).ok, true, '1번째 바꾸기');
    assert.equal((await call('/select', { dh, school: C })).ok, true, '2번째 바꾸기(처음 고른 날도 2번)');
    const r = await call('/select', { dh, school: A });
    assert.equal(r.error, 'today', '3번째는 막는다'); assert.equal(r.per, 2, '몇 번인지 알려 준다');
    tick(86400e3);
    assert.equal((await call('/select', { dh, school: A })).ok, true, '다음 날은 다시(지금 C → A)');
    assert.equal((await call('/select', { dh, school: B })).ok, true, '다음 날 2번째');
    assert.equal((await call('/select', { dh, school: C })).error, 'today', '다음 날 3번째는 막는다'); }
});

test('HB-W 무료·상한 없음(타자왕국) 판 하나 쓰기 ≤ 7행(트리거 포함) — 이용권 +1/−1 · 상한 누적을 안 쓴다(2026-10-19 DO 무료 하루 쓰기 소진)', async () => {
  const stg = fakeDOStorage(); let W = 0; const ex = stg.sql.exec.bind(stg.sql); stg.sql.exec = (...a) => { const c = ex(...a); W += c.rowsWritten; return c; };
  let now = Date.UTC(2026, 9, 10, 3); const hub = new Hub({ db: doD1(stg), secret: 'k', now: () => now, free: true, nocap: true });
  const dh = await didHash(DID), call = async (p, b) => (await hub.handle(p, b)).body;
  await call('/select', { dh, school: SCHOOL });
  await call('/spend', { dh, ref: 'ref:ww:0000' }); await call('/result', { dh, ref: 'ref:ww:0000', won: true, iph: IPH });
  const before = (await call('/me', { dh })).tix; W = 0; const N = 10;
  for (let k = 1; k <= N; k++) { now += 60000; const ref = `ref:ww:${String(k).padStart(4, '0')}`;
    assert.equal((await call('/spend', { dh, ref })).ok, true); assert.equal((await call('/result', { dh, ref, won: true, iph: IPH })).ok, true); }
  assert.ok(W / N <= 7, `판 하나 = ${W / N}행`);
  assert.equal((await call('/me', { dh })).tix, before, '무료 판은 이용권을 건드리지 않는다');
  const top = await call('/top', {}); assert.ok(top.today.some((s) => s.code === SCHOOL.code && s.s > 0), '학교 점수는 그대로 쌓인다');
});

// HB-DDL — 워커는 요청마다 new Hub 를 만든다(index.js hubOf). 그때마다 표·트리거 DDL 을 다시 돌리면 요청당 ~40행씩 읽어
//   D1 무료 «하루 읽기 500만 행»(계정 전체 공유)을 태운다 — 2026-10-19 끝까지 진화 하루 216만 행 → simfeelgood 계정 허브 10개 전부 1101.
//   표가 이미 이 모양이면(SCHEMA 해시 표식) 두 번째 Hub 부터는 DDL 0 · 표 모양이 바뀌면(free 켜기 등) 다시 깐다.
test('HB-DDL 표 만들기는 한 번만 — 요청마다 새 Hub 여도 DDL 을 다시 안 돌린다', async () => {
  const db = await sqliteD1(); let ddl = 0;
  const spy = { ...db, batch: (st) => { ddl += st.filter((s) => /^\s*(CREATE|DROP)\b/i.test(s.sql ?? s.__sql ?? '')).length; return db.batch(st); }, prepare: (q) => { const p = db.prepare(q); p.__sql = q; p.sql ??= q; return p; } };
  const mk = (o = {}) => new Hub({ db: spy, secret: 'k', now: () => Date.UTC(2026, 9, 10, 3), ...o });
  await mk().handle('/top', {}); const first = ddl; assert.ok(first > 10, `첫 Hub 가 표를 깔았다(${first})`);
  for (let i = 0; i < 5; i++) await mk().handle('/top', {});
  assert.equal(ddl, first, `요청마다 새 Hub 에서 DDL 이 ${ddl - first}번 더 돌았다`);
  await mk({ free: true }).handle('/top', {}); assert.ok(ddl > first, '표 모양이 바뀌면(free) 다시 깔아야 한다');
});

// HB-RT — 판 끝 결과에 바뀐 순위가 같이 온다(1.12.0 · 2026-10-20 «서버비 아끼면서 실시간성 유지») — 클라이언트가 /schools 를 또 부르지 않아도 방금 점수가 순위에 보인다
test('HB-RT 결과 응답에 순위(top) — 방금 낸 점수가 들어 있고 «내 학교»도 붙는다', async () => {
  const { dh, call, earn } = await mk();
  await earn(); await call('/select', { dh, school: SCHOOL }); await call('/spend', { dh, ref: 'ref:rt:0001' });
  const r = await call('/result', { dh, ref: 'ref:rt:0001', won: true, iph: IPH });
  assert.ok(r.ok && r.top, '결과에 순위가 없다(클라이언트가 /schools 를 또 불러야 한다)');
  const me = r.top.today.find((x) => x.code === SCHOOL.code);
  assert.ok(me && me.s >= r.added, `오늘 순위에 방금 점수가 없다 ${JSON.stringify(r.top.today)}`);
});
