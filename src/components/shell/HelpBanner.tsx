"use client";

import { useProgress } from "@/store/progress";
import { Card } from "@/components/ui/Card";
import { Sparkles } from "lucide-react";

/** 더보기 화면의 «사용법 다시 보기» — Onboarding(3장 안내)을 다시 띄운다. */
export function HelpBanner() {
  const setOnboarded = useProgress((s) => s.setOnboarded);
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-accent/15 text-accent">
        <Sparkles className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">EchoTale 사용법</p>
        <p className="font-ko text-xs text-muted-foreground">
          쉐도잉·도장·왕관이 처음엔 낯설 수 있어요. 세 장 안내를 다시 볼 수 있어요.
        </p>
      </div>
      <button
        onClick={() => setOnboarded(false)}
        className="shrink-0 rounded-chip border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
      >
        다시 보기
      </button>
    </Card>
  );
}
