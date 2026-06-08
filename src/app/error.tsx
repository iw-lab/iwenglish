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

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-6xl">🌧️</p>
      <h1 className="text-2xl font-extrabold">잠시 문제가 생겼어요</h1>
      <p className="font-ko text-muted-foreground">
        다시 시도하면 대부분 해결돼요.
      </p>
      <button
        onClick={reset}
        className="rounded-chip bg-primary px-6 py-3 font-semibold text-primary-foreground"
      >
        다시 시도
      </button>
    </div>
  );
}
