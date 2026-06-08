"use client";

/**
 * Web Speech API 래퍼 (무료·오프라인 폴백 TTS/STT).
 * Azure 미리생성 오디오가 없을 때 사용.
 */

export interface SpeakHandle {
  cancel: () => void;
}

/** 영어 음성 우선 선택 */
function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  return (
    voices.find((v) => /en-US/i.test(v.lang) && /female|samantha|ava/i.test(v.name)) ||
    voices.find((v) => /en-US/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang))
  );
}

export function speak(
  text: string,
  opts: {
    rate?: number;
    lang?: string;
    onWordBoundary?: (charIndex: number) => void;
    onEnd?: () => void;
  } = {},
): SpeakHandle {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    opts.onEnd?.();
    return { cancel: () => {} };
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = opts.lang ?? "en-US";
  u.rate = opts.rate ?? 1;
  const v = pickVoice();
  if (v) u.voice = v;
  if (opts.onWordBoundary) {
    u.onboundary = (e) => {
      if (e.name === "word" || e.charIndex >= 0)
        opts.onWordBoundary!(e.charIndex);
    };
  }
  u.onend = () => opts.onEnd?.();
  window.speechSynthesis.speak(u);
  return { cancel: () => window.speechSynthesis.cancel() };
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
