"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** SSR/hydration 안전 가드 — 서버·첫 클라이언트 렌더에서 false, 하이드레이션 후 true */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
