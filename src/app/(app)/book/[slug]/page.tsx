import Link from "next/link";
import { notFound } from "next/navigation";
import { getBook } from "@/lib/data/books";
import { PLANNED_BOOKS } from "@/lib/data/plannedBooks";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LevelBadge } from "@/components/ui/LevelBadge";
import { SetupNotice } from "@/components/shell/SetupNotice";
import { BookOpen, ArrowLeft } from "lucide-react";
import { getStaticBooks } from "@/lib/data/staticBooks";

// 모든 책 상세를 빌드 타임에 정적 생성 → 0 Functions
export function generateStaticParams() {
  return getStaticBooks().map((b) => ({ slug: b.slug }));
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = await getBook(slug);

  // 시드 전: 출간 예정 카탈로그로 폴백
  if (!book) {
    const planned = PLANNED_BOOKS.find((b) => b.slug === slug);
    if (!planned) notFound();
    return (
      <div className="space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 서재
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-extrabold">{planned.title}</h1>
          <LevelBadge level={planned.level} />
        </div>
        <p className="font-ko text-muted-foreground">{planned.title_ko}</p>
        <p className="font-ko">{planned.summary_ko}</p>
        <SetupNotice feature={`"${planned.title}" 낭독`} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 lg:max-w-5xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> 서재
      </Link>

      {/* 데스크톱: 표지 | 정보 2단, 모바일: 세로 스택 */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <Card className="overflow-hidden">
          <div className="relative aspect-[16/9] w-full bg-muted">
            {book.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={book.coverUrl}
                alt={`${book.title} 표지`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary/20 to-accent/20">
                <BookOpen className="h-12 w-12 text-primary/50" />
              </div>
            )}
          </div>
          <div className="space-y-2 p-4 lg:hidden">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold">{book.title}</h1>
              <LevelBadge level={book.level} />
            </div>
            <p className="font-ko text-sm text-muted-foreground">
              {book.title_ko}
            </p>
            <p className="font-ko text-sm">{book.summary_ko}</p>
            <p className="text-xs text-muted-foreground">
              {book.pages.length}쪽 · {book.wordCount} words
            </p>
          </div>
        </Card>

        {/* 우측 정보 컬럼 (모바일은 표지 카드 아래로) */}
        <div className="mt-5 space-y-4 lg:mt-0">
          <div className="hidden space-y-2 lg:block">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold">{book.title}</h1>
              <LevelBadge level={book.level} />
            </div>
            <p className="font-ko text-base text-muted-foreground">
              {book.title_ko}
            </p>
            <p className="font-ko">{book.summary_ko}</p>
            <p className="text-sm text-muted-foreground">
              {book.pages.length}쪽 · {book.wordCount} words
            </p>
          </div>

          <Button asChild size="lg" className="w-full">
            <Link href={`/read/${book.slug}`}>📖 낭독 시작</Link>
          </Button>

          {book.quiz.length > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              다 읽으면 {book.quiz.length}문항 이해 퀴즈가 기다려요.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
