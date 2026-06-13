"use client";

import { useState } from "react";
import { LayoutGrid, X } from "lucide-react";
import { ShelfRow } from "./ShelfRow";

/**
 * 단계/레벨별 책장 섹션 — 헤더 + "전체 보기" 토글.
 * - 기본: 가로 캐러셀(ShelfRow, 좌우 화살표)
 * - 전체 보기: 같은 카드를 flex-wrap 그리드로 펼침(고정폭 카드라 자동 줄바꿈)
 */
export function ShelfSection({
  emoji,
  label,
  meta,
  children,
}: {
  emoji: string;
  label: string;
  meta: string;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <h3 className="text-base font-extrabold">
            {emoji} {label}
          </h3>
          <span className="truncate text-[11px] font-semibold text-muted-foreground">
            {meta}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex flex-none items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[11px] font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          {expanded ? (
            <>
              <X className="h-3 w-3" /> 접기
            </>
          ) : (
            <>
              <LayoutGrid className="h-3 w-3" /> 전체 보기
            </>
          )}
        </button>
      </div>

      {expanded ? (
        <div className="flex flex-wrap gap-3">{children}</div>
      ) : (
        <ShelfRow>{children}</ShelfRow>
      )}
    </section>
  );
}
