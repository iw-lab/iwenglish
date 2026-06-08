import { getBooks } from "@/lib/data/books";
import { BookCard } from "@/components/book/BookCard";
import { SetupNotice } from "@/components/shell/SetupNotice";
import { PLANNED_BOOKS } from "@/lib/data/plannedBooks";
import { featureAvailability } from "@/lib/env";

export default async function LibraryPage() {
  const books = await getBooks();
  const seededSlugs = new Set(books.map((b) => b.slug));
  const upcoming = PLANNED_BOOKS.filter((b) => !seededSlugs.has(b.slug));

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-extrabold tracking-tight">서재</h1>
        <p className="font-ko text-sm text-muted-foreground">
          Read it. Hear it. Echo it. Speak it.
        </p>
      </section>

      {books.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-muted-foreground">
            지금 읽을 수 있어요 · {books.length}권
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {books.map((b) => (
              <BookCard
                key={b.id}
                slug={b.slug}
                title={b.title}
                title_ko={b.title_ko}
                level={b.level}
                summary_ko={b.summary_ko}
                coverUrl={b.coverUrl}
                meta={`${b.wordCount} words`}
              />
            ))}
          </div>
        </section>
      ) : (
        !featureAvailability.supabase() && <SetupNotice feature="서재" />
      )}

      {upcoming.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-muted-foreground">
            출간 예정 · {upcoming.length}권
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {upcoming.map((b) => (
              <BookCard
                key={b.slug}
                slug={b.slug}
                title={b.title}
                title_ko={b.title_ko}
                level={b.level}
                summary_ko={b.summary_ko}
                meta={`${b.sentences} 문장 · ${b.ageBand}세`}
                comingSoon
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
