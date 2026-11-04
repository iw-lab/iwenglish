import { NextResponse } from "next/server";

/** GET /api/hub/schools — 선행쌤(ssam-ranks)이 "같은 오리진"에서 10분마다 긁어가는 자리.
 *
 * 이 앱은 Next.js + OpenNext → Cloudflare Worker 직결 배포라 Pages Functions 중계(/api/hub/[[path]].js)가
 * 없고, 브라우저 쪽은 직결(direct) 모드로 허브를 바로 부른다(src/lib/schoolHub.ts). 하지만 ssam-ranks
 * 워커는 "게임 배포본과 같은 오리진"의 /api/hub/schools 를 서버 간(cron) 요청으로 긁어가므로, 그 경로가
 * 이 도메인에 실제로 존재해야 한다 — 없으면 Next.js 가 이 경로를 못 찾고 홈 페이지 HTML(200)을 돌려줘
 * 선행쌤 쪽 집계에서 이 게임이 통째로 빠진다(B15 실패, 2026-11-03 실측).
 *
 * 허브(src/index.js)의 /schools 는 Origin 이 자신의 DIRECT_ORIGINS 에 있으면 비밀 머리글 없이 받는다
 * (hub/wrangler.toml 의 DIRECT_ORIGINS 에 이 도메인이 이미 등록돼 있다) — 그래서 이 라우트는 그 Origin을
 * 그대로 흉내 내어 서버에서 허브로 중계만 한다(쓰기 없음 · 비밀 0 · 순위 읽기 전용).
 */
const HUB_DIRECT = "https://echotale-hub.simssijjang-korea.workers.dev";
const SELF_ORIGIN = "https://echotale.simssijjang-d79.workers.dev";

export async function GET(request: Request) {
  const { search } = new URL(request.url);
  try {
    const r = await fetch(`${HUB_DIRECT}/schools${search}`, {
      headers: { origin: SELF_ORIGIN },
      // 순위는 캐시하지 않는다 — 판 끝나고 바로 열면 옛 점수가 보인다(키트 중계와 같은 규칙).
      cache: "no-store",
    });
    const body = await r.text();
    return new NextResponse(body, {
      status: r.status,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "hub" }, { status: 502 });
  }
}
