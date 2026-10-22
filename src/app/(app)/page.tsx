import { getBooks } from "@/lib/data/books";
import { BookCard } from "@/components/book/BookCard";
import { LibraryHero } from "@/components/home/LibraryHero";
import { CompletedShelf, type ShelfBook } from "@/components/home/CompletedShelf";
import { ShelfRow } from "@/components/home/ShelfRow";
import { ShelfSection } from "@/components/home/ShelfSection";
import { PLANNED_BOOKS } from "@/lib/data/plannedBooks";
import {
  SHELVES,
  HOME_SHELF_LIMIT,
  shelfBooks,
  MYTH_VOLUME_LABEL,
  type ShelfGroup,
} from "@/lib/data/shelves";
import type { BookSummary } from "@/types/book";

/**
 * 서재(홈).
 *
 * ⚠️ 선반마다 **앞 HOME_SHELF_LIMIT 권만** 그린다. 전권을 한 번에 그리던 시절엔
 * 프리렌더 결과가 3.17MB 였고(책 1권 ≈ 8KB × Next 가 같은 데이터를 3~4벌 저장),
 * 워커가 깨어나며 그걸 읽다가 간헐적으로 50초씩 매달렸다(2026-08-28 실측).
 * 나머지는 `/shelf/<key>` 가 맡는다 — 선반 정의는 `lib/data/shelves.ts` 하나뿐이다.
 */

const GROUP_HEADS: Record<
  ShelfGroup,
  { title: string; note: (n: number) => string }
> = {
  picture: {
    title: "📕 그림책",
    note: (n) => `동물·자연·우정·모험 이야기 · ${n}권`,
  },
  daily: {
    title: "💬 생활 영어",
    note: (n) => `주인공 준이의 하루하루 · 1~6단계 · ${n}권`,
  },
  myth: {
    title: "🏛️ 그리스로마신화",
    note: (n) => `하라의 신화 모험 · 학습만화 영어판 · ${n}권`,
  },
};

function card(b: BookSummary, group: ShelfGroup) {
  const meta =
    group === "myth" && b.stage && MYTH_VOLUME_LABEL[b.stage]
      ? `${b.stage}권 · ${b.wordCount} words`
      : `${b.wordCount} words`;
  return (
    <BookCard
      key={b.id}
      slug={b.slug}
      title={b.title}
      title_ko={b.title_ko}
      level={b.level}
      summary_ko={b.summary_ko}
      coverUrl={b.coverUrl}
      meta={meta}
      shelf
    />
  );
}

export default async function LibraryPage() {
  const books = await getBooks();
  const seededSlugs = new Set(books.map((b) => b.slug));
  const upcoming = PLANNED_BOOKS.filter((b) => !seededSlugs.has(b.slug));

  // 완독 책장은 학생이 실제로 도장을 찍은 책만 필요하다 — 352권을 통째로 넘기지 않는다.
  const shelfBooksForCompleted: ShelfBook[] = books.map((b) => ({
    slug: b.slug,
    title: b.title,
    title_ko: b.title_ko,
    level: b.level,
    summary_ko: b.summary_ko,
    coverUrl: b.coverUrl,
  }));

  const groups = (["picture", "daily", "myth"] as ShelfGroup[]).map((group) => {
    const shelves = SHELVES.filter((s) => s.group === group)
      .map((s) => ({ shelf: s, books: shelfBooks(s, books) }))
      .filter((x) => x.books.length > 0);
    const total = shelves.reduce((a, x) => a + x.books.length, 0);
    return { group, shelves, total };
  });

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
      <CompletedShelf books={shelfBooksForCompleted} />

      {groups.map(({ group, shelves, total }) => {
        if (shelves.length === 0) return null;
        const head = GROUP_HEADS[group];
        return (
          <section key={group} className="space-y-4">
            <div className="flex items-baseline gap-2">
              <h2 className="text-xl font-extrabold">{head.title}</h2>
              <span className="text-xs font-semibold text-muted-foreground">
                {head.note(total)}
              </span>
            </div>
            {shelves.map(({ shelf, books: inShelf }) => {
              const more = inShelf.length > HOME_SHELF_LIMIT;
              return (
                <ShelfSection
                  key={shelf.key}
                  emoji={shelf.emoji}
                  label={shelf.label}
                  meta={`${shelf.grade} · ${inShelf.length}권`}
                  href={more ? `/shelf/${shelf.key}` : undefined}
                  moreLabel={more ? `${inShelf.length}권 전체` : undefined}
                >
                  {inShelf.slice(0, HOME_SHELF_LIMIT).map((b) => card(b, group))}
                </ShelfSection>
              );
            })}
          </section>
        );
      })}

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

      <div className="flex justify-center pt-2">
        <a
          href="https://ssamzip.com"
          target="_blank"
          rel="noopener"
          data-gb="site-link"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-muted px-4 text-xs font-semibold text-muted-foreground"
        >
          선행쌤 · 선생님이 만든 다른 수업 놀이 보기
        </a>
      </div>
    </div>
  );
}
