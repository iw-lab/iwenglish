"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X, Delete, Volume2 } from "lucide-react";
import type { WordQuestion } from "@/lib/quizEngine";
import { checkSpelling } from "@/lib/quizEngine";
import { AudioButton } from "@/components/ui/AudioButton";
import { Card } from "@/components/ui/Card";
import { playAudioUrl } from "@/lib/audio";
import { getJuice, xyOf } from "@/lib/juice";
import { cn } from "@/lib/utils";

/**
 * 단어 문제 1개 렌더 + 채점.
 * 4지선다(듣기·뜻·영작·빈칸)와 철자 조립을 한 컴포넌트에서 다룬다.
 * 정오답은 데이터로 결정되므로 "알아요" 자가신고와 달리 조작할 수 없다.
 */
export function WordQuestionView({
  question,
  audioSrc,
  onGraded,
}: {
  question: WordQuestion;
  audioSrc: string;
  /** 채점 결과 — correct: 정답 여부, elapsedMs: 문제를 본 뒤 답하기까지 걸린 시간 */
  /** noCredit=true 면 XP·퀘스트 진척 없이 박스만 갱신한다(무음 재생 등) */
  onGraded: (correct: boolean, elapsedMs: number, noCredit?: boolean) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState<string[]>([]);
  const [spellResult, setSpellResult] = useState<boolean | null>(null);
  // 듣기 문제인데 음원이 안 나온 경우 — 단어를 글자로 드러내고 채점은 XP 없이 한다.
  const [audioFailed, setAudioFailed] = useState(false);
  const shownAt = useRef<number>(0);

  // 문제가 바뀌면 입력·타이머 초기화 + 듣기 문제는 자동 재생
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setPicked(null);
    setTyped([]);
    setSpellResult(null);
    setAudioFailed(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    shownAt.current = performance.now();
    if (question.kind !== "listen") return;
    if (!audioSrc) {
      setAudioFailed(true);
      return;
    }
    const audio = playAudioUrl(audioSrc, {
      onError: () => setAudioFailed(true),
    });
    // 다음 문제로 넘어가면 이전 단어 발음을 즉시 끊는다.
    // (없으면 빠르게 답할 때 두 단어 발음이 겹쳐 들려 듣기 문제가 망가진다)
    return () => audio.pause();
  }, [question, audioSrc]);

  // 이벤트 핸들러에서의 시각 측정(응답속도 가드용) — 렌더가 아니라 사용자 액션 시점이므로
  // performance.now() 호출이 정당하다. react-hooks/purity 는 이를 구분하지 못해 끈다.
  const choose = (i: number, e?: React.MouseEvent) => {
    if (picked !== null) return;
    // eslint-disable-next-line react-hooks/purity
    const elapsed = Math.round(performance.now() - shownAt.current);
    setPicked(i);
    const correct = i === question.answerIndex;
    getJuice()?.fire(correct ? "correct" : "wrong", xyOf(e));
    // 소리가 안 난 듣기 문제의 답은 "들어서 맞힌 것"이 아니다 — 박스는 갱신하되
    // XP·퀘스트 진척은 주지 않는다(연타 가드와 같은 통로).
    onGraded(correct, elapsed, audioFailed);
  };

  const submitSpelling = (e?: React.MouseEvent) => {
    if (spellResult !== null) return;
    const elapsed = Math.round(performance.now() - shownAt.current);
    const ok = checkSpelling(question.word, typed.join(""));
    setSpellResult(ok);
    getJuice()?.fire(ok ? "correct" : "wrong", xyOf(e));
    onGraded(ok, elapsed);
  };

  const revealed = picked !== null || spellResult !== null;

  /* ── 철자 조립 ── */
  if (question.kind === "spell") {
    const answer = question.word.english.replace(/[^a-zA-Z]/g, "");
    return (
      <div className="space-y-4">
        <Card className="space-y-3 p-5 text-center">
          <span className="text-5xl">{question.word.emoji}</span>
          <p className="font-ko text-lg font-bold">{question.prompt}</p>
          <div className="flex justify-center">
            <AudioButton
              src={audioSrc}
              text={question.word.english}
              label={`${question.word.english} 발음`}
            />
          </div>

          {/* 입력 칸 */}
          <div className="flex flex-wrap justify-center gap-1.5">
            {Array.from({ length: answer.length }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "grid h-11 w-9 place-items-center rounded-chip border-2 text-xl font-extrabold",
                  spellResult === null
                    ? "border-border bg-muted/40"
                    : spellResult
                      ? "border-good bg-good/15 text-good"
                      : "border-bad bg-bad/15 text-bad",
                )}
              >
                {typed[i] ?? ""}
              </span>
            ))}
          </div>

          {spellResult === false && (
            <p className="font-ko text-sm font-semibold text-bad">
              정답: <span className="font-mono">{answer}</span>
            </p>
          )}
        </Card>

        {/* 글자 타일 */}
        <div className="flex flex-wrap justify-center gap-2">
          {question.letters?.map((ch, i) => {
            // 같은 글자가 여러 장이면 장수만큼만 쓸 수 있다
            const used = typed.filter((c) => c === ch).length;
            const avail = question.letters?.filter((c) => c === ch).length ?? 0;
            const exhausted = used >= avail;
            return (
              <button
                key={`${ch}-${i}`}
                disabled={revealed || typed.length >= answer.length || exhausted}
                onClick={() => setTyped((t) => [...t, ch])}
                className="grid h-12 w-11 place-items-center rounded-chip bg-card text-xl font-extrabold shadow-sm ring-1 ring-border transition active:scale-95 disabled:opacity-30"
              >
                {ch}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTyped((t) => t.slice(0, -1))}
            disabled={revealed || typed.length === 0}
            className="flex items-center justify-center gap-1.5 rounded-chip bg-muted px-4 py-3 font-semibold disabled:opacity-40"
          >
            <Delete className="h-5 w-5" /> 지우기
          </button>
          <button
            onClick={(e) => submitSpelling(e)}
            disabled={revealed || typed.length !== answer.length}
            className="flex-1 rounded-chip bg-primary py-3 font-bold text-primary-foreground disabled:opacity-40"
          >
            확인
          </button>
        </div>
      </div>
    );
  }

  /* ── 4지선다 ── */
  return (
    <div className="space-y-4">
      <Card className="space-y-2.5 p-5 text-center">
        {question.kind === "listen" ? (
          <>
            <button
              onClick={() =>
                audioSrc &&
                playAudioUrl(audioSrc, { onError: () => setAudioFailed(true) })
              }
              aria-label="다시 듣기"
              className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition active:scale-95"
            >
              <Volume2 className="h-10 w-10" />
            </button>
            {audioFailed ? (
              // 소리도 글자도 없이 찍게 두지 않는다 — 단어를 드러내고 이유를 밝힌다.
              <>
                <p className="text-3xl font-bold tracking-tight">
                  {question.word.english}
                </p>
                <p className="font-ko text-sm text-warn">
                  소리를 불러오지 못했어요 · 글자를 보고 골라요
                </p>
              </>
            ) : (
              <p className="font-ko text-sm text-muted-foreground">
                {question.prompt}
              </p>
            )}
          </>
        ) : (
          <>
            {question.kind !== "cloze" && (
              <span className="text-5xl">{question.word.emoji}</span>
            )}
            <p className="font-ko text-lg font-bold">{question.prompt}</p>
            {question.sentence && (
              <p className="reading-text rounded-card bg-muted px-3 py-2 text-base">
                {question.sentence}
              </p>
            )}
          </>
        )}
      </Card>

      <div className="grid gap-2">
        {question.options.map((opt, i) => {
          const isAnswer = i === question.answerIndex;
          const isPicked = i === picked;
          return (
            <button
              key={i}
              onClick={(e) => choose(i, e)}
              disabled={revealed}
              className={cn(
                "flex items-center justify-between rounded-chip border px-4 py-3.5 text-left font-ko text-lg font-semibold transition",
                !revealed && "border-border hover:bg-muted",
                revealed && isAnswer && "border-good bg-good/15 text-good",
                revealed && isPicked && !isAnswer && "border-bad bg-bad/15 text-bad",
                revealed && !isAnswer && !isPicked && "border-border opacity-50",
              )}
            >
              <span>{opt}</span>
              {revealed && isAnswer && <Check className="h-5 w-5" />}
              {revealed && isPicked && !isAnswer && <X className="h-5 w-5" />}
            </button>
          );
        })}
      </div>

      {/* 정답 공개 후 뜻·예문 노출 (틀렸을 때 바로 학습되도록) */}
      {revealed && (
        <Card className="space-y-1 p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-extrabold">
              {question.word.english}
            </span>
            <AudioButton
              src={audioSrc}
              text={question.word.english}
              size="sm"
              label={`${question.word.english} 발음`}
            />
          </div>
          <p className="font-ko text-lg font-bold text-primary">
            {question.word.korean}
          </p>
          {question.word.example && (
            <p className="text-sm text-muted-foreground">
              {question.word.example}
            </p>
          )}
          {question.word.exampleKo && (
            <p className="font-ko text-sm text-muted-foreground">
              {question.word.exampleKo}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
