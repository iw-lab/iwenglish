// 같은 허브 시험(HB-*)을 Durable Object 저장소 껍데기(doD1)로 한 번 더 — 저장소를 바꿔도 이용권·결과·상한 의미가 같아야 한다
process.env.HUB_STORE = 'do';
await import('./school-hub.nodetest.mjs');
