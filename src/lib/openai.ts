import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { serverEnv } from "@/lib/env";

export interface AlignedWord {
  word: string;
  startMs: number;
  endMs: number;
}

/**
 * OpenAI 전사(whisper-1) + 단어 타임스탬프로 음성 강제정렬.
 * 같은 OpenAI TTS로 만든 mp3에 쓰면 싱크가 가장 정확. 실패 시 null.
 */
export async function openaiTranscribeWords(
  absPath: string,
): Promise<AlignedWord[] | null> {
  const key = serverEnv.openaiApiKey;
  if (!key) return null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const bytes = readFileSync(absPath);
      const form = new FormData();
      form.append(
        "file",
        new Blob([new Uint8Array(bytes)], { type: "audio/mpeg" }),
        basename(absPath),
      );
      form.append("model", "whisper-1");
      form.append("response_format", "verbose_json");
      form.append("timestamp_granularities[]", "word");
      const res = await Promise.race([
        fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: form,
        }),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("openai-align-timeout")), 60000),
        ),
      ]);
      if (!res.ok) {
        if ((res.status === 429 || res.status >= 500) && attempt < 2) {
          await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
          continue;
        }
        return null;
      }
      const json = (await res.json()) as {
        words?: { word: string; start: number; end: number }[];
      };
      if (!json.words?.length) return null;
      return json.words.map((w) => ({
        word: w.word,
        startMs: Math.round(w.start * 1000),
        endMs: Math.round(w.end * 1000),
      }));
    } catch {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      return null;
    }
  }
  return null;
}

export interface WordMeaning {
  ipa: string;
  pos: string;
  meaning_ko: string;
  example_en: string;
  example_ko: string;
}

/** 초등학생용 단어 뜻·IPA·예문(기능어 포함). gpt-4o-mini JSON. */
export async function openaiWordMeaning(
  word: string,
): Promise<WordMeaning | null> {
  const key = serverEnv.openaiApiKey;
  if (!key) return null;
  const prompt =
    `You are an English teacher for Korean elementary students. ` +
    `For the English word "${word}", reply ONLY JSON: ` +
    `{"ipa":"IPA like /ðə/","pos":"part of speech (noun/verb/adjective/adverb/preposition/article/pronoun/conjunction)",` +
    `"meaning_ko":"아주 쉬운 한국어 뜻 한 줄 (기능어면 역할을 쉽게)","example_en":"a very easy one-sentence example","example_ko":"그 예문의 한국어 번역"}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await Promise.race([
        fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.3,
          }),
        }),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("openai-meaning-timeout")), 40000),
        ),
      ]);
      if (!res.ok) {
        if ((res.status === 429 || res.status >= 500) && attempt < 2) {
          await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
          continue;
        }
        return null;
      }
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const txt = json.choices?.[0]?.message?.content;
      if (!txt) return null;
      const o = JSON.parse(txt) as Partial<WordMeaning>;
      return {
        ipa: o.ipa ?? "",
        pos: o.pos ?? "",
        meaning_ko: o.meaning_ko ?? "",
        example_en: o.example_en ?? "",
        example_ko: o.example_ko ?? "",
      };
    } catch {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      return null;
    }
  }
  return null;
}

/**
 * OpenAI TTS — 문장을 자연스러운 원어민 음성(MP3)으로 합성.
 * 정식 pay-as-you-go API라 일일 캡 없음. 시드 타임 1회 호출 → 재생은 정적(무료).
 * model: gpt-4o-mini-tts(최신·저렴) | tts-1 | tts-1-hd
 * voice: nova, shimmer, alloy, echo, fable, onyx, coral, sage, ash, ballad, verse
 */
export async function openaiTTS(
  text: string,
  voice = "nova",
  model = "gpt-4o-mini-tts",
): Promise<Buffer | null> {
  const key = serverEnv.openaiApiKey;
  if (!key) return null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await Promise.race([
        fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            voice,
            input: text,
            response_format: "mp3",
          }),
        }),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("openai-tts-timeout")), 60000),
        ),
      ]);
      if (!res.ok) {
        const body = await res.text();
        if ((res.status === 429 || res.status >= 500) && attempt < 3) {
          await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
          continue;
        }
        console.error("[openaiTTS]", res.status, body.slice(0, 200));
        return null;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      return buf.length > 0 ? buf : null;
    } catch (e) {
      const msg = (e as Error).message || "";
      if (/timeout|fetch failed|ENOTFOUND|ECONNRESET/i.test(msg) && attempt < 3) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      console.error("[openaiTTS]", msg.slice(0, 140));
      return null;
    }
  }
  return null;
}
