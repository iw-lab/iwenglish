"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 넷플릭스식 가로 책장 선반 — 좌우 화살표 버튼으로 스크롤.
 * 서버에서 렌더한 BookCard들을 children으로 받아 감싼다.
 * - 데스크톱: 스크롤 가능한 방향에만 화살표 표시(터치 기기는 스와이프 사용 → 숨김)
 * - 클릭 시 보이는 폭의 85% 만큼 부드럽게 이동
 */
export function ShelfRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  // 떠 있는 원형 버튼만 — 배경 띠(그라디언트) 없음. 커버 이미지 세로 중앙(약 38%)에 위치.
  const arrowBase =
    "absolute top-[38%] z-20 hidden h-9 w-9 -translate-y-1/2 place-items-center " +
    "rounded-full border border-border/60 bg-card/90 text-foreground/70 shadow-md " +
    "backdrop-blur-sm transition hover:scale-110 hover:bg-card hover:text-foreground " +
    "opacity-0 group-hover/shelf:opacity-100 focus-visible:opacity-100";

  return (
    <div className="group/shelf relative">
      {/* ◀ 이전 */}
      <button
        type="button"
        aria-label="이전 책 보기"
        onClick={() => scroll(-1)}
        className={cn(
          arrowBase,
          "left-1",
          canLeft ? "md:grid" : "md:hidden",
        )}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div ref={ref} className="shelf-row -mx-4 px-4 lg:-mx-8 lg:px-8">
        {children}
      </div>

      {/* ▶ 다음 */}
      <button
        type="button"
        aria-label="다음 책 보기"
        onClick={() => scroll(1)}
        className={cn(
          arrowBase,
          "right-1",
          canRight ? "md:grid" : "md:hidden",
        )}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
