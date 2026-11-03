"use client";

import { useEffect, useRef } from "react";
import { bindFullscreenButton } from "@/lib/schoolHub";

/**
 * 전체화면 토글 — 아이콘·라벨은 키트가 상태에 맞춰 직접 그린다(bindFullscreenButton).
 * 못 쓰는 기기(iPhone Safari 등)면 키트가 스스로 숨긴다.
 */
export function FullscreenButton() {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    bindFullscreenButton(ref.current);
  }, []);
  return (
    <button
      ref={ref}
      type="button"
      className="grid h-11 w-11 place-items-center rounded-full hover:bg-muted"
    />
  );
}
