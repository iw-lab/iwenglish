import { env } from "@/lib/env";

export type Plan = "classroom" | "free" | "pro";
export type Feature =
  | "read-aloud"
  | "sentence"
  | "word-tap"
  | "shadowing-basic"
  | "shadowing-ladder" // 6단계 쉐도잉 사다리
  | "pronunciation-precise" // 음소단위 정밀 발음평가
  | "offline" // PWA 오프라인 낭독
  | "teacher-report" // 교사 리포트 PDF
  | "unlimited-books"; // 일일 책 제한 없음

/** 플랜별 허용 기능 (상용화 시 사용). 교실 모드에선 게이팅이 전부 허용 반환 */
const PLAN_FEATURES: Record<Plan, Feature[]> = {
  classroom: [
    "read-aloud",
    "sentence",
    "word-tap",
    "shadowing-basic",
    "shadowing-ladder",
    "pronunciation-precise",
    "offline",
    "teacher-report",
    "unlimited-books",
  ],
  free: ["read-aloud", "sentence", "word-tap", "shadowing-basic"],
  pro: [
    "read-aloud",
    "sentence",
    "word-tap",
    "shadowing-basic",
    "shadowing-ladder",
    "pronunciation-precise",
    "offline",
    "teacher-report",
    "unlimited-books",
  ],
};

/** Free 플랜 일일 책 열람 제한 */
export const FREE_DAILY_BOOK_LIMIT = 5;

/**
 * 기능 사용 가능 여부.
 * NEXT_PUBLIC_BILLING_ENABLED=false(교실 모드)면 항상 true(전권 무료).
 * true 로 켜고 plan 을 넘기면 플랜별 게이팅 동작.
 */
export function can(feature: Feature, plan: Plan = "classroom"): boolean {
  if (!env.billingEnabled) return true; // 교실 모드 = 전권 허용
  return PLAN_FEATURES[plan].includes(feature);
}

/** 상용화 시 업셀 노출 여부 */
export function shouldUpsell(feature: Feature, plan: Plan): boolean {
  return env.billingEnabled && !can(feature, plan);
}
