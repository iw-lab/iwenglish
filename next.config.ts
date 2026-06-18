import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        // HTML 페이지 문서만 대상: 확장자 없는 경로(/, /read/slug, /library 등).
        // _next/* (해시 자산)·.json·.png·.mp3 등 점(.) 포함 경로는 제외 → 기존 장기 캐시 유지.
        // 배포 시 청크 해시가 바뀌므로, 브라우저/엣지가 옛 HTML을 들고 있지 않게 매번 재검증 → 흰 화면 방지.
        source: "/((?!_next/|.*\\.).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
