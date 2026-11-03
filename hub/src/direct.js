// 직접 연결(1.10.0 · 2026-10-19 타자왕국 «Pages 함수 하루 10만 무료 한도» — 중계를 걷고 게임이 워커를 바로 부른다) 도우미.
// 워커 밖(node 시험)에서도 불러 쓸 수 있게 따로 둔다.
/** DIRECT_ORIGINS(쉼표) 에 든 출처인가 — 정확히 같거나 «https://*.도메인»(그 도메인의 하위 이름) */
export function originOk(origin, list) {
  if (!origin || !list) return false;
  return String(list).split(',').map((x) => x.trim()).filter(Boolean).some((o) => o === origin || (o.startsWith('https://*.') && origin.startsWith('https://') && origin.endsWith(o.slice('https://*'.length))));
}
/** 날짜·소금을 섞은 IP 해시 16자(원문 저장 0) — Pages 중계 함수와 같은 식 */
export async function ipHash(ip, salt, now = Date.now()) {
  const day = new Date(now + 9 * 3600e3).toISOString().slice(0, 10);
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}|${day}|${ip}`));
  return [...new Uint8Array(h).slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
