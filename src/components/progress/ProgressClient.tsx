"use client";

import { useEffect, useState } from "react";
import { Flame, Star, BookOpen, Brain, Target } from "lucide-react";
import {
  useProgress,
  ACHIEVEMENTS,
  masteredCount,
  studiedCount,
  xpForLevel,
  levelFloor,
} from "@/store/progress";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export function ProgressClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  const s = useProgress();

  if (!mounted)
    return <div className="h-40 animate-pulse rounded-card bg-muted/40" />;

  const level = xpForLevel(s.xp);
  const intoLevel = s.xp - levelFloor(level);
  const levelPct = Math.min(100, intoLevel); // 레벨당 100xp
  const studied = studiedCount(s);
  const mastered = masteredCount(s);
  const goalPct = Math.min(100, Math.round((s.todayWords / s.dailyGoal) * 100));
  const unlocked = new Set(s.achievements);

  return (
    <div className="space-y-5">
      {/* 레벨 / XP */}
      <Card className="space-y-3 p-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs font-semibold text-muted-foreground">
              레벨
            </div>
            <div className="text-3xl font-extrabold text-primary">Lv.{level}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold">{s.xp}</div>
            <div className="text-xs text-muted-foreground">총 XP</div>
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>다음 레벨까지</span>
            <span>{intoLevel}/100 XP</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
              style={{ width: `${levelPct}%` }}
            />
          </div>
        </div>
      </Card>

      {/* 통계 그리드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Flame} tone="accent" value={s.streak} label="연속 학습일" />
        <StatCard icon={Brain} tone="primary" value={mastered} label="마스터 단어" />
        <StatCard icon={Star} tone="good" value={studied} label="학습한 단어" />
        <StatCard
          icon={BookOpen}
          tone="primary"
          value={s.booksFinished.length}
          label="완독한 책"
        />
      </div>

      {/* 오늘 목표 */}
      <Card className="space-y-2 p-5">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="font-bold">오늘의 목표</h2>
          <span className="ml-auto text-sm text-muted-foreground">
            {s.todayWords}/{s.dailyGoal} 단어 · +{s.todayXp} XP
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              goalPct >= 100 ? "bg-good" : "bg-primary",
            )}
            style={{ width: `${goalPct}%` }}
          />
        </div>
        {goalPct >= 100 && (
          <p className="text-sm font-semibold text-good">
            🎉 오늘 목표 달성! 잘했어요
          </p>
        )}
      </Card>

      {/* 업적 */}
      <section>
        <h2 className="mb-2 font-bold">
          업적{" "}
          <span className="text-sm font-normal text-muted-foreground">
            {unlocked.size}/{ACHIEVEMENTS.length}
          </span>
        </h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {ACHIEVEMENTS.map((a) => {
            const on = unlocked.has(a.id);
            return (
              <Card
                key={a.id}
                className={cn(
                  "flex items-center gap-2.5 p-3 transition",
                  on ? "" : "opacity-45 grayscale",
                )}
              >
                <span className="text-2xl">{a.emoji}</span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{a.title}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {a.desc}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 최근 활동 */}
      {s.sessions.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold">최근 읽기 기록</h2>
          <Card className="divide-y divide-border">
            {s.sessions.slice(0, 8).map((sess, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {sess.title}
                </span>
                <span className="text-xs text-muted-foreground">{sess.mode}</span>
                <span className="text-xs text-muted-foreground">{sess.date}</span>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  tone,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "accent" | "primary" | "good";
  value: number;
  label: string;
}) {
  const c =
    tone === "accent"
      ? "text-accent"
      : tone === "good"
        ? "text-good"
        : "text-primary";
  return (
    <Card className="flex flex-col items-center gap-1 p-4">
      <Icon className={cn("h-6 w-6", c)} />
      <span className="text-2xl font-extrabold">{value}</span>
      <span className="text-center text-xs text-muted-foreground">{label}</span>
    </Card>
  );
}
