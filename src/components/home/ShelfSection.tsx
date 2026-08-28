import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ShelfRow } from "./ShelfRow";

/**
 * 단계/레벨별 책장 섹션 — 헤더 + 가로 캐러셀.
 *
 * 예전에는 "전체 보기"가 **그 자리에서 펼치는 토글**이었다. 그러면 접혀 있어도 35권이
 * 이미 전부 실려 온 것이라 홈 페이로드가 전혀 줄지 않는다(홈 프리렌더 3.17MB의 원인).
 * 지금은 홈이 앞부분만 그리고, 전체는 선반 페이지(`/shelf/<key>`)가 맡는다.
 */
export function ShelfSection({
  emoji,
  label,
  meta,
  href,
  moreLabel,
  children,
}: {
  emoji: string;
  label: string;
  meta: string;
  /** 전체 보기 대상 선반 페이지. 없으면 버튼을 그리지 않는다(전권이 이미 보이는 선반) */
  href?: string;
  moreLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="shelf-cv space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <h3 className="text-base font-extrabold">
            {emoji} {label}
          </h3>
          <span className="truncate text-[11px] font-semibold text-muted-foreground">
            {meta}
          </span>
        </div>
        {href && (
          <Link
            href={href}
            prefetch={false}
            className="flex flex-none items-center gap-0.5 rounded-full border border-border/60 px-2.5 py-1 text-[11px] font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            {moreLabel ?? "전체 보기"}
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      <ShelfRow>{children}</ShelfRow>
    </section>
  );
}
