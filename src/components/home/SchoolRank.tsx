"use client";

import { useEffect, useRef } from "react";
import { mountSchoolRank } from "@/lib/schoolHub";

/**
 * 학교 대항 순위 — 첫 화면(서재) 맨 위 · 접지 않음.
 * 카드 그리기는 키트가 직접 DOM 을 그린다(mountSchoolRank) — React 는 자리(div)만 내준다.
 * 선행쌤 배너([data-gb=site-link])도 카드 바로 다음 형제로 키트가 저절로 붙인다(README 1.15.0).
 */
export function SchoolRank() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) mountSchoolRank(ref.current);
  }, []);
  return <div ref={ref} />;
}
