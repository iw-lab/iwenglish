import { getStaticBooks, getStaticBook } from "@/lib/data/staticBooks";
import type { Book, BookSummary } from "@/types/book";

/** 서재 목록 (정적 시드 콘텐츠) */
export async function getBooks(): Promise<BookSummary[]> {
  return getStaticBooks();
}

/** 책 1권 전체(페이지·문장·타이밍·퀴즈 포함) — 정적 시드 */
export async function getBook(slug: string): Promise<Book | null> {
  return getStaticBook(slug);
}
