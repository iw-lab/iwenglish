/**
 * 환경변수 접근 헬퍼.
 * - 서버 전용 시크릿만 다룬다(클라이언트로 나가는 환경변수는 없다).
 * - 키가 없어도 앱이 죽지 않도록 안전 접근 + 가용성 플래그 제공(골격 모드 대응).
 *
 * 결제/요금제 플래그는 두지 않는다 — 이 앱은 전 기능 무료 오픈소스이고,
 * 쓰지 않는 과금 스캐폴딩을 남겨 두면 코드가 사실과 다른 말을 하게 된다.
 */

/** 서버 전용 시크릿 (클라이언트 번들에 들어가면 안 됨) */
export const serverEnv = {
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  myVoiceBaseUrl: process.env.MYVOICE_BASE_URL ?? "",
  myVoiceApiKey: process.env.MYVOICE_API_KEY ?? "",
};

/** 각 외부 서비스 사용 가능 여부 (선택 기능 UI 분기용) */
export const featureAvailability = {
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
