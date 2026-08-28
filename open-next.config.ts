import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/**
 * OpenNext(Cloudflare Workers) 설정.
 *
 * ⚠️ 예전에는 `defineCloudflareConfig({})` 였다. 그러면 incrementalCache 가 "dummy" 라
 * **모든 문서 요청이 매번 풀 SSR 을 다시 돈다**(실측: 응답 헤더 `x-nextjs-cache: MISS` 가
 * 항상 MISS). 이 앱은 352권 전권이 빌드 타임에 프리렌더되는 완전 정적 사이트라
 * 재검증이 필요 없다 — 프리렌더 결과를 Workers 정적 자산에서 그대로 읽어 주는
 * staticAssetsIncrementalCache 가 정확히 이 경우를 위한 구현이다(읽기 전용).
 *
 * ISR·on-demand revalidation 을 쓰기 시작하면 이 캐시는 못 쓴다(쓰기가 막혀 있다).
 * 그때는 r2/kv incremental cache 로 바꿔야 한다.
 */
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
