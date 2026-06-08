import { cn } from "@/lib/utils";
import { scoreColor } from "@/lib/utils";

const colorVar: Record<ReturnType<typeof scoreColor>, string> = {
  good: "var(--good)",
  warn: "var(--warn)",
  bad: "var(--bad)",
};

/** 발음 평가 점수 막대 (0~100) */
export function ScoreGauge({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  const color = colorVar[scoreColor(pct)];
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold tabular-nums">{Math.round(pct)}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
