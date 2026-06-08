import clsx, { type ClassValue } from "clsx";

/** Tailwind-friendly className 병합 헬퍼 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/** ms → "1:23" 형태 */
export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** 점수(0~100) → 색상 토큰 키 */
export function scoreColor(score: number): "good" | "warn" | "bad" {
  if (score >= 80) return "good";
  if (score >= 60) return "warn";
  return "bad";
}

/** 문장을 단어 토큰으로 분해하며 charStart/charEnd 를 보존 */
export function tokenizeWords(
  text: string,
): { word: string; charStart: number; charEnd: number }[] {
  const tokens: { word: string; charStart: number; charEnd: number }[] = [];
  const re = /[A-Za-z0-9']+(?:[-'][A-Za-z0-9']+)*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    tokens.push({
      word: m[0],
      charStart: m.index,
      charEnd: m.index + m[0].length,
    });
  }
  return tokens;
}

/** 단어 정규화(사전 캐시 키): 소문자 + 양끝 구두점 제거 */
export function normalizeWord(w: string): string {
  return w.toLowerCase().replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "");
}

/** 단어 발음 mp3 파일명 베이스(공용 _words 폴더). normalizeWord 후 영숫자 외 → _ */
export function wordAudioBase(w: string): string {
  return normalizeWord(w).replace(/[^a-z0-9]+/gi, "_");
}
