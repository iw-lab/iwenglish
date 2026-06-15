import type {
  Book,
  BookSummary,
  CefrLevel,
  AgeBand,
  Word,
} from "@/types/book";

/**
 * 키 없이 동작하는 정적 콘텐츠 로더.
 * 메타데이터만 인라인(content.generated.ts). 책 본문(pages 등)은
 * public/seed/<slug>/book.json 정적 자산으로 분리 → 리더가 런타임 fetch(ReaderLoader).
 */

export interface SeedWord {
  ipa: string;
  pos: string;
  meaning_ko: string;
  example_en: string;
  example_ko: string;
  audioUrl?: string;
}

/** 워커 인라인 메타 (본문 제외) */
export interface BookMeta {
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
  pageCount: number;
  quizCount: number;
  words: Record<string, SeedWord>;
}

import { SEED_BOOKS_META, SHARED_DICT } from "@/data/content.generated";

function loadMeta(): BookMeta[] {
  return SEED_BOOKS_META;
}

function toSummary(b: BookMeta): BookSummary {
  return {
    id: b.slug,
    slug: b.slug,
    title: b.title,
    title_ko: b.title_ko,
    level: b.level,
    ageBand: b.ageBand,
    coverUrl: b.coverUrl,
    summary_ko: b.summary_ko,
    wordCount: b.wordCount,
    stage: b.stage,
    collection: b.collection,
    pageCount: b.pageCount,
    quizCount: b.quizCount,
  };
}

export function getStaticBooks(): BookSummary[] {
  return loadMeta().map(toSummary);
}

/** 책 1권 메타 (서재 상세용 — 본문은 book.json) */
export function getStaticBookMeta(slug: string): BookSummary | null {
  const b = loadMeta().find((x) => x.slug === slug);
  return b ? toSummary(b) : null;
}

/**
 * 본문 포함 Book — 본문은 이제 인라인이 아니라 book.json 에 있으므로
 * 정적 경로에서는 메타+빈 본문만 반환(리더는 ReaderLoader 가 fetch).
 * Supabase 경로(books.ts)와의 타입 호환을 위해 유지.
 */
export function getStaticBook(slug: string): Book | null {
  const b = loadMeta().find((x) => x.slug === slug);
  if (!b) return null;
  return {
    id: b.slug,
    slug: b.slug,
    title: b.title,
    title_ko: b.title_ko,
    level: b.level,
    ageBand: b.ageBand,
    coverUrl: b.coverUrl,
    summary_ko: b.summary_ko,
    wordCount: b.wordCount,
    stage: b.stage,
    collection: b.collection,
    pages: [],
    quiz: [],
  };
}

/** 단어의 로컬 발음 mp3 경로 (없으면 "") — /api/word 에서 사용 */
export function localWordAudio(key: string): string {
  return SHARED_DICT[key]?.audioUrl ?? "";
}

/** 정적 사전 조회 (/api/word 폴백) — ①책별 수기 뜻 우선 ②전 책 공유 사전 */
export function getStaticWord(key: string): Word | null {
  const toWord = (w: SeedWord): Word => ({
    text: key,
    lemma: key,
    ipa: w.ipa,
    pos: w.pos,
    meaning_ko: w.meaning_ko,
    example_en: w.example_en,
    example_ko: w.example_ko,
    audioUrl: w.audioUrl ?? "",
  });
  for (const b of loadMeta()) {
    const w = b.words?.[key];
    if (w) return toWord(w);
  }
  const shared = SHARED_DICT[key];
  if (shared) return toWord(shared);
  return null;
}
