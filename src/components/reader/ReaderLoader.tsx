"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Book } from "@/types/book";
import { Reader } from "./Reader";

/**
 * 책 본문(pages·타이밍·퀴즈)은 워커 번들이 아니라 정적 자산
 * /seed/<slug>/book.json 에 있으므로 런타임에 fetch 해서 Reader 에 넘긴다.
 * (워커 3MiB 한도 회피 — 콘텐츠가 워커에 인라인되지 않음)
 */
export function ReaderLoader({ slug }: { slug: string }) {
  const [book, setBook] = useState<Book | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let alive = true;
    setState("loading");
    fetch(`/seed/${slug}/book.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((b: Book) => {
        if (!alive) return;
        if (!b?.pages?.length) {
          setState("error");
          return;
        }
        setBook(b);
        setState("ready");
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (state === "ready" && book) return <Reader book={book} />;

  if (state === "error") {
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

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      <p className="font-ko text-sm text-muted-foreground">낭독을 불러오는 중…</p>
    </div>
  );
}
