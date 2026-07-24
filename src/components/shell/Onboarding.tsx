"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { useProgress } from "@/store/progress";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    emoji: "📚",
    title: "원어민이 읽어주는 그림책",
    body: "읽어주는 목소리를 따라 단어가 하나씩 반짝여요. 모르는 단어를 톡 누르면 뜻과 발음이 바로 나와요.",
  },
  {
    emoji: "🗣️",
    title: "진짜 쉐도잉",
    body: "원어민이 말하는 중에 한 박자 뒤에서 겹쳐 말해요. 주황 글씨가 '내 차례'예요. 익숙해지면 5단계까지 사다리를 올라가요.",
  },
  {
    emoji: "✅",
    title: "들은 만큼만 도장",
    body: "문장을 끝까지 들어야 완독 도장을 찍을 수 있어요. 마지막 10번째 도장은 이해 퀴즈까지 통과해야 왕관을 받아요.",
  },
];

/** 첫 실행 안내 — 세 장으로 앱의 약속(무엇을 어떻게 배우는지)을 먼저 말해준다 */
export function Onboarding() {
  const [mounted, setMounted] = useState(false);
  const [i, setI] = useState(0);
  const onboarded = useProgress((s) => s.onboarded);
  const setOnboarded = useProgress((s) => s.setOnboarded);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted || onboarded) return null;

  const last = i === SLIDES.length - 1;
  const s = SLIDES[i];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm space-y-5 rounded-card bg-card p-6 text-center shadow-2xl">
        <span className="block text-6xl">{s.emoji}</span>
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold">{s.title}</h2>
          <p className="font-ko text-sm leading-relaxed text-muted-foreground">
            {s.body}
          </p>
        </div>

        <div className="flex justify-center gap-1.5">
          {SLIDES.map((_, n) => (
            <span
              key={n}
              className={cn(
                "h-2 rounded-full transition-all",
                n === i ? "w-6 bg-primary" : "w-2 bg-muted",
              )}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setOnboarded(true)}
            className="rounded-chip px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted"
          >
            건너뛰기
          </button>
          <button
            onClick={() => (last ? setOnboarded(true) : setI((n) => n + 1))}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-chip bg-primary py-3 font-bold text-primary-foreground transition active:scale-[0.99]"
          >
            {last ? (
              <>
                <Check className="h-5 w-5" /> 시작하기
              </>
            ) : (
              <>
                다음 <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
