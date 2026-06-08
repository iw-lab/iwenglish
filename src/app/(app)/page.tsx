import { getBooks } from "@/lib/data/books";
import { BookCard } from "@/components/book/BookCard";
import { SetupNotice } from "@/components/shell/SetupNotice";
import { PLANNED_BOOKS } from "@/lib/data/plannedBooks";
import { featureAvailability } from "@/lib/env";
import type { CefrLevel } from "@/types/book";

// 단계별 섹션 — 한국 초등 영어(3학년 시작) 기준 라벨
const LEVELS: { level: CefrLevel; emoji: string; label: string; grade: string }[] =
  [
    { level: "preA1", emoji: "🌱", label: "입문", grade: "3학년 시작 · 첫 영어" },
    { level: "A1", emoji: "📗", label: "기초", grade: "3–4학년" },
    { level: "A2", emoji: "📘", label: "발전", grade: "5학년" },
    { level: "B1", emoji: "📙", label: "심화", grade: "6학년" },
  ];

export default async function LibraryPage() {
  const books = await getBooks();
  const seededSlugs = new Set(books.map((b) => b.slug));
  const upcoming = PLANNED_BOOKS.filter((b) => !seededSlugs.has(b.slug));

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-extrabold tracking-tight">서재</h1>
        <p className="font-ko text-sm text-muted-foreground">
          단계별 그림책으로 — Read it. Hear it. Echo it. Speak it.
        </p>
      </section>

      {books.length > 0 ? (
        LEVELS.map(({ level, emoji, label, grade }) => {
          const inLevel = books.filter((b) => b.level === level);
          if (inLevel.length === 0) return null;
          return (
            <section key={level} className="space-y-2.5">
              <div className="flex items-baseline gap-2">
                <h2 className="text-lg font-extrabold">
                  {emoji} {label}
                </h2>
                <span className="text-xs font-semibold text-muted-foreground">
                  {grade} · {level} · {inLevel.length}권
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {inLevel.map((b) => (
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
          );
        })
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
