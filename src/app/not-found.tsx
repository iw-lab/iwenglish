import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-6xl">🦊</p>
      <h1 className="text-2xl font-extrabold">페이지를 찾을 수 없어요</h1>
      <p className="font-ko text-muted-foreground">
        길을 잃은 것 같아요. 서재로 돌아가 볼까요?
      </p>
      <Link
        href="/"
        className="rounded-chip bg-primary px-6 py-3 font-semibold text-primary-foreground"
      >
        서재로 가기
      </Link>
    </div>
  );
}
