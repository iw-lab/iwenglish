"use client";

import { useProgress, READS_TO_COMPLETE } from "@/store/progress";
import { useHydrated } from "@/hooks/useHydrated";
import { cn } from "@/lib/utils";

/** 서재 카드 우하단 도장 진행/완독 배지 (로컬 진행도 기반) */
export function StampBadge({ slug, className }: { slug: string; className?: string }) {
  // persist 하이드레이션 전 SSR 불일치 방지
  const mounted = useHydrated();
  const reads = useProgress((s) => s.bookReads?.[slug] ?? 0);
  const completed = useProgress((s) => s.booksCompleted?.includes(slug) ?? false);

  if (!mounted || (!completed && reads === 0)) return null;

  return (
    <span
      className={cn(
        "absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold shadow-sm backdrop-blur-sm",
        completed
          ? "bg-warn/90 text-amber-950"
          : "bg-card/90 text-foreground",
        className,
      )}
    >
      {completed ? <>👑 완독</> : <>⭐ {reads}/{READS_TO_COMPLETE}</>}
    </span>
  );
}
