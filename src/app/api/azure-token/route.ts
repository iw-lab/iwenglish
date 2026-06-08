import { NextResponse } from "next/server";
import { serverEnv, featureAvailability } from "@/lib/env";

/**
 * 브라우저 Azure Speech SDK 용 단기 토큰 발급 (키 노출 금지).
 * 클라이언트: SpeechConfig.fromAuthorizationToken(token, region)
 */
export async function GET() {
  if (!featureAvailability.azure()) {
    return NextResponse.json(
      { error: "Azure Speech 키가 설정되지 않았어요" },
      { status: 503 },
    );
  }
  try {
    const res = await fetch(
      `https://${serverEnv.azureSpeechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": serverEnv.azureSpeechKey,
          "Content-Length": "0",
        },
      },
    );
    if (!res.ok) throw new Error(`token issue failed: ${res.status}`);
    const token = await res.text();
    return NextResponse.json(
      { token, region: serverEnv.azureSpeechRegion },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "token error" },
      { status: 500 },
    );
  }
}
