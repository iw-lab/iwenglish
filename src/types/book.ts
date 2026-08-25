// 책꽃 ↔ EchoTale 브리지 정규 스키마

export type CefrLevel = "preA1" | "A1" | "A2" | "B1";
/** 연령대 — data/seed/*.json 의 실제 값과 반드시 일치해야 한다.
 *  값을 늘리면 scripts/build-content.ts 의 AGE_BANDS 도 같이 고칠 것
 *  (거기서 검증하므로 어긋나면 빌드가 멈춘다).
 *  ⚠️ 2026-08-25: 타입은 4종인데 시드는 9-11(54권)·10-12(52권)을 쓰고 있었다 —
 *  106권(30%)이 유니온 밖이었고, 생성기가 ageBand:string 으로 받아 tsc 가 못 봤다. */
export type AgeBand = "5-7" | "8-10" | "9-11" | "10-12" | "11-13";
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
  /** 단계별 시리즈용 1~6 (없으면 일반 그림책) */
  stage?: number;
  /** 컬렉션/섹션 키 (예: "daily" 생활영어) */
  collection?: string;
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
  stage?: number;
  collection?: string;
  /** 메타에서 바로 노출 (full content는 /seed/<slug>/book.json 런타임 fetch) */
  pageCount?: number;
  quizCount?: number;
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
