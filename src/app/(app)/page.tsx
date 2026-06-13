import { getBooks } from "@/lib/data/books";
import { BookCard } from "@/components/book/BookCard";
import { SetupNotice } from "@/components/shell/SetupNotice";
import { LibraryHero } from "@/components/home/LibraryHero";
import { CompletedShelf, type ShelfBook } from "@/components/home/CompletedShelf";
import { ShelfRow } from "@/components/home/ShelfRow";
import { ShelfSection } from "@/components/home/ShelfSection";
import { PLANNED_BOOKS } from "@/lib/data/plannedBooks";
import { featureAvailability } from "@/lib/env";
import type { CefrLevel } from "@/types/book";

// 그림책(픽션) 레벨 섹션 — 한국 초등 영어(3학년 시작) 기준 라벨
const LEVELS: { level: CefrLevel; emoji: string; label: string; grade: string }[] =
  [
    { level: "preA1", emoji: "🌱", label: "입문", grade: "3학년 시작 · 첫 영어" },
    { level: "A1", emoji: "📗", label: "기초", grade: "3–4학년" },
    { level: "A2", emoji: "📘", label: "발전", grade: "5학년" },
    { level: "B1", emoji: "📙", label: "심화", grade: "6학년" },
  ];

// 생활영어 단계 라벨 (1~6단계)
const STAGES: { stage: number; emoji: string; label: string; grade: string }[] = [
  { stage: 1, emoji: "🐣", label: "1단계 · 첫걸음", grade: "3학년" },
  { stage: 2, emoji: "🌿", label: "2단계 · 익숙해지기", grade: "3–4학년" },
  { stage: 3, emoji: "🚀", label: "3단계 · 자신감", grade: "4학년" },
  { stage: 4, emoji: "⛰️", label: "4단계 · 도전", grade: "4–5학년" },
  { stage: 5, emoji: "🌊", label: "5단계 · 실력 다지기", grade: "5학년" },
  { stage: 6, emoji: "🏆", label: "6단계 · 마스터", grade: "6학년" },
];

export default async function LibraryPage() {
  const books = await getBooks();
  const seededSlugs = new Set(books.map((b) => b.slug));
  const upcoming = PLANNED_BOOKS.filter((b) => !seededSlugs.has(b.slug));

  const daily = books.filter((b) => b.collection === "daily");
  const pictureBooks = books.filter((b) => b.collection !== "daily");

  // 완독 책장용 최소 데이터 (클라이언트로 전달)
  const shelfBooks: ShelfBook[] = books.map((b) => ({
    slug: b.slug,
    title: b.title,
    title_ko: b.title_ko,
    level: b.level,
    summary_ko: b.summary_ko,
    coverUrl: b.coverUrl,
  }));

  return (
    <div className="space-y-7">
      <section className="space-y-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            서재 <span className="text-brand-gradient">EchoTale</span>
          </h1>
          <p className="font-ko text-sm text-muted-foreground">
            단계별 그림책으로 — Read it. Hear it. Echo it. Speak it.
          </p>
        </div>
        <LibraryHero />
      </section>

      {/* 👑 완독 책장 + ⭐ 도장 모으는 중 (로컬 진행도) */}
      <CompletedShelf books={shelfBooks} />

      {/* 📕 그림책 (픽션) — 레벨별 선반 */}
      {pictureBooks.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-baseline gap-2">
            <h2 className="text-xl font-extrabold">📕 그림책</h2>
            <span className="text-xs font-semibold text-muted-foreground">
              동물·자연·우정·모험 이야기 · {pictureBooks.length}권
            </span>
          </div>
          {LEVELS.map(({ level, emoji, label, grade }) => {
            const inLevel = pictureBooks.filter((b) => b.level === level);
            if (inLevel.length === 0) return null;
            return (
              <ShelfSection
                key={level}
                emoji={emoji}
                label={label}
                meta={`${grade} · ${level} · ${inLevel.length}권`}
              >
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
                    shelf
                  />
                ))}
              </ShelfSection>
            );
          })}
        </section>
      ) : (
        !featureAvailability.supabase() && <SetupNotice feature="서재" />
      )}

      {/* 💬 생활 영어 — 단계별 선반 (1~6단계) */}
      {daily.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline gap-2">
            <h2 className="text-xl font-extrabold">💬 생활 영어</h2>
            <span className="text-xs font-semibold text-muted-foreground">
              주인공 준이의 하루하루 · 1~6단계 · {daily.length}권
            </span>
          </div>
          {STAGES.map(({ stage, emoji, label, grade }) => {
            const inStage = daily.filter((b) => b.stage === stage);
            if (inStage.length === 0) return null;
            return (
              <ShelfSection
                key={stage}
                emoji={emoji}
                label={label}
                meta={`${grade} · ${inStage.length}권`}
              >
                {inStage.map((b) => (
                  <BookCard
                    key={b.id}
                    slug={b.slug}
                    title={b.title}
                    title_ko={b.title_ko}
                    level={b.level}
                    summary_ko={b.summary_ko}
                    coverUrl={b.coverUrl}
                    meta={`${b.wordCount} words`}
                    shelf
                  />
                ))}
              </ShelfSection>
            );
          })}
        </section>
      )}

      {/* 출간 예정 */}
      {upcoming.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-muted-foreground">
            출간 예정 · {upcoming.length}권
          </h2>
          <ShelfRow>
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
                shelf
              />
            ))}
          </ShelfRow>
        </section>
      )}
    </div>
  );
}
