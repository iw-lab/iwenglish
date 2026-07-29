import { NextResponse } from "next/server";
import { normalizeWord } from "@/lib/utils";
import { lookupDictionary } from "@/lib/dictionary";
import { getStaticWord, localWordAudio } from "@/lib/data/staticBooks";
import type { Word } from "@/types/book";

/** GET /api/word?w=little → 정적 사전 우선, 없으면 런타임 조회 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("w") ?? "";
  // 길이 상한 — 이 엔드포인트는 정적 사전에 없는 단어를 외부 무료 사전으로 프록시하므로,
  // 장문 요청이 그대로 외부 서브리퀘스트가 되지 않도록 입구에서 막는다.
  // 영어 최장 단어도 45자라 64자면 충분하다.
  if (raw.length > 64)
    return NextResponse.json({ error: "too long" }, { status: 400 });
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
  // meaning_ko 에 외부 사전의 영어 정의(definition_en)를 넣지 않는다 —
  // 초등학생에게 "한국어 뜻" 자리에 영어 문장이 노출돼 어휘 퀴즈까지 오염된다.
  // 한국어 뜻이 없으면 비워 두고 발음·예문만 제공한다.
  const result: Word = {
    text: word,
    lemma: word,
    ipa: dict.ipa,
    pos: dict.pos,
    meaning_ko: "",
    example_en: dict.example_en,
    example_ko: "",
    audioUrl: localAudio || dict.audioUrl,
  };

  return NextResponse.json(result);
}
