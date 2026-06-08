import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { requireServerEnv } from "@/lib/env";
import type { WordTiming } from "@/types/book";

const TICKS_PER_MS = 10000; // 100ns 단위 → ms

export interface SynthResult {
  audio: Buffer;
  timings: WordTiming[];
}

/**
 * Azure Neural TTS 로 문장 mp3 합성 + 단어 타임스탬프(WordBoundary) 수집.
 * 파이프라인(시드)에서 호출 — 결과를 Storage 에 올리고 sentences 에 저장.
 */
export function synthesizeSentence(
  text: string,
  voice = "en-US-AvaNeural",
): Promise<SynthResult> {
  const key = requireServerEnv("azureSpeechKey");
  const region = requireServerEnv("azureSpeechRegion");

  const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
  speechConfig.speechSynthesisVoiceName = voice;
  speechConfig.speechSynthesisOutputFormat =
    sdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;

  const synth = new sdk.SpeechSynthesizer(speechConfig);
  const boundaries: { word: string; charStart: number; startMs: number; durMs: number }[] =
    [];

  synth.wordBoundary = (_s, e) => {
    if (e.boundaryType === sdk.SpeechSynthesisBoundaryType.Word) {
      boundaries.push({
        word: e.text,
        charStart: e.textOffset,
        startMs: e.audioOffset / TICKS_PER_MS,
        durMs: e.duration / TICKS_PER_MS,
      });
    }
  };

  return new Promise<SynthResult>((resolve, reject) => {
    synth.speakTextAsync(
      text,
      (result) => {
        synth.close();
        if (
          result.reason === sdk.ResultReason.SynthesizingAudioCompleted &&
          result.audioData
        ) {
          const timings: WordTiming[] = boundaries.map((b) => ({
            word: b.word,
            charStart: b.charStart,
            charEnd: b.charStart + b.word.length,
            startMs: Math.round(b.startMs),
            endMs: Math.round(b.startMs + b.durMs),
          }));
          resolve({ audio: Buffer.from(result.audioData), timings });
        } else {
          reject(new Error(`TTS 실패: ${result.errorDetails ?? result.reason}`));
        }
      },
      (err) => {
        synth.close();
        reject(new Error(String(err)));
      },
    );
  });
}
