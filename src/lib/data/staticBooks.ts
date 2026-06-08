import type {
  Book,
  BookPage,
  BookSummary,
  CefrLevel,
  AgeBand,
  QuizQuestion,
  Sentence,
  Word,
} from "@/types/book";

/**
 * 키 없이 동작하는 정적 콘텐츠 로더.
 * data/seed/*.json (텍스트) + public/seed/{slug}/*.png (일러스트) 를 읽어
 * Supabase 미설정 시 서재/리더에 실제 책을 공급한다.
 */

export interface SeedSentence {
  text: string;
  translation_ko: string;
  /** 시드 타임 생성된 음성 파일 공개 경로 (없으면 Web Speech 폴백) */
  audio?: string;
  /** 카라오케용 단어 타임스탬프 (음성과 함께 생성) */
  wordTimings?: import("@/types/book").WordTiming[];
}
export interface SeedPage {
  sentences: SeedSentence[];
}
export interface SeedWord {
  ipa: string;
  pos: string;
  meaning_ko: string;
  example_en: string;
  example_ko: string;
  audioUrl?: string;
}
export interface SeedBook {
  slug: string;
  title: string;
  title_ko: string;
  level: CefrLevel;
  ageBand: AgeBand;
  summary_ko: string;
  stage?: number;
  collection?: string;
  pages: SeedPage[];
  words: Record<string, SeedWord>;
  quiz: Omit<QuizQuestion, "id" | "ord">[];
}

// 빌드 타임 인라인 콘텐츠(런타임 fs 불필요 = Edge 호환). prebuild 로 생성.
import { SEED_BOOKS, SHARED_DICT, ASSET_SET } from "@/data/content.generated";

function loadAll(): SeedBook[] {
  return SEED_BOOKS;
}

/** 자산이 있으면 공개 경로, 없으면 "" (그라데이션 폴백) */
function img(slug: string, file: string): string {
  const rel = `/seed/${slug}/${file}`;
  return ASSET_SET.has(rel) ? rel : "";
}

function wordCount(b: SeedBook): number {
  return b.pages.reduce(
    (sum, p) =>
      sum +
      p.sentences.reduce(
        (s, sen) => s + (sen.text.match(/[A-Za-z']+/g)?.length ?? 0),
        0,
      ),
    0,
  );
}

function toBook(b: SeedBook): Book {
  const pages: BookPage[] = b.pages.map((p, pi) => ({
    id: `${b.slug}-p${pi + 1}`,
    pageNo: pi + 1,
    spread: `p${pi + 1}`,
    imageUrl: img(b.slug, `p${pi + 1}.webp`) || img(b.slug, `p${pi + 1}.png`),
    sentences: p.sentences.map((s, si): Sentence => {
      const audioExists = s.audio && ASSET_SET.has(s.audio);
      return {
        id: `${b.slug}-p${pi + 1}-s${si + 1}`,
        ord: si,
        text: s.text,
        translation_ko: s.translation_ko,
        audioUrl: audioExists ? s.audio! : null, // 있으면 mp3, 없으면 Web Speech 폴백
        wordTimings: s.wordTimings ?? [],
      };
    }),
  }));
  return {
    id: b.slug,
    slug: b.slug,
    title: b.title,
    title_ko: b.title_ko,
    level: b.level,
    ageBand: b.ageBand,
    coverUrl: img(b.slug, "cover.webp") || img(b.slug, "cover.png"),
    summary_ko: b.summary_ko,
    wordCount: wordCount(b),
    stage: b.stage,
    collection: b.collection,
    pages,
    quiz: b.quiz.map((q, i) => ({ ...q, id: `${b.slug}-q${i + 1}`, ord: i })),
  };
}

export function getStaticBooks(): BookSummary[] {
  return loadAll().map((b) => ({
    id: b.slug,
    slug: b.slug,
    title: b.title,
    title_ko: b.title_ko,
    level: b.level,
    ageBand: b.ageBand,
    coverUrl: img(b.slug, "cover.webp") || img(b.slug, "cover.png"),
    summary_ko: b.summary_ko,
    wordCount: wordCount(b),
    stage: b.stage,
    collection: b.collection,
  }));
}

export function getStaticBook(slug: string): Book | null {
  const b = loadAll().find((x) => x.slug === slug);
  return b ? toBook(b) : null;
}

/** 전 책 공유 사전 (빌드 타임 인라인) — 기능어 포함 모든 단어 */
function loadSharedDict(): Record<string, SeedWord> {
  return SHARED_DICT;
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
  // ① 책에 손으로 넣은 핵심단어(더 정확) 우선
  for (const b of loadAll()) {
    const w = b.words?.[key];
    if (w) return toWord(w);
  }
  // ② 전 책 공유 사전(기능어 등 전체)
  const shared = loadSharedDict()[key];
  if (shared) return toWord(shared);
  return null;
}
