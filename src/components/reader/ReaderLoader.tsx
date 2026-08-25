"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import type { Book } from "@/types/book";
import { Reader } from "./Reader";

/**
 * 책 본문(pages·타이밍·퀴즈)은 워커 번들이 아니라 정적 자산
 * /seed/<slug>/book.json 에 있으므로 런타임에 fetch 해서 Reader 에 넘긴다.
 * (워커 3MiB 한도 회피 — 콘텐츠가 워커에 인라인되지 않음)
 */
/**
 * 실패 종류를 나눈다 — 원인이 다르면 안내와 복구 수단도 달라야 한다.
 *  missing = 서버가 404/빈 본문을 확정 응답(콘텐츠가 정말 없음) → 재시도 무의미
 *  offline = 네트워크·일시 오류(끊김·5xx) → 재시도가 유일한 복구 수단
 */
type LoadError = "missing" | "offline";

export function ReaderLoader({ slug }: { slug: string }) {
  const [book, setBook] = useState<Book | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<LoadError>("offline");
  /** 재시도 버튼이 effect 를 다시 돌리게 하는 카운터 */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ac = new AbortController();
    let alive = true;
    // 여기서 setState("loading") 을 하지 않는다 — 초기값이 이미 "loading" 이고,
    // slug 가 바뀌면 상위가 key={slug} 로 재마운트한다. 재시도는 아래 retry()
    // 핸들러가 loading 으로 되돌린 뒤 attempt 를 올린다(연쇄 렌더 방지).
    fetch(`/seed/${slug}/book.json`, { signal: ac.signal })
      .then(async (r) => {
        // 4xx = 서버가 "없다"고 확정한 것. 5xx·네트워크는 일시 오류로 본다.
        if (!r.ok) throw new Error(r.status >= 400 && r.status < 500 ? "missing" : "offline");
        return (await r.json()) as Book;
      })
      .then((b) => {
        if (!alive) return;
        if (!b?.pages?.length) {
          setError("missing");
          setState("error");
          return;
        }
        setBook(b);
        setState("ready");
      })
      .catch((e: Error) => {
        if (!alive || e.name === "AbortError") return;
        setError(e.message === "missing" ? "missing" : "offline");
        setState("error");
      });

    return () => {
      alive = false;
      // 떠난 페이지의 다운로드까지 붙잡고 있지 않는다(느린 회선에서 리더를
      // 빠르게 오갈 때 요청이 쌓인다).
      ac.abort();
    };
  }, [slug, attempt]);

  const retry = useCallback(() => {
    setState("loading");
    setAttempt((n) => n + 1);
  }, []);

  if (state === "ready" && book) return <Reader book={book} />;

  if (state === "error") {
    // 예전엔 네트워크가 끊겨도 "콘텐츠가 준비되지 않았어요"라고 말했다 —
    // 원인과 다른 안내였고 재시도 수단도 없어서, 와이파이가 한 번 끊기면
    // 그 책은 영영 미완성으로 보였다(2026-08-25 교차검증 지적).
    const offline = error === "offline";
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-ko text-muted-foreground">
          {offline
            ? "낭독을 불러오지 못했어요. 인터넷 연결을 확인해 주세요."
            : "이 책은 아직 낭독 콘텐츠가 준비되지 않았어요."}
        </p>
        {offline && (
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-1.5 rounded-chip bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <RotateCw className="h-4 w-4" /> 다시 시도
          </button>
        )}
        <Link
          href={`/book/${slug}`}
          className="rounded-chip px-5 py-2.5 text-sm font-semibold text-muted-foreground underline"
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
