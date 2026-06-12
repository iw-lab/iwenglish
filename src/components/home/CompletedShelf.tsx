"use client";

import { useProgress, READS_TO_COMPLETE } from "@/store/progress";
import { useHydrated } from "@/hooks/useHydrated";
import { BookCard } from "@/components/book/BookCard";
import type { CefrLevel } from "@/types/book";

export interface ShelfBook {
  slug: string;
  title: string;
  title_ko: string;
  level: CefrLevel;
  summary_ko: string;
  coverUrl?: string;
}

/** 도장 10개를 모두 모은(완독) 책 전시 책장 + 도전 중인 책 */
export function CompletedShelf({ books }: { books: ShelfBook[] }) {
  const mounted = useHydrated();
  const bookReads = useProgress((s) => s.bookReads);
  const booksCompleted = useProgress((s) => s.booksCompleted);

  if (!mounted) return null;

  const bySlug = new Map(books.map((b) => [b.slug, b]));
  const completed = (booksCompleted ?? [])
    .map((slug) => bySlug.get(slug))
    .filter(Boolean) as ShelfBook[];
  const inProgress = Object.entries(bookReads ?? {})
    .filter(([slug, n]) => n > 0 && !(booksCompleted ?? []).includes(slug) && bySlug.has(slug))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([slug, n]) => ({ book: bySlug.get(slug)!, reads: n }));

  if (completed.length === 0 && inProgress.length === 0) return null;

  return (
    <div className="space-y-4">
      {completed.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-extrabold">👑 완독 책장</h2>
            <span className="text-xs font-semibold text-muted-foreground">
              도장 {READS_TO_COMPLETE}개를 모두 모은 책 · {completed.length}권
            </span>
          </div>
          <div className="shelf-row">
            {completed.map((b) => (
              <BookCard
                key={b.slug}
                slug={b.slug}
                title={b.title}
                title_ko={b.title_ko}
                level={b.level}
                summary_ko={b.summary_ko}
                coverUrl={b.coverUrl}
                shelf
              />
            ))}
          </div>
        </section>
      )}

      {inProgress.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-extrabold">⭐ 도장 모으는 중</h2>
            <span className="text-xs font-semibold text-muted-foreground">
              {READS_TO_COMPLETE}개를 모으면 완독 책장에 전시돼요
            </span>
          </div>
          <div className="shelf-row">
            {inProgress.map(({ book: b, reads }) => (
              <BookCard
                key={b.slug}
                slug={b.slug}
                title={b.title}
                title_ko={b.title_ko}
                level={b.level}
                summary_ko={b.summary_ko}
                coverUrl={b.coverUrl}
                meta={`⭐ ${reads}/${READS_TO_COMPLETE} 모으는 중`}
                shelf
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
