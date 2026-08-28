import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getBooks } from "@/lib/data/books";
import { BookCard } from "@/components/book/BookCard";
import { SHELVES, getShelf, shelfBooks, MYTH_VOLUME_LABEL } from "@/lib/data/shelves";

/**
 * 선반 전체 보기 — 홈에서 넘겨받은 한 선반의 책을 전부 보여준다.
 * 선반마다 따로 프리렌더되므로 홈에는 앞부분만 실리고, 여기 오는 사람만 나머지를 받는다.
 */
export function generateStaticParams() {
  return SHELVES.map((s) => ({ key: s.key }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  const shelf = getShelf(key);
  return { title: shelf ? `${shelf.label} · EchoTale` : "EchoTale" };
}

export default async function ShelfPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const shelf = getShelf(key);
  if (!shelf) notFound();

  const books = shelfBooks(shelf, await getBooks());

  return (
    <div className="space-y-5">
      <Link
        href="/"
        prefetch={false}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> 서재로
      </Link>

      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {shelf.emoji} {shelf.label}
        </h1>
        <p className="font-ko text-sm text-muted-foreground">
          {shelf.grade} · {books.length}권
        </p>
      </div>

      {books.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {books.map((b) => (
            <BookCard
              key={b.id}
              slug={b.slug}
              title={b.title}
              title_ko={b.title_ko}
              level={b.level}
              summary_ko={b.summary_ko}
              coverUrl={b.coverUrl}
              meta={
                shelf.group === "myth" && b.stage && MYTH_VOLUME_LABEL[b.stage]
                  ? `${b.stage}권 · ${b.wordCount} words`
                  : `${b.wordCount} words`
              }
              shelf
            />
          ))}
        </div>
      ) : (
        <p className="font-ko text-sm text-muted-foreground">
          아직 준비된 책이 없어요.
        </p>
      )}
    </div>
  );
}
