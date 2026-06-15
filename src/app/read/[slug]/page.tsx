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
  return <ReaderLoader slug={slug} />;
}
