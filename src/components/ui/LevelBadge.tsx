import { cn } from "@/lib/utils";
import type { CefrLevel } from "@/types/book";

const map: Record<CefrLevel, { label: string; cls: string }> = {
  preA1: { label: "Pre-A1", cls: "bg-good/15 text-good" },
  A1: { label: "A1", cls: "bg-primary/15 text-primary" },
  A2: { label: "A2", cls: "bg-warn/20 text-warn" },
  B1: { label: "B1", cls: "bg-accent/15 text-accent" },
};

export function LevelBadge({
  level,
  className,
}: {
  level: CefrLevel;
  className?: string;
}) {
  const m = map[level];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold",
        m.cls,
        className,
      )}
    >
      {m.label}
    </span>
  );
}
