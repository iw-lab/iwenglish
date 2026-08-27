"use client";

import { useEffect } from "react";

/**
 * "리액트가 실제로 마운트됐다"는 유일한 신호.
 * 이 값이 없으면 recovery-script 의 워치독이 흰 화면으로 보고 앱을 새로 받는다.
 * (레이아웃에 있으므로 어떤 페이지에서든 마운트된다)
 */
export function AliveBeacon() {
  useEffect(() => {
    (window as unknown as { __etAlive?: boolean }).__etAlive = true;
    // 정상적으로 떴으면 복구 쿨다운 기록을 지운다 — 다음에 진짜 문제가 생겼을 때
    // 60초 쿨다운에 걸려 복구가 막히지 않도록.
    try {
      sessionStorage.removeItem("echotale:recovered");
    } catch {
      /* 저장소를 못 쓰는 환경 — 무시 */
    }
  }, []);
  return null;
}
