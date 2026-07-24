"use client";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { Ban, AudioLines, Repeat2 } from "lucide-react";
import { SHADOW_STEPS, shadowStep } from "@/lib/learning";

export type PracticeMode = "off" | "shadow" | "repeat";

const OPTIONS: {
  id: PracticeMode;
  label: string;
  icon: typeof Ban;
  hint: string;
}[] = [
  { id: "off", label: "끄기", icon: Ban, hint: "그냥 들으며 읽어요." },
  {
    id: "repeat",
    label: "따라 읽기",
    icon: Repeat2,
    hint: "한 문장을 다 들은 뒤, 조용한 시간 동안 혼자 또박또박 따라 말해요.",
  },
  {
    id: "shadow",
    label: "쉐도잉",
    icon: AudioLines,
    hint: "원어민이 말하는 중에 한 박자 뒤에서 겹쳐 따라 말해요. 주황 글씨가 '내 차례'예요.",
  },
];

/**
 * 연습 모드 선택 + 쉐도잉 사다리.
 *
 * - 따라 읽기: 문장을 다 들려준 뒤 침묵 간격을 준다(기존 방식).
 * - 쉐도잉: 오디오는 한 번만 흐르고, 지연된 "내 차례" 하이라이트를 쫓아간다(진짜 쉐도잉).
 */
export function PracticeControls({
  mode,
  setMode,
  gapScale,
  setGapScale,
  step,
  setStep,
}: {
  mode: PracticeMode;
  setMode: (m: PracticeMode) => void;
  gapScale: number;
  setGapScale: (n: number) => void;
  step: number;
  setStep: (n: number) => void;
}) {
  const active = OPTIONS.find((o) => o.id === mode)!;
  const cur = shadowStep(step);

  return (
    <Card className="space-y-2.5 p-3">
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
              aria-pressed={on}
              className={cn(
                "flex flex-col items-center gap-1 rounded-chip border py-2 text-sm font-semibold transition",
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

      {mode === "shadow" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">쉐도잉 사다리</span>
            <span className="text-xs text-muted-foreground">
              {step} / {SHADOW_STEPS.length} 단계
            </span>
          </div>

          <div className="flex gap-1.5">
            {SHADOW_STEPS.map((s) => {
              const on = s.id === step;
              const done = s.id < step;
              return (
                <button
                  key={s.id}
                  onClick={() => setStep(s.id)}
                  aria-pressed={on}
                  title={`${s.name} — ${s.desc}`}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-0.5 rounded-chip border py-1.5 text-[11px] font-semibold transition",
                    on
                      ? "border-accent bg-accent text-accent-foreground"
                      : done
                        ? "border-accent/40 bg-accent/10 text-accent"
                        : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <span className="text-base leading-none">{s.emoji}</span>
                  {s.name}
                </button>
              );
            })}
          </div>

          <p className="font-ko text-xs text-muted-foreground">{cur.desc}</p>

          {step < SHADOW_STEPS.length && (
            <button
              onClick={() => setStep(step + 1)}
              className="w-full rounded-chip bg-accent/15 py-2 text-sm font-bold text-accent transition active:scale-[0.99]"
            >
              한 단계 올리기 → {shadowStep(step + 1).emoji}{" "}
              {shadowStep(step + 1).name}
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
