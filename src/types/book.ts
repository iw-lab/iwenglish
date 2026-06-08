// 책꽃 ↔ EchoTale 브리지 정규 스키마

export type CefrLevel = "preA1" | "A1" | "A2" | "B1";
export type AgeBand = "5-7" | "8-10" | "11-13" | "adult";
export type LearningMode =
  | "read-aloud"
  | "sentence"
  | "word-tap"
  | "shadowing"
  | "read-yourself";

export interface WordTiming {
  word: string;
  startMs: number;
  endMs: number;
  charStart: number;
  charEnd: number;
}

export interface Sentence {
  id: string;
  ord: number;
  text: string;
  translation_ko: string;
  audioUrl: string | null;
  wordTimings: WordTiming[];
}

export interface BookPage {
  id: string;
  pageNo: number;
  spread: string;
  imageUrl: string;
  sentences: Sentence[];
}

export interface QuizQuestion {
  id: string;
  ord: number;
  question_ko: string;
  type: "mc" | "tf" | "order";
  options: string[];
  answerIndex: number;
  explain_ko: string;
}

export interface Book {
  id: string;
  slug: string;
  title: string;
  title_ko: string;
  level: CefrLevel;
  ageBand: AgeBand;
  coverUrl: string;
  summary_ko: string;
  wordCount: number;
  pages: BookPage[];
  quiz: QuizQuestion[];
}

/** 서재 목록용 경량 메타 */
export interface BookSummary {
  id: string;
  slug: string;
  title: string;
  title_ko: string;
  level: CefrLevel;
  ageBand: AgeBand;
  coverUrl: string;
  summary_ko: string;
  wordCount: number;
}

/** 전역 사전 캐시(단어 단위, 책 무관 공유) */
export interface Word {
  text: string;
  lemma: string;
  ipa: string;
  pos: string;
  meaning_ko: string;
  example_en: string;
  example_ko: string;
  audioUrl: string;
}
