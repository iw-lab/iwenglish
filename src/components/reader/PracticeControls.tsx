"use client";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { Ban, AudioLines, Repeat2 } from "lucide-react";

export type PracticeMode = "off" | "shadow" | "repeat";

const OPTIONS: {
  id: PracticeMode;
  label: string;
  icon: typeof Ban;
  hint: string;
}[] = [
  { id: "off", label: "끄기", icon: Ban, hint: "그냥 들으며 읽어요." },
  {
    id: "shadow",
    label: "쉐도잉",
    icon: AudioLines,
    hint: "한 번 듣고, 곧바로 다시 들려줄 때 원어민과 겹쳐서 같이 따라 말해요.",
  },
  {
    id: "repeat",
    label: "따라 읽기",
    icon: Repeat2,
    hint: "한 번 듣고, 그만큼 조용히 멈춘 동안 혼자 또박또박 따라 말해요.",
  },
];

/**
 * 따라 말하기·쉐도잉 = 녹음 없이, 한 문장 들려준 뒤 "따라 말할 시간"(멈춤 간격)을 주는 모드.
 * 쉐도잉=짧은 간격, 따라 읽기=문장 길이만큼.
 */
export function PracticeControls({
  mode,
  setMode,
  gapScale,
  setGapScale,
}: {
  mode: PracticeMode;
  setMode: (m: PracticeMode) => void;
  gapScale: number;
  setGapScale: (n: number) => void;
}) {
  const active = OPTIONS.find((o) => o.id === mode)!;
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">연습 모드 (따라 말하기)</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((o) => {
          const Icon = o.icon;
          const on = mode === o.id;
          return (
            <button
              key={o.id}
              onClick={() => setMode(o.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-chip border py-2.5 text-sm font-semibold transition",
                on
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border hover:bg-muted",
              )}
            >
              <Icon className="h-5 w-5" />
              {o.label}
            </button>
          );
        })}
      </div>

      <p className="font-ko text-xs text-muted-foreground">{active.hint}</p>

      {mode === "repeat" && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">따라 말할 시간(멈춤)</span>
            <span className="tabular-nums">{gapScale.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={gapScale}
            onChange={(e) => setGapScale(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
            aria-label="따라 말할 시간"
          />
        </div>
      )}
    </Card>
  );
}
