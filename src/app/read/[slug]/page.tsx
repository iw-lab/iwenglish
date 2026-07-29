import { getStaticBooks } from "@/lib/data/staticBooks";
import { ReaderLoader } from "@/components/reader/ReaderLoader";

// 모든 책을 빌드 타임에 정적 생성 → 읽기 페이지 0 Functions
export function generateStaticParams() {
  return getStaticBooks().map((b) => ({ slug: b.slug }));
}

export default async function ReadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // 본문(pages·타이밍·퀴즈)은 /seed/<slug>/book.json 에서 런타임 fetch — 워커 번들 경량화
  // key={slug}: 책이 바뀌면 로더를 재마운트해 이전 책 상태가 남지 않게 한다
  // (이게 없으면 로더가 effect 안에서 상태를 되돌려야 해 연쇄 렌더가 발생)
  return <ReaderLoader key={slug} slug={slug} />;
}
