import { createServerSupabase } from "@/lib/supabase/server";
import { getStaticBooks, getStaticBook } from "@/lib/data/staticBooks";
import type {
  Book,
  BookPage,
  BookSummary,
  CefrLevel,
  AgeBand,
  QuizQuestion,
  Sentence,
  WordTiming,
} from "@/types/book";

/** 서재 목록 (published 책) */
export async function getBooks(): Promise<BookSummary[]> {
  const supabase = await createServerSupabase();
  if (!supabase) return getStaticBooks();
  const { data } = await supabase
    .from("books")
    .select("id,slug,title,title_ko,level,age_band,cover_url,summary_ko,word_count")
    .eq("published", true)
    .order("created_at", { ascending: true });
  if (!data || data.length === 0) return getStaticBooks();
  return data.map((b) => ({
    id: b.id,
    slug: b.slug,
    title: b.title,
    title_ko: b.title_ko ?? "",
    level: b.level as CefrLevel,
    ageBand: (b.age_band ?? "8-10") as AgeBand,
    coverUrl: b.cover_url ?? "",
    summary_ko: b.summary_ko ?? "",
    wordCount: b.word_count ?? 0,
  }));
}

/** 책 1권 전체(페이지·문장·타이밍·퀴즈 포함) */
export async function getBook(slug: string): Promise<Book | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return getStaticBook(slug);

  const { data: book } = await supabase
    .from("books")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  if (!book) return getStaticBook(slug);

  const { data: pages } = await supabase
    .from("pages")
    .select("id,page_no,spread,image_url,sentences(id,ord,text,translation_ko,audio_url,word_timings)")
    .eq("book_id", book.id)
    .order("page_no", { ascending: true });

  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("*")
    .eq("book_id", book.id)
    .order("ord", { ascending: true });

  const mappedPages: BookPage[] = (pages ?? []).map((p) => ({
    id: p.id,
    pageNo: p.page_no,
    spread: p.spread ?? "",
    imageUrl: p.image_url ?? "",
    sentences: (p.sentences ?? [])
      .slice()
      .sort((a, b) => a.ord - b.ord)
      .map(
        (s): Sentence => ({
          id: s.id,
          ord: s.ord,
          text: s.text,
          translation_ko: s.translation_ko ?? "",
          audioUrl: s.audio_url,
          wordTimings: (s.word_timings as WordTiming[]) ?? [],
        }),
      ),
  }));

  const mappedQuiz: QuizQuestion[] = (quizzes ?? []).map((q) => ({
    id: q.id,
    ord: q.ord ?? 0,
    question_ko: q.question_ko ?? "",
    type: (q.qtype ?? "mc") as QuizQuestion["type"],
    options: (q.options as string[]) ?? [],
    answerIndex: q.answer_index ?? 0,
    explain_ko: q.explain_ko ?? "",
  }));

  return {
    id: book.id,
    slug: book.slug,
    title: book.title,
    title_ko: book.title_ko ?? "",
    level: book.level as CefrLevel,
    ageBand: (book.age_band ?? "8-10") as AgeBand,
    coverUrl: book.cover_url ?? "",
    summary_ko: book.summary_ko ?? "",
    wordCount: book.word_count ?? 0,
    pages: mappedPages,
    quiz: mappedQuiz,
  };
}
