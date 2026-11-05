// 로컬(vite dev·preview)엔 학교 허브 중계(/api/hub — Pages 함수)가 없다 → «허브 없음»({offline:true} = hubnet 이 바로 게임)으로 답한다.
//   404 로 두면 e2e 마다 «콘솔 오류 0»이 깨졌다(포물선 요새단 2026-11-04). 배포본엔 실리지 않는다(vite 서버 전용).
//   vite.config: import { hubOffline } from './src/gb/vite-hub-offline.mjs'; plugins: [hubOffline()]
//   자체 정적 시험 서버도 같은 답: if (url.startsWith('/api/hub')) → 200 {"offline":true}
export function hubOffline() {
  const mw = (_q, r) => { r.setHeader('content-type', 'application/json'); r.end('{"offline":true}'); };
  return { name: 'gb-hub-offline', configureServer(s) { s.middlewares.use('/api/hub', mw); }, configurePreviewServer(s) { s.middlewares.use('/api/hub', mw); } };
}
