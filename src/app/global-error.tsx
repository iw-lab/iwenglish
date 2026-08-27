"use client";

import { useEffect } from "react";

/**
 * 루트 레이아웃까지 죽었을 때의 마지막 방어선.
 * 이게 없으면 이 층의 에러는 error.tsx 로도 안 잡혀 **흰 화면**이 된다.
 * 자체 <html>/<body> 를 그려야 하므로 앱 CSS 없이 인라인 스타일만 쓴다.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const wipeCachesAndReload = () => {
    // 캐시(옛 번들)만 버린다 — localStorage 의 학습 진도는 건드리지 않는다.
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
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          padding: 24,
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#fff",
          color: "#1f2937",
        }}
      >
        <div style={{ fontSize: 44 }}>🌧️</div>
        <div style={{ fontSize: 19, fontWeight: 800 }}>잠시 문제가 생겼어요</div>
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.7,
            maxWidth: "22em",
            color: "#6b7280",
          }}
        >
          다시 시도하면 대부분 해결돼요. 그래도 안 열리면 아래 &lsquo;새로
          열기&rsquo;를 눌러 주세요. <b>학습 기록은 그대로 남아요.</b>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button
            onClick={reset}
            style={{
              border: 0,
              borderRadius: 999,
              padding: "13px 24px",
              fontSize: 15,
              fontWeight: 800,
              cursor: "pointer",
              background: "#7c9885",
              color: "#fff",
            }}
          >
            다시 시도
          </button>
          <button
            onClick={wipeCachesAndReload}
            style={{
              border: "1px solid #d1d5db",
              borderRadius: 999,
              padding: "13px 24px",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              background: "transparent",
              color: "#374151",
            }}
          >
            새로 열기
          </button>
        </div>
      </body>
    </html>
  );
}
