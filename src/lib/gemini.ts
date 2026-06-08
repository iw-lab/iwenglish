import { GoogleGenAI } from "@google/genai";
import { serverEnv, featureAvailability } from "@/lib/env";

const MODEL = "gemini-2.5-flash";

function client(): GoogleGenAI | null {
  if (!featureAvailability.gemini()) return null;
  return new GoogleGenAI({ apiKey: serverEnv.geminiApiKey });
}

async function generateJson<T>(prompt: string): Promise<T | null> {
  const ai = client();
  if (!ai) return null;
  try {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const text = res.text ?? "";
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** 아동친화 한글 뜻 + 쉬운 한글 예문 */
export async function geminiWordMeaning(
  word: string,
  pos: string,
  definition_en: string,
): Promise<{ meaning_ko: string; example_en: string; example_ko: string } | null> {
  return generateJson(
    `너는 초등학생 영어 교사야. 단어 "${word}" (품사: ${pos}, 영어뜻: ${definition_en})를 ` +
      `초등학생이 이해할 한국어로 설명해줘. JSON 으로만 답해: ` +
      `{"meaning_ko":"한 줄 쉬운 뜻","example_en":"쉬운 영어 예문 한 문장","example_ko":"그 예문의 한국어 번역"}`,
  );
}

/** 자연스러운 한국어 번역 */
export async function geminiTranslate(text: string): Promise<string | null> {
  const r = await generateJson<{ ko: string }>(
    `다음 영어 그림책 문장을 자연스러운 한국어로 번역해. JSON: {"ko":"번역"}\n문장: "${text}"`,
  );
  return r?.ko ?? null;
}

export interface GeneratedQuiz {
  question_ko: string;
  type: "mc" | "tf" | "order";
  options: string[];
  answerIndex: number;
  explain_ko: string;
}

/** 책 내용 기반 이해 퀴즈 5문항 */
export async function geminiQuiz(
  title: string,
  fullText: string,
): Promise<GeneratedQuiz[] | null> {
  const r = await generateJson<{ quiz: GeneratedQuiz[] }>(
    `영어 그림책 "${title}" 의 내용으로 초등학생용 한국어 이해 퀴즈 5문항을 만들어. ` +
      `객관식(mc) 위주, 정답과 해설 포함. JSON: ` +
      `{"quiz":[{"question_ko":"","type":"mc","options":["","","",""],"answerIndex":0,"explain_ko":""}]}\n` +
      `본문:\n${fullText}`,
  );
  return r?.quiz ?? null;
}

/**
 * Gemini TTS — 문장을 자연스러운 원어민 음성(PCM 16-bit mono 24kHz)으로 합성.
 * 시드 타임에 1회 호출 → mp3/wav 로 저장 → 재생은 정적(무료).
 * voice 예: Kore, Puck, Aoede, Charon, Fenrir, Leda, Orus, Zephyr ...
 */
export async function geminiTTS(
  text: string,
  voice = "Kore",
): Promise<Buffer | null> {
  const ai = client();
  if (!ai) return null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      // 콜당 30초 타임아웃 (네트워크 hang 방지)
      const res = await Promise.race([
        ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
            },
          },
        }),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("gemini-timeout")), 30000),
        ),
      ]);
      const b64 =
        res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? null;
      return b64 ? Buffer.from(b64, "base64") : null;
    } catch (e) {
      const msg = (e as Error).message || "";
      const rateLimited = /429|RESOURCE_EXHAUSTED|quota/i.test(msg);
      const serverErr = /\b(500|503)\b|INTERNAL|UNAVAILABLE|internal error|timeout/i.test(msg);
      const m =
        msg.match(/retry in ([\d.]+)s/i) ||
        msg.match(/"retryDelay":\s*"(\d+)s"/);
      const retryDelaySec = m ? parseFloat(m[1]) : null;
      // 429: 지연이 짧으면(분당 한도) 재시도, 길거나 없으면(일일 한도) 즉시 Edge 폴백
      if (rateLimited) {
        if (retryDelaySec !== null && retryDelaySec <= 12 && attempt < 3) {
          await new Promise((r) => setTimeout(r, retryDelaySec * 1000 + 1000));
          continue;
        }
        console.error("[geminiTTS] 할당량 소진(429) → 폴백");
        return null;
      }
      // 500/503/timeout: 짧은 백오프 재시도
      if (serverErr && attempt < 3) {
        await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
        continue;
      }
      console.error("[geminiTTS]", msg.slice(0, 140));
      return null;
    }
  }
  return null;
}

/**
 * Cloud Text-to-Speech (Chirp 3: HD) — Gemini의 Kore 음성을 "정식 제품"으로 합성.
 * preview 모델(하루 100회 캡)과 달리 GA라 후불 무제한. MP3 바이트 반환.
 * voice 예: en-US-Chirp3-HD-Kore, en-US-Chirp3-HD-Puck ...
 */
export async function cloudTTS(
  text: string,
  voice = "en-US-Chirp3-HD-Kore",
): Promise<Buffer | null> {
  const key = serverEnv.geminiApiKey;
  if (!key) return null;
  const languageCode = voice.split("-").slice(0, 2).join("-") || "en-US";
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await Promise.race([
        fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input: { text },
              voice: { languageCode, name: voice },
              audioConfig: { audioEncoding: "MP3" },
            }),
          },
        ),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("cloud-tts-timeout")), 30000),
        ),
      ]);
      if (!res.ok) {
        const body = await res.text();
        if (res.status === 429 && attempt < 3) {
          await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
          continue;
        }
        console.error("[cloudTTS]", res.status, body.slice(0, 160));
        return null;
      }
      const json = (await res.json()) as { audioContent?: string };
      return json.audioContent ? Buffer.from(json.audioContent, "base64") : null;
    } catch (e) {
      const msg = (e as Error).message || "";
      if (/timeout|fetch failed|ENOTFOUND|ECONNRESET/i.test(msg) && attempt < 3) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      console.error("[cloudTTS]", msg.slice(0, 140));
      return null;
    }
  }
  return null;
}

/** 신규 영어 그림책 생성 (저작권 free) */
export interface GeneratedStory {
  title: string;
  title_ko: string;
  summary_ko: string;
  pages: { text: string }[];
}
export async function geminiStory(
  prompt: string,
  level: string,
  pageCount: number,
): Promise<GeneratedStory | null> {
  return generateJson(
    `CEFR ${level} 수준의 독창적인(저작권 free) 영어 그림책을 써줘. 주제: ${prompt}. ` +
      `${pageCount}개 페이지, 페이지당 1~2문장. JSON: ` +
      `{"title":"","title_ko":"","summary_ko":"","pages":[{"text":"page sentence(s)"}]}`,
  );
}
