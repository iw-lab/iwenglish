import { NextResponse } from "next/server";
import { normalizeWord } from "@/lib/utils";
import { lookupDictionary } from "@/lib/dictionary";
import { getStaticWord, localWordAudio } from "@/lib/data/staticBooks";
import type { Word } from "@/types/book";

/** GET /api/word?w=little → 정적 사전 우선, 없으면 런타임 조회 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("w") ?? "";
  const word = normalizeWord(raw);
  if (!word) return NextResponse.json({ error: "no word" }, { status: 400 });

  // 0) 공유 사전의 발음 mp3가 있으면 audioUrl 로 강제(기능어 포함 — Web Speech 폴백 제거)
  const localAudio = localWordAudio(word);

  // 1.5) 정적 사전(시드 책에 포함된 한글뜻) 우선
  const seeded = getStaticWord(word);
  if (seeded && seeded.meaning_ko)
    return NextResponse.json({ ...seeded, audioUrl: localAudio || seeded.audioUrl });

  // 2) 런타임 조회 (dictionary)
  const dict = await lookupDictionary(word);
  if (!dict) {
    // 뜻은 못 찾아도 로컬 발음이 있으면 음성만이라도 제공(폴백 방지)
    if (localAudio)
      return NextResponse.json({
        text: word,
        lemma: word,
        ipa: "",
        pos: "",
        meaning_ko: "",
        example_en: "",
        example_ko: "",
        audioUrl: localAudio,
      } satisfies Word);
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // 뜻·예문은 정적 사전에서만 (Gemini API 경로 제거됨 — 2026-07-12)
  const result: Word = {
    text: word,
    lemma: word,
    ipa: dict.ipa,
    pos: dict.pos,
    meaning_ko: dict.definition_en,
    example_en: dict.example_en,
    example_ko: "",
    audioUrl: localAudio || dict.audioUrl,
  };

  return NextResponse.json(result);
}
