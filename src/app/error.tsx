"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  /** 기기에 남은 옛 번들만 버리고 새로 받는다 — 학습 진도(localStorage)는 보존 */
  const wipeCachesAndReload = () => {
    const go = () => window.location.reload();
    try {
      if (window.caches?.keys) {
        window.caches
          .keys()
          .then((ks) => Promise.all(ks.map((k) => window.caches.delete(k))))
          .then(go, go);
        return;
      }
    } catch {
      /* noop */
    }
    go();
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-6xl">🌧️</p>
      <h1 className="text-2xl font-extrabold">잠시 문제가 생겼어요</h1>
      <p className="font-ko text-muted-foreground">
        다시 시도하면 대부분 해결돼요. 그래도 안 열리면 &lsquo;새로 열기&rsquo;를
        눌러 주세요 — <strong>학습 기록은 그대로 남아요.</strong>
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          onClick={reset}
          className="rounded-chip bg-primary px-6 py-3 font-semibold text-primary-foreground"
        >
          다시 시도
        </button>
        <button
          onClick={wipeCachesAndReload}
          className="rounded-chip px-6 py-3 font-semibold ring-1 ring-border"
        >
          새로 열기
        </button>
      </div>
    </div>
  );
}
