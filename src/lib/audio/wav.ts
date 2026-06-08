import type { WordTiming } from "@/types/book";
import { tokenizeWords } from "@/lib/utils";

/** PCM(16-bit mono) raw → WAV 버퍼 (의존성 0, 헤더 직접 작성) */
export function pcmToWav(pcm: Buffer, sampleRate = 24000): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** PCM 길이 → 재생 시간(ms) */
export function pcmDurationMs(pcm: Buffer, sampleRate = 24000): number {
  const samples = pcm.length / 2; // 16-bit
  return (samples / sampleRate) * 1000;
}

/** 영단어 음절 수 추정 (모음군 카운트 + silent-e 보정) */
function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 1;
  const groups = w.match(/[aeiouy]+/g);
  let n = groups ? groups.length : 1;
  if (n > 1 && /[^aeiouy]e$/.test(w)) n -= 1; // 끝의 묵음 e
  return Math.max(1, n);
}

/**
 * 단어 타임스탬프 추정 — 음성의 단어 단위 타임스탬프가 없을 때
 * 문장 총 길이를 **음절 가중 + 구두점 휴지**로 분배한다.
 * 함수어(is·a·the)는 짧게, 콤마/마침표 뒤는 휴지를 둬 실제 발화에 가깝게.
 * SHIFT 로 살짝 앞당겨 체감 지연을 제거한다.
 */
export function estimateWordTimings(
  text: string,
  durationMs: number,
): WordTiming[] {
  const tokens = tokenizeWords(text);
  if (tokens.length === 0) return [];

  const weights = tokens.map((t, i) => {
    let w = syllables(t.word) + 0.35; // 단어당 최소 발화시간
    const after = text.slice(
      t.charEnd,
      i + 1 < tokens.length ? tokens[i + 1].charStart : text.length,
    );
    if (/[,;:]/.test(after)) w += 0.55; // 쉼표류 휴지
    if (/[.!?]/.test(after)) w += 0.9; // 종결 휴지
    return w;
  });
  const total = weights.reduce((a, b) => a + b, 0) || 1;

  const lead = Math.min(120, durationMs * 0.05); // 시작 무음
  const span = Math.max(0, durationMs - lead);
  const SHIFT = 90; // 하이라이트를 ~90ms 앞당겨 지연 체감 제거

  let acc = lead;
  return tokens.map((t, i) => {
    const startMs = Math.max(0, Math.round(acc - SHIFT));
    acc += (weights[i] / total) * span;
    return {
      word: t.word,
      charStart: t.charStart,
      charEnd: t.charEnd,
      startMs,
      endMs: Math.max(0, Math.round(acc - SHIFT)),
    };
  });
}
