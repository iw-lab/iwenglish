import { NextResponse } from "next/server";
import { normalizeWord } from "@/lib/utils";
import { createServerSupabase } from "@/lib/supabase/server";
import { lookupDictionary } from "@/lib/dictionary";
import { geminiWordMeaning } from "@/lib/gemini";
import { featureAvailability, env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaticWord, localWordAudio } from "@/lib/data/staticBooks";
import type { Word } from "@/types/book";

/** GET /api/word?w=little → 사전 캐시 우선, 없으면 런타임 조회·캐시 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("w") ?? "";
  const word = normalizeWord(raw);
  if (!word) return NextResponse.json({ error: "no word" }, { status: 400 });

  // 0) 공유 사전의 발음 mp3가 있으면 audioUrl 로 강제(기능어 포함 — Web Speech 폴백 제거)
  const localAudio = localWordAudio(word);

  // 1) 캐시 조회
  const supabase = await createServerSupabase();
  if (supabase) {
    const { data } = await supabase
      .from("words")
      .select("*")
      .eq("text", word)
      .maybeSingle();
    if (data) {
      const w = toWord(data);
      return NextResponse.json({ ...w, audioUrl: localAudio || w.audioUrl });
    }
  }

  // 1.5) 정적 사전(시드 책에 포함된 한글뜻) 우선
  const seeded = getStaticWord(word);
  if (seeded && seeded.meaning_ko)
    return NextResponse.json({ ...seeded, audioUrl: localAudio || seeded.audioUrl });

  // 2) 런타임 조회 (dictionary + gemini)
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

  let meaning_ko = "";
  let example_en = dict.example_en;
  let example_ko = "";
  if (featureAvailability.gemini()) {
    const g = await geminiWordMeaning(word, dict.pos, dict.definition_en);
    if (g) {
      meaning_ko = g.meaning_ko;
      example_en = g.example_en || example_en;
      example_ko = g.example_ko;
    }
  }

  const result: Word = {
    text: word,
    lemma: word,
    ipa: dict.ipa,
    pos: dict.pos,
    meaning_ko: meaning_ko || dict.definition_en,
    example_en,
    example_ko,
    audioUrl: localAudio || dict.audioUrl,
  };

  // 3) 캐시 저장 (service role 있을 때만)
  if (env.supabaseUrl && featureAvailability.gemini()) {
    try {
      const admin = createAdminClient();
      await admin.from("words").upsert({
        text: result.text,
        lemma: result.lemma,
        ipa: result.ipa,
        pos: result.pos,
        meaning_ko: result.meaning_ko,
        example_en: result.example_en,
        example_ko: result.example_ko,
        audio_url: result.audioUrl,
        updated_at: new Date().toISOString(),
      });
    } catch {
      /* service role 미설정 — 캐시 생략 */
    }
  }

  return NextResponse.json(result);
}

function toWord(d: Record<string, unknown>): Word {
  return {
    text: String(d.text ?? ""),
    lemma: String(d.lemma ?? d.text ?? ""),
    ipa: String(d.ipa ?? ""),
    pos: String(d.pos ?? ""),
    meaning_ko: String(d.meaning_ko ?? ""),
    example_en: String(d.example_en ?? ""),
    example_ko: String(d.example_ko ?? ""),
    audioUrl: String(d.audio_url ?? ""),
  };
}
