// 학교 허브 중계 — 게임 페이지와 같은 오리진(/api/hub/*)에서 daum 계정 허브 워커로 넘긴다(2026-10-10 리마스터).
// 🔴 허브는 이 중계가 붙이는 비밀 머리글(HUB_PROXY_KEY)이 있어야만 받는다. 아이 IP 는 원문을 넘기지 않고
//    «날짜를 섞은 해시 16자»만 넘긴다(학교 와이파이 하루 상한 전용 — 저장소에 IP 원문 0).
const ALLOW = new Set(['school', 'schools', 'me', 'select', 'pack', 'grade', 'spend', 'refund', 'result']);
const J = (body, status) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
async function ipHash(ip, salt) {
  const day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}|${day}|${ip}`));
  return [...new Uint8Array(h).slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export async function onRequest({ request, env, params }) {
  const seg = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  if (!ALLOW.has(seg)) return J({ error: 'not found' }, 404);
  if (!env.HUB_URL || !env.HUB_PROXY_KEY) return J({ error: 'config' }, 503);
  const src = new URL(request.url), dst = new URL(env.HUB_URL.replace(/\/$/, '') + '/' + seg + src.search);
  const headers = { 'x-bo-proxy': env.HUB_PROXY_KEY, 'content-type': 'application/json' };
  const ip = request.headers.get('cf-connecting-ip');
  if (ip && env.IP_SALT) headers['x-bo-iph'] = await ipHash(ip, env.IP_SALT);
  const init = { method: request.method === 'POST' ? 'POST' : 'GET', headers };
  if (init.method === 'POST') {   // 본문은 8KB 까지만 읽는다 — 큰 본문을 통째로 메모리에 올린 뒤 재면 동시 요청으로 중계를 말릴 수 있다(2026-10-19 codex·gemini 교차검증)
    if (Number(request.headers.get('content-length') || 0) > 8192) return J({ error: 'big' }, 413);
    const rd = request.body?.getReader(); const parts = []; let n = 0;
    if (rd) for (;;) { const { done, value } = await rd.read(); if (done) break; n += value.byteLength; if (n > 8192) { rd.cancel().catch(() => {}); return J({ error: 'big' }, 413); } parts.push(value); }
    const buf = new Uint8Array(n); let o = 0; for (const p of parts) { buf.set(p, o); o += p.byteLength; } init.body = new TextDecoder().decode(buf);
  }
  try {
    const r = await fetch(dst, init);
    return new Response(r.body, { status: r.status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' /* 순위도 캐시 금지 — 판 끝나고 바로 열면 옛 점수가 보였다(e2e R-9 · 응답에 «내 학교»가 섞여 개인화이기도 하다) */ } });
  } catch { return J({ error: 'hub' }, 502); }
}
