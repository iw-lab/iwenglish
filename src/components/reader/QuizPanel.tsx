"use client";

import { useState } from "react";
import { Check, X, RotateCcw, ArrowRight, Trophy } from "lucide-react";
import type { QuizQuestion } from "@/types/book";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/** 책을 다 읽은 뒤 이해 퀴즈 (한 문제씩, 즉시 피드백, 최종 점수) */
export function QuizPanel({
  quiz,
  onClose,
}: {
  quiz: QuizQuestion[];
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = quiz[idx];
  const last = idx === quiz.length - 1;

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answerIndex) setScore((s) => s + 1);
  };

  const next = () => {
    if (last) {
      setDone(true);
    } else {
      setIdx((i) => i + 1);
      setPicked(null);
    }
  };

  const restart = () => {
    setIdx(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  };

  if (done) {
    const pct = Math.round((score / quiz.length) * 100);
    const great = pct >= 80;
    return (
      <div className="mx-auto max-w-md space-y-5 py-8 text-center">
        <Trophy
          className={cn(
            "mx-auto h-16 w-16",
            great ? "text-warn" : "text-primary",
          )}
        />
        <div>
          <h2 className="text-2xl font-extrabold">
            {score} / {quiz.length} 정답!
          </h2>
          <p className="font-ko text-muted-foreground">
            {great
              ? "정말 잘했어요! 이야기를 완벽하게 이해했네요 🌟"
              : "좋아요! 다시 읽어보면 더 잘할 수 있어요 💪"}
          </p>
        </div>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={restart}>
            <RotateCcw className="h-4 w-4" /> 다시 풀기
          </Button>
          <Button onClick={onClose}>책으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-5 py-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="font-semibold">
          이해 퀴즈 {idx + 1} / {quiz.length}
        </span>
        <button onClick={onClose} className="hover:text-foreground" aria-label="닫기">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${((idx + (picked !== null ? 1 : 0)) / quiz.length) * 100}%` }}
        />
      </div>

      <h2 className="font-ko text-lg font-bold">{q.question_ko}</h2>

      <div className="space-y-2">
        {q.options.map((opt, i) => {
          const isAnswer = i === q.answerIndex;
          const isPicked = i === picked;
          const reveal = picked !== null;
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={reveal}
              className={cn(
                "flex w-full items-center justify-between rounded-chip border px-4 py-3 text-left font-ko transition",
                !reveal && "border-border hover:bg-muted",
                reveal && isAnswer && "border-good bg-good/15 text-good",
                reveal && isPicked && !isAnswer && "border-bad bg-bad/15 text-bad",
                reveal && !isAnswer && !isPicked && "border-border opacity-60",
              )}
            >
              <span>{opt}</span>
              {reveal && isAnswer && <Check className="h-5 w-5" />}
              {reveal && isPicked && !isAnswer && <X className="h-5 w-5" />}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div className="space-y-3">
          <p className="rounded-card bg-muted px-4 py-3 font-ko text-sm">
            {q.explain_ko}
          </p>
          <Button onClick={next} className="w-full">
            {last ? "결과 보기" : "다음 문제"} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
