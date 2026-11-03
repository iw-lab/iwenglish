"use client";

import { useEffect } from "react";
import { bootSchoolHub } from "@/lib/schoolHub";

/**
 * 학교 허브 부팅 — AliveBeacon 과 같은 자리(레이아웃)에서 앱 전체에 한 번만.
 * 렌더는 안 한다 — configureHub/configureSchool 호출만(가드로 중복 안전).
 */
export function SchoolHubBoot() {
  useEffect(() => {
    bootSchoolHub();
  }, []);
  return null;
}
