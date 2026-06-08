import { NextResponse } from "next/server";
import { featureAvailability } from "@/lib/env";
import { assessPronunciation } from "@/lib/azure/pronunciation";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/pronounce (multipart: audio, reference)
 * 발음 평가. 16kHz/16bit/mono PCM WAV 를 기대.
 * Azure 미설정 시 503 → 클라이언트는 "내 목소리 vs 원어민 비교" 모드로 폴백.
 */
export async function POST(request: Request) {
  if (!featureAvailability.azure()) {
    return NextResponse.json(
      { error: "Azure Speech 키가 필요해요" },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const audio = form.get("audio");
  const reference = String(form.get("reference") ?? "");
  if (!(audio instanceof Blob) || !reference) {
    return NextResponse.json({ error: "audio/reference 누락" }, { status: 400 });
  }

  try {
    const buf = Buffer.from(await audio.arrayBuffer());
    const scores = await assessPronunciation(buf, reference);
    return NextResponse.json({
      ...scores,
      encouragement: encourage(scores.overall),
    });
  } catch {
    // 형식 불일치(webm 등)/인식 실패 — 비교 모드로 폴백 유도
    return NextResponse.json(
      { error: "평가 형식 오류 (WAV PCM 필요)" },
      { status: 503 },
    );
  }
}

function encourage(overall: number): string {
  if (overall >= 90) return "완벽에 가까워요! 원어민 같아요 🌟";
  if (overall >= 75) return "아주 좋아요! 조금만 더 또렷하게 🦊";
  if (overall >= 60) return "잘했어요! 빨간 단어를 한 번 더 연습해요 💪";
  return "천천히 다시 따라 말해 볼까요? 할 수 있어요 🌱";
}
