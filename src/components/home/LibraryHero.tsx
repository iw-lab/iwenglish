"use client";

import {
  useProgress,
  xpForLevel,
  levelFloor,
  readerTitle,
} from "@/store/progress";
import { useHydrated } from "@/hooks/useHydrated";
import { Flame, Crown, Sparkles } from "lucide-react";

/** 서재 상단 학습 현황 히어로 — 레벨·칭호·XP·스트릭·오늘 목표·완독 */
export function LibraryHero() {
  const mounted = useHydrated();

  const xp = useProgress((s) => s.xp);
  const streak = useProgress((s) => s.streak);
  const todayWords = useProgress((s) => s.todayWords);
  const dailyGoal = useProgress((s) => s.dailyGoal);
  const completedCount = useProgress((s) => s.booksCompleted?.length ?? 0);

  if (!mounted) {
    return (
      <div className="h-[88px] animate-pulse rounded-card bg-muted" aria-hidden />
    );
  }

  const lvl = xpForLevel(xp);
  const t = readerTitle(lvl);
  const floor = levelFloor(lvl);
  const pct = Math.min(100, Math.round(((xp - floor) / 100) * 100));
  const goalPct = Math.min(100, Math.round((todayWords / Math.max(1, dailyGoal)) * 100));

  return (
    <div className="relative overflow-hidden rounded-card border border-border/60 bg-gradient-to-br from-primary/10 via-card to-accent/10 p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* 칭호 + 레벨 */}
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-card text-2xl shadow-sm">
            {t.emoji}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold">
              {t.title}{" "}
              <span className="font-bold text-primary">Lv.{lvl}</span>
            </p>
            {/* XP 진행바 */}
            <div className="mt-1 flex items-center gap-1.5">
              <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-muted-foreground">
                {xp - floor}/100 XP
              </span>
            </div>
          </div>
        </div>

        {/* 통계 칩들 */}
        <div className="ml-auto flex items-center gap-1.5 text-xs font-extrabold">
          <span className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1.5 shadow-sm">
            <Flame className="h-3.5 w-3.5 text-accent" />
            {streak}일
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1.5 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            오늘 {goalPct}%
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1.5 shadow-sm">
            <Crown className="h-3.5 w-3.5 text-warn" />
            완독 {completedCount}권
          </span>
        </div>
      </div>
    </div>
  );
}
