"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Repeat,
  Gauge,
  Languages,
  ArrowLeft,
  Home,
  ListChecks,
  SkipBack,
  Stamp,
  Award,
} from "lucide-react";
import type { Book, LearningMode } from "@/types/book";
import { MODES } from "@/lib/data/modes";
import { useKaraoke } from "@/hooks/useKaraoke";
import { useSettings } from "@/store/settings";
import { useProgress, READS_TO_COMPLETE } from "@/store/progress";
import { SentenceView } from "./SentenceView";
import { PracticeControls, type PracticeMode } from "./PracticeControls";
import { RecordPractice } from "./RecordPractice";
import { QuizPanel } from "./QuizPanel";
import { cn } from "@/lib/utils";

export function Reader({ book }: { book: Book }) {
  const [mode, setMode] = useState<LearningMode>("read-aloud");
  const [pageIdx, setPageIdx] = useState(0);
  // 그림 비율은 이미지 자연 크기에 맡김(아래 그림 블록 max-h + w-auto) — 세로(2:3)·가로(3:2) 혼재 대응
  const [sentIdx, setSentIdx] = useState(0);
  const [repeatCount, setRepeatCount] = useState(1); // 0 = 무한(∞)
  const [showQuiz, setShowQuiz] = useState(false);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("repeat");
  const [gapScale, setGapScale] = useState(1);
  const [gap, setGap] = useState<{ active: boolean; ms: number }>({
    active: false,
    ms: 0,
  });
  const gapTimerRef = useRef<number | null>(null);
  // 쉐도잉: 같은 문장 2회 재생(듣기→겹쳐 말하기). passRef=현재 문장 재생 횟수
  const passRef = useRef(0);
  const [shadowEcho, setShadowEcho] = useState(false);
  // 문장 반복 횟수 카운터
  const repRef = useRef(0);
  const { playbackRate, setPlaybackRate, showTranslation, toggleTranslation } =
    useSettings();
  // 혼자 읽기(무음·하이라이트만): 학생이 직접 소리 내어 읽음
  const [selfRead, setSelfRead] = useState(false);
  const recordReading = useProgress((s) => s.recordReading);
  const finishBook = useProgress((s) => s.finishBook);
  const addBookRead = useProgress((s) => s.addBookRead);
  const readCount = useProgress((s) => s.bookReads?.[book.slug] ?? 0);
  const completed = useProgress(
    (s) => s.booksCompleted?.includes(book.slug) ?? false,
  );
  // 도장 찍을 때 살짝 튀는 피드백
  const [stampPulse, setStampPulse] = useState(false);
  // 한 번 읽을 때 도장은 한 번만 — 처음부터 다시 읽어야 재허용
  const [stampedThisRead, setStampedThisRead] = useState(false);
  // 콘페티 버스트 (도장 직후 0.9초)
  const [confetti, setConfetti] = useState(false);
  const sessionStartRef = useRef<number>(0);
  const recordedRef = useRef(false);
  useEffect(() => {
    sessionStartRef.current = Date.now();
  }, []);
  const hasQuiz = book.quiz.length > 0;

  // 책 완독 기록(중복 방지) + XP/진도 반영
  const markFinished = () => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    finishBook(book.slug);
    recordReading({
      slug: book.slug,
      title: book.title,
      mode: selfRead ? "혼자 읽기" : "낭독",
      words: book.wordCount,
      ms: Date.now() - sessionStartRef.current,
    });
  };

  const flat = useMemo(
    () =>
      book.pages.flatMap((p, pi) =>
        p.sentences.map((s, si) => ({ s, pi, si })),
      ),
    [book],
  );

  const page = book.pages[pageIdx];
  const sentence = page?.sentences[sentIdx] ?? null;
  const globalIdx = flat.findIndex(
    (f) => f.pi === pageIdx && f.si === sentIdx,
  );

  // 이웃 페이지 그림을 미리 받아 둠 → 페이지 전환 시 빈 박스 깜빡임 제거
  useEffect(() => {
    for (const d of [1, 2, -1]) {
      const url = book.pages[pageIdx + d]?.imageUrl;
      if (!url) continue;
      const im = new window.Image();
      im.src = url;
    }
  }, [pageIdx, book.pages]);

  // 연속 낭독(쭉 읽어주기) 진행 플래그
  const autoRef = useRef(false);

  const goTo = (gi: number) => {
    const target = flat[gi];
    if (!target) return;
    setPageIdx(target.pi);
    setSentIdx(target.si);
  };

  // 쪽(페이지) 단위 점프 — 해당 쪽 첫 문장으로 이동(문장 하나씩 넘기지 않아도 됨)
  const goToPage = (pi: number) => {
    if (pi < 0 || pi >= book.pages.length) return;
    stopAuto();
    setPageIdx(pi);
    setSentIdx(0);
  };

  // onEnd 는 stable 콜백으로 넘기고 최신 로직은 ref 로 갱신(stale closure 방지)
  const onEndRef = useRef<() => void>(() => {});
  const karaoke = useKaraoke(sentence, {
    rate: playbackRate,
    onEnd: () => onEndRef.current(),
    silent: selfRead,
  });

  // 현재 문장 길이(ms) — 마지막 단어 타임스탬프, 없으면 글자수 추정
  const sentDurMs = (() => {
    const t = sentence?.wordTimings;
    if (t && t.length) return t[t.length - 1].endMs;
    return Math.max(1200, (sentence?.text.length ?? 20) * 70);
  })();

  const clearGap = () => {
    if (gapTimerRef.current) {
      clearTimeout(gapTimerRef.current);
      gapTimerRef.current = null;
    }
    setGap({ active: false, ms: 0 });
  };

  const runGap = (ms: number, cb: () => void) => {
    setGap({ active: true, ms });
    gapTimerRef.current = window.setTimeout(() => {
      gapTimerRef.current = null;
      setGap({ active: false, ms: 0 });
      cb();
    }, ms);
  };

  // 따라 말할 간격(ms): 쉐도잉=짧게, 따라 읽기=문장 길이보다 넉넉히(초등 또박또박), slider 로 미세조정
  const gapMs = () => {
    const base = practiceMode === "repeat" ? sentDurMs * 1.7 : sentDurMs * 0.6;
    const floor = practiceMode === "repeat" ? 1400 : 700;
    return Math.max(floor, Math.round(base * gapScale));
  };

  // 매 렌더 후 최신 로직으로 ref 갱신 (stale closure 방지)
  useEffect(() => {
    onEndRef.current = () => {
      // 쉐도잉: 1회차면 곧바로 같은 문장을 다시 재생(이때 겹쳐 따라 말함)
      if (practiceMode === "shadow" && passRef.current === 0) {
        passRef.current = 1;
        setShadowEcho(true);
        karaoke.play();
        return;
      }
      passRef.current = 0;
      setShadowEcho(false);

      // 한 번의 완전한 반복(rep) 완료
      repRef.current += 1;
      const moreReps =
        repeatCount === 0 || repRef.current < repeatCount; // 0=무한
      const gapMode = practiceMode === "repeat";

      // 같은 문장을 한 번 더 (다음 rep)
      if (moreReps) {
        if (gapMode) runGap(gapMs(), () => karaoke.play());
        else karaoke.play();
        return;
      }

      // 반복 끝 → 다음 문장(연속) 또는 정지(한 문장씩)
      repRef.current = 0;
      if (mode === "sentence") return; // 한 문장씩: 정지
      if (!autoRef.current || globalIdx >= flat.length - 1) {
        // 마지막 문장까지 연속으로 읽으면 완독 기록 + XP
        if (globalIdx >= flat.length - 1) markFinished();
        autoRef.current = false;
        return;
      }
      if (gapMode) runGap(gapMs(), () => goTo(globalIdx + 1));
      else goTo(globalIdx + 1);
    };
  });

  // 문장이 바뀌면(자동 진행 중) 새 문장을 이어서 재생 + 패스/반복 카운터 리셋
  useEffect(() => {
    passRef.current = 0; // shadowEcho 는 onEndRef/stopAuto 에서 이미 해제됨
    repRef.current = 0;
    if (autoRef.current && sentence) karaoke.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentence?.id]);

  // 언마운트 시 간격 타이머 정리
  useEffect(
    () => () => {
      if (gapTimerRef.current) clearTimeout(gapTimerRef.current);
    },
    [],
  );

  // 재생/일시정지 버튼
  const togglePlay = () => {
    if (karaoke.playing || gap.active) {
      autoRef.current = false;
      passRef.current = 0;
      repRef.current = 0;
      setShadowEcho(false);
      clearGap();
      karaoke.pause();
    } else {
      autoRef.current = mode === "read-aloud";
      passRef.current = 0;
      repRef.current = 0;
      karaoke.play();
    }
  };

  // 수동 이동/모드변경 시 자동 진행 중단
  const stopAuto = () => {
    autoRef.current = false;
    passRef.current = 0;
    repRef.current = 0;
    setShadowEcho(false);
    clearGap();
    karaoke.pause();
  };

  // 이 책의 처음(첫 쪽·첫 문장)으로 — 다시 읽기
  const goToStart = () => {
    stopAuto();
    setPageIdx(0);
    setSentIdx(0);
    recordedRef.current = false; // 다시 읽으면 완독 세션 재기록 허용
    setStampedThisRead(false); // 다시 읽으면 도장 1회 재허용
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 완독 도장 — 한 번 읽기에 1회만, 10회 모이면 '완료'
  const onStamp = () => {
    if (completed || stampedThisRead) return;
    markFinished(); // 첫 완독 세션 기록(중복 방지됨)
    addBookRead(book.slug);
    setStampedThisRead(true);
    setStampPulse(true);
    setConfetti(true);
    window.setTimeout(() => setStampPulse(false), 450);
    window.setTimeout(() => setConfetti(false), 950);
  };

  // 읽기 모드는 2개(쭉 읽어주기·한 문장씩)만. 단어 탭·쉐도잉·따라 읽기는 읽기 화면에 통합됨.
  const tabModes = MODES.filter(
    (m) => m.id === "read-aloud" || m.id === "sentence",
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col lg:max-w-none lg:px-8 2xl:px-20">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/85 px-3 py-2.5 backdrop-blur-md">
        <Link
          href={`/book/${book.slug}`}
          aria-label="뒤로"
          className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Link
          href="/"
          aria-label="홈(서재)으로"
          className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted"
        >
          <Home className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{book.title}</p>
          <div className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
            <button
              onClick={() => goToPage(pageIdx - 1)}
              disabled={pageIdx <= 0}
              aria-label="이전 쪽"
              title="이전 쪽"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full hover:bg-muted disabled:opacity-30"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <span className="tabular-nums">
              {pageIdx + 1} / {book.pages.length} 쪽
            </span>
            <button
              onClick={() => goToPage(pageIdx + 1)}
              disabled={pageIdx >= book.pages.length - 1}
              aria-label="다음 쪽"
              title="다음 쪽"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full hover:bg-muted disabled:opacity-30"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <button
          onClick={toggleTranslation}
          aria-pressed={showTranslation}
          className={cn(
            "grid h-9 w-9 place-items-center rounded-full hover:bg-muted",
            showTranslation && "text-primary",
          )}
          aria-label="번역 토글"
        >
          <Languages className="h-5 w-5" />
        </button>
        {hasQuiz && (
          <button
            onClick={() => {
              stopAuto();
              setShowQuiz((v) => !v);
            }}
            aria-pressed={showQuiz}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full hover:bg-muted",
              showQuiz && "text-primary",
            )}
            aria-label="이해 퀴즈"
          >
            <ListChecks className="h-5 w-5" />
          </button>
        )}
      </header>

      {showQuiz ? (
        <div className="flex-1 px-4">
          <QuizPanel quiz={book.quiz} onClose={() => setShowQuiz(false)} />
        </div>
      ) : (
        <>
          {/* === 학습 본문 === */}

      {/* 모드 탭 */}
      <div className="flex gap-1.5 overflow-x-auto px-3 py-2 lg:justify-center">
        {tabModes.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              stopAuto();
              setMode(m.id);
            }}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
              mode === m.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {m.emoji} {m.title}
          </button>
        ))}
        <span className="mx-1 w-px self-stretch bg-border" />
        <button
          onClick={() => {
            stopAuto();
            setSelfRead((v) => !v);
          }}
          aria-pressed={selfRead}
          title="음성 없이 하이라이트만 — 직접 소리 내어 읽어요"
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
            selfRead
              ? "bg-accent text-accent-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          🎤 혼자 읽기
        </button>
      </div>

      {/* 그림 + 본문 (데스크톱 2단) — 그림 칸을 auto 트랙으로: 이미지 실제 폭만큼만 차지해 가운데 빈 공간 제거 */}
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start lg:gap-6 lg:px-6 lg:py-4 xl:gap-8">
      {/* 그림: 자연 비율 그대로 높이만 제한(w-auto) → 세로/가로 무관 인물 잘림 0, 레터박스 띠 0 */}
      <div className="mx-3 mt-1 flex justify-center lg:mx-0 lg:mt-0 lg:sticky lg:top-24">
        {page?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={page.imageUrl}
            src={page.imageUrl}
            alt={`${book.title} ${pageIdx + 1}쪽`}
            onLoad={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
            style={{ opacity: 0, transition: "opacity .35s ease" }}
            className="max-h-[58vh] w-auto max-w-full rounded-card object-contain shadow-sm lg:max-h-[calc(100dvh-8rem)] lg:max-w-[44vw]"
          />
        ) : (
          <div className="grid aspect-[3/4] w-64 place-items-center rounded-card bg-muted text-sm text-muted-foreground lg:w-72">
            그림 준비 중
          </div>
        )}
      </div>

      {/* 본문 */}
      <div className="flex-1 px-4 py-4 lg:px-0 lg:py-0">
          <div className="space-y-4">
            {page?.sentences.map((s, i) => {
              const isActive = i === sentIdx;
              return (
                <div
                  key={s.id}
                  onClick={(e) => {
                    // 단어 탭(버튼) 클릭이면 문장 선택/낭독위치 이동 안 함
                    if ((e.target as HTMLElement).closest("button")) return;
                    if (mode === "sentence" || mode === "read-aloud") {
                      stopAuto();
                      setSentIdx(i);
                    }
                  }}
                  className={cn(
                    "rounded-card p-3 transition",
                    isActive ? "bg-card shadow-sm ring-1 ring-primary/30" : "opacity-70",
                    (mode === "sentence" || mode === "read-aloud") &&
                      "cursor-pointer",
                  )}
                >
                  <SentenceView
                    text={s.text}
                    activeWord={isActive ? karaoke.activeWord : -1}
                    wordTap
                  />
                  {showTranslation && s.translation_ko && (
                    <p className="mt-1.5 font-ko text-sm text-muted-foreground">
                      {s.translation_ko}
                    </p>
                  )}
                </div>
              );
            })}
            {/* 마지막 쪽: 완독 도장(10번 읽으면 완료) */}
            {pageIdx === book.pages.length - 1 && (
              <div className="rounded-card border-2 border-dashed border-accent/50 bg-accent/5 p-4 text-center">
                {completed ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-good/15 text-good">
                      <Award className="h-9 w-9" />
                    </div>
                    <p className="text-lg font-extrabold text-good">
                      완독 완료! 🎉👑
                    </p>
                    <p className="font-ko text-xs text-muted-foreground">
                      이 책을 {READS_TO_COMPLETE}번 다 읽었어요. 정말 대단해요!
                    </p>
                    <button
                      onClick={goToStart}
                      className="mt-1 inline-flex items-center gap-1.5 rounded-chip bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition active:scale-95"
                    >
                      <SkipBack className="h-4 w-4" /> 처음부터 다시 읽기
                    </button>
                  </div>
                ) : (
                  <div className="relative flex flex-col items-center gap-2.5">
                    {/* 콘페티 버스트 */}
                    {confetti &&
                      ["⭐", "🎉", "✨", "💛", "⭐", "🎊", "✨", "💚", "🌟", "🧡"].map(
                        (e, i) => {
                          const ang = (i / 10) * Math.PI * 2;
                          const dist = 70 + (i % 3) * 28;
                          return (
                            <span
                              key={i}
                              className="stamp-confetti text-xl"
                              style={
                                {
                                  "--cx": `${Math.cos(ang) * dist}px`,
                                  "--cy": `${Math.sin(ang) * dist - 30}px`,
                                  "--cr": `${(i % 2 ? 1 : -1) * 180}deg`,
                                } as React.CSSProperties
                              }
                            >
                              {e}
                            </span>
                          );
                        },
                      )}
                    <p className="text-base font-bold">
                      {stampedThisRead ? "도장 꾹! 🎉" : "📖 완전히 다 읽었어요!"}
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {Array.from({ length: READS_TO_COMPLETE }).map((_, i) => (
                        <span
                          key={i}
                          className={cn(
                            "grid h-7 w-7 place-items-center rounded-full text-sm font-bold transition",
                            i < readCount
                              ? "bg-accent text-accent-foreground"
                              : "bg-muted text-muted-foreground/40",
                            stampedThisRead && i === readCount - 1 && "stamp-slam",
                          )}
                        >
                          {i < readCount ? "⭐" : i + 1}
                        </span>
                      ))}
                    </div>
                    <p className="font-ko text-xs text-muted-foreground">
                      {stampedThisRead
                        ? `${readCount}/${READS_TO_COMPLETE} — 또 찍으려면 처음부터 다시 읽어요!`
                        : `${readCount}/${READS_TO_COMPLETE} — 다 읽을 때마다 도장 1개를 찍어요`}
                    </p>
                    {stampedThisRead ? (
                      <button
                        onClick={goToStart}
                        className="mt-1 inline-flex items-center gap-2 rounded-chip bg-primary px-6 py-3 text-base font-extrabold text-primary-foreground shadow-sm transition active:scale-95"
                      >
                        <SkipBack className="h-5 w-5" /> 처음부터 다시 읽기
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={onStamp}
                          className={cn(
                            "mt-1 inline-flex items-center gap-2 rounded-chip bg-accent px-6 py-3 text-base font-extrabold text-accent-foreground shadow-sm transition active:scale-95",
                            stampPulse && "stamp-slam",
                          )}
                        >
                          <Stamp className="h-5 w-5" /> 도장 찍기 (+1)
                        </button>
                        {readCount > 0 && (
                          <button
                            onClick={goToStart}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                          >
                            <SkipBack className="h-3.5 w-3.5" /> 처음부터 다시 읽기
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            {hasQuiz && pageIdx === book.pages.length - 1 && (
              <button
                onClick={() => {
                  stopAuto();
                  markFinished();
                  setShowQuiz(true);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-card bg-card px-4 py-3.5 font-semibold shadow-sm ring-1 ring-border transition hover:bg-muted"
              >
                <ListChecks className="h-5 w-5 text-primary" /> 이해 퀴즈 풀기
              </button>
            )}
            {/* 따라 말하기·쉐도잉 (간격) + 녹음 — 분리 */}
            <PracticeControls
              mode={practiceMode}
              setMode={(m) => {
                clearGap();
                setPracticeMode(m);
              }}
              gapScale={gapScale}
              setGapScale={setGapScale}
            />
            <RecordPractice sentence={sentence} />
          </div>
      </div>
      </div>
      {/* /그림+본문 */}

      {/* 따라 읽기 — 침묵 간격 배너 */}
      {gap.active && (
        <div className="sticky bottom-[68px] z-30 mx-auto w-full max-w-lg px-4">
          <div className="flex items-center gap-2 rounded-card border border-accent/40 bg-accent/10 px-4 py-2.5">
            <span className="text-sm font-bold text-accent">
              🎙️ 지금 따라 말해보세요!
            </span>
            <div className="ml-auto h-1.5 flex-1 overflow-hidden rounded-full bg-accent/20">
              <div
                className="h-full origin-left rounded-full bg-accent"
                style={{ animation: `echotale-shrink ${gap.ms}ms linear forwards` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 쉐도잉 — 같이 따라 말하기 배너(2회차 재생 중) */}
      {shadowEcho && (
        <div className="sticky bottom-[68px] z-30 mx-auto w-full max-w-lg px-4">
          <div className="flex items-center gap-2 rounded-card border border-primary/40 bg-primary/10 px-4 py-2.5">
            <span className="animate-pulse text-sm font-bold text-primary">
              🗣 같이 따라 말해요!
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              원어민과 겹쳐서
            </span>
          </div>
        </div>
      )}

      {/* 떠 있는 '다음 쪽' 버튼 — 읽는 중 엄지로 바로 다음 쪽 넘기기(마지막 쪽이면 숨김) */}
      {pageIdx < book.pages.length - 1 && (
        <button
          onClick={() => goToPage(pageIdx + 1)}
          aria-label="다음 쪽으로"
          className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-1 rounded-full bg-primary/90 py-2.5 pl-4 pr-3 text-sm font-bold text-primary-foreground shadow-lg backdrop-blur-sm transition active:scale-95 lg:bottom-8"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          다음 쪽 <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* 컨트롤 */}
      {(
        <div
          className="sticky bottom-0 z-30 flex items-center justify-center gap-3 border-t border-border bg-background/90 px-3 py-3 backdrop-blur-md"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <button
            onClick={goToStart}
            disabled={globalIdx <= 0}
            aria-label="이 책 처음으로"
            title="이 책 처음으로 돌아가기"
            className="grid h-11 w-11 place-items-center rounded-full hover:bg-muted disabled:opacity-40"
          >
            <SkipBack className="h-5 w-5" />
          </button>

          <button
            onClick={() => {
              if (globalIdx > 0) {
                stopAuto();
                goTo(globalIdx - 1);
              }
            }}
            disabled={globalIdx <= 0}
            aria-label="이전 문장"
            className="grid h-11 w-11 place-items-center rounded-full hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={togglePlay}
            aria-label={karaoke.playing || gap.active ? "일시정지" : "재생"}
            className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95"
          >
            {karaoke.playing || gap.active ? (
              <Pause className="h-7 w-7" />
            ) : (
              <Play className="h-7 w-7" />
            )}
          </button>

          <button
            onClick={() => {
              if (globalIdx < flat.length - 1) {
                stopAuto();
                goTo(globalIdx + 1);
              }
            }}
            disabled={globalIdx >= flat.length - 1}
            aria-label="다음 문장"
            className="grid h-11 w-11 place-items-center rounded-full hover:bg-muted disabled:opacity-40"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* 읽기 속도 */}
          <label className="ml-1 flex items-center gap-1 rounded-full bg-muted px-2.5 py-1.5 text-sm">
            <Gauge className="h-4 w-4 text-primary" />
            <select
              value={playbackRate}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              aria-label="읽기 속도"
              className="bg-transparent font-semibold outline-none"
            >
              <option value={0.5}>0.5배속</option>
              <option value={0.75}>0.75배속</option>
              <option value={1}>1배속</option>
              <option value={1.25}>1.25배속</option>
              <option value={1.5}>1.5배속</option>
            </select>
          </label>

          {/* 반복 읽기 횟수 */}
          <label className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1.5 text-sm">
            <Repeat className="h-4 w-4 text-accent" />
            <select
              value={repeatCount}
              onChange={(e) => {
                repRef.current = 0;
                setRepeatCount(Number(e.target.value));
              }}
              aria-label="문장 반복 읽기 횟수"
              className="bg-transparent font-semibold outline-none"
            >
              <option value={1}>1번 읽기</option>
              <option value={2}>2번 읽기</option>
              <option value={3}>3번 읽기</option>
              <option value={5}>5번 읽기</option>
              <option value={10}>10번 읽기</option>
              <option value={25}>25번 읽기</option>
              <option value={0}>무한 반복</option>
            </select>
          </label>
        </div>
      )}
        </>
      )}
    </div>
  );
}
