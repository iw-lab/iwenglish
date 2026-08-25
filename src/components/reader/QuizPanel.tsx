"use client";

import { useState } from "react";
import { Check, X, RotateCcw, ArrowRight, Trophy } from "lucide-react";
import type { QuizQuestion } from "@/types/book";
import { Button } from "@/components/ui/Button";
import { isQuizPassed, QUIZ_PASS_RATIO } from "@/lib/learning";
import { shuffle } from "@/lib/quizEngine";
import { cn } from "@/lib/utils";

/** 보기 순서까지 섞은 1회분 문제 (답 위치 암기 차단) */
interface ShuffledQ {
  q: QuizQuestion;
  options: string[];
  answerIndex: number;
}

const buildDeck = (quiz: QuizQuestion[]): ShuffledQ[] =>
  shuffle(quiz).map((q) => {
    const answer = q.options[q.answerIndex];
    const options = shuffle(q.options);
    return { q, options, answerIndex: options.indexOf(answer) };
  });

/**
 * 책을 다 읽은 뒤 이해 퀴즈 (한 문제씩, 즉시 피드백, 최종 점수).
 * 문항·보기를 매번 섞어 "답 위치 외우기"를 막고, 80% 이상이면 통과로 기록한다.
 */
export function QuizPanel({
  quiz,
  onClose,
  onResult,
  alreadyPassed = false,
}: {
  quiz: QuizQuestion[];
  onClose: () => void;
  /** 채점 완료 시 1회 호출 */
  onResult?: (passed: boolean, score: number, total: number) => void;
  alreadyPassed?: boolean;
}) {
  const [deck, setDeck] = useState<ShuffledQ[]>(() => buildDeck(quiz));
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const cur = deck[idx];
  const last = idx === deck.length - 1;

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === cur.answerIndex) setScore((s) => s + 1);
  };

  const next = () => {
    if (last) {
      const finalScore = score;
      setDone(true);
      onResult?.(isQuizPassed(finalScore, deck.length), finalScore, deck.length);
    } else {
      setIdx((i) => i + 1);
      setPicked(null);
    }
  };

  const restart = () => {
    setDeck(buildDeck(quiz)); // 다시 풀 때마다 새로 섞는다
    setIdx(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  };

  // 호출부(Reader)가 book.quiz.length > 0 을 보고 막아주지만, 컴포넌트가 자기
  // 전제를 스스로 지키게 한다 — 빈 덱이면 아래 cur.q.question_ko 에서 터진다.
  if (!cur && !done)
    return (
      <div className="mx-auto max-w-md py-8 text-center">
        <p className="font-ko text-muted-foreground">
          이 책은 아직 이해 퀴즈가 준비되지 않았어요.
        </p>
      </div>
    );

  if (done) {
    const passed = isQuizPassed(score, deck.length);
    return (
      <div className="mx-auto max-w-md space-y-5 py-8 text-center">
        <Trophy
          className={cn("mx-auto h-16 w-16", passed ? "text-warn" : "text-primary")}
        />
        <div>
          <h2 className="text-2xl font-extrabold">
            {score} / {deck.length} 정답!
          </h2>
          <p className="font-ko text-muted-foreground">
            {passed
              ? "통과! 이야기를 완벽하게 이해했네요 🌟"
              : `조금만 더! ${Math.ceil(deck.length * QUIZ_PASS_RATIO)}개 이상 맞히면 통과예요 💪`}
          </p>
          {passed && (
            <p className="mt-1 font-ko text-sm font-semibold text-good">
              이해 퀴즈 통과가 기록되었어요 ✓
            </p>
          )}
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
          이해 퀴즈 {idx + 1} / {deck.length}
          {alreadyPassed && <span className="ml-1.5 text-good">· 통과함 ✓</span>}
        </span>
        <button onClick={onClose} className="hover:text-foreground" aria-label="닫기">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{
            width: `${((idx + (picked !== null ? 1 : 0)) / deck.length) * 100}%`,
          }}
        />
      </div>

      <h2 className="font-ko text-lg font-bold">{cur.q.question_ko}</h2>

      <div className="space-y-2">
        {cur.options.map((opt, i) => {
          const isAnswer = i === cur.answerIndex;
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
            {cur.q.explain_ko}
          </p>
          <Button onClick={next} className="w-full">
            {last ? "결과 보기" : "다음 문제"} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
