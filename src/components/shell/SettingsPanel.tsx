"use client";

import { useSettings, type ThemeMode } from "@/store/settings";
import { Card } from "@/components/ui/Card";
import { Sun, Moon, Monitor, Type, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "밝게", icon: Sun },
  { value: "dark", label: "어둡게", icon: Moon },
  { value: "system", label: "시스템", icon: Monitor },
];

export function SettingsPanel() {
  const {
    theme,
    setTheme,
    dyslexiaFont,
    toggleDyslexiaFont,
    fontScale,
    setFontScale,
    playbackRate,
    setPlaybackRate,
  } = useSettings();

  return (
    <div className="space-y-3">
      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-bold text-muted-foreground">테마</h2>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map((o) => {
            const Icon = o.icon;
            const active = theme === o.value;
            return (
              <button
                key={o.value}
                onClick={() => setTheme(o.value)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-chip border py-3 text-sm font-medium transition",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted",
                )}
              >
                <Icon className="h-5 w-5" />
                {o.label}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold">읽기 편한 글꼴</p>
              <p className="font-ko text-xs text-muted-foreground">
                글자가 또렷하고 자간·줄간이 넓어져요
              </p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={dyslexiaFont}
            onClick={toggleDyslexiaFont}
            className={cn(
              "relative h-7 w-12 rounded-full transition",
              dyslexiaFont ? "bg-primary" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "absolute top-1 h-5 w-5 rounded-full bg-white transition-all",
                dyslexiaFont ? "left-6" : "left-1",
              )}
            />
          </button>
        </div>
      </Card>

      <Card className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <Type className="h-5 w-5 text-primary" />
          <p className="font-semibold">글자 크기</p>
          <span className="ml-auto text-sm tabular-nums text-muted-foreground">
            {Math.round(fontScale * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0.9}
          max={1.5}
          step={0.05}
          value={fontScale}
          onChange={(e) => setFontScale(Number(e.target.value))}
          className="w-full accent-[var(--primary)]"
          aria-label="글자 크기"
        />
        <p className="reading-text rounded-md bg-muted px-3 py-2">
          The little fox looked up at the sky.
        </p>
      </Card>

      <Card className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          <p className="font-semibold">낭독 속도</p>
          <span className="ml-auto text-sm tabular-nums text-muted-foreground">
            {playbackRate.toFixed(2)}x
          </span>
        </div>
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.05}
          value={playbackRate}
          onChange={(e) => setPlaybackRate(Number(e.target.value))}
          className="w-full accent-[var(--primary)]"
          aria-label="낭독 속도"
        />
      </Card>
    </div>
  );
}
