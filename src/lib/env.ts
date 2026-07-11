/**
 * 환경변수 접근 헬퍼.
 * - NEXT_PUBLIC_* 는 클라/서버 양쪽, 나머지는 서버 전용.
 * - 키가 없어도 앱이 죽지 않도록 안전 접근 + 가용성 플래그 제공(골격 모드 대응).
 */

export const env = {
  billingEnabled: process.env.NEXT_PUBLIC_BILLING_ENABLED === "true",
};

/** 서버 전용 시크릿 (클라이언트 번들에 들어가면 안 됨) */
export const serverEnv = {
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  myVoiceBaseUrl: process.env.MYVOICE_BASE_URL ?? "",
  myVoiceApiKey: process.env.MYVOICE_API_KEY ?? "",
};

/** 각 외부 서비스 사용 가능 여부 (선택 기능 UI 분기용) */
export const featureAvailability = {
  gemini: () => Boolean(serverEnv.geminiApiKey),
  openai: () => Boolean(serverEnv.openaiApiKey),
  myVoice: () => Boolean(serverEnv.myVoiceBaseUrl && serverEnv.myVoiceApiKey),
};

/** 시크릿이 없을 때 명확한 에러 (시드 스크립트/서버 라우트용) */
export function requireServerEnv<K extends keyof typeof serverEnv>(
  key: K,
): string {
  const v = serverEnv[key];
  if (!v) {
    throw new Error(
      `[env] 필수 서버 환경변수 누락: ${key}. .env.local 을 확인하세요 (.env.local.example 참고).`,
    );
  }
  return v;
}
