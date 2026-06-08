import { notFound } from "next/navigation";
import Link from "next/link";
import { getBook } from "@/lib/data/books";
import { Reader } from "@/components/reader/Reader";

export default async function ReadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = await getBook(slug);

  if (!book) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-ko text-muted-foreground">
          이 책은 아직 낭독 콘텐츠가 준비되지 않았어요.
        </p>
        <Link
          href={`/book/${slug}`}
          className="rounded-chip bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          책 정보로 돌아가기
        </Link>
      </div>
    );
  }

  if (book.pages.length === 0) notFound();
  return <Reader book={book} />;
}
