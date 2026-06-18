import { NextResponse, type NextRequest } from "next/server";

/**
 * HTML 페이지 문서만 "항상 재검증"으로 강제해 배포 후 흰 화면(옛 HTML이 없어진 청크 참조)을 막는다.
 * - 해시 정적 자산(/_next/static)·이미지(/_next/image)는 matcher에서 제외 → 미들웨어 자체가 안 돌아 원래 immutable 캐시 보존.
 * - .json/.mp3/.png/.ico 등 확장자 자산·/api 는 JS로 한 번 더 걸러 장기 캐시 유지(이중 안전).
 * - 페이지 라우트(확장자 없는 경로)만 Cache-Control: max-age=0, must-revalidate.
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  const isAsset =
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.includes("."); // 확장자 있는 정적 자산(.json .mp3 .png .ico .js ...)

  if (!isAsset) {
    res.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  }
  return res;
}

export const config = {
  // 해시 자산·이미지 최적화 경로는 미들웨어를 건너뛴다(오버헤드 0, 원래 캐시 보존).
  matcher: ["/((?!_next/static|_next/image).*)"],
};
