"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RotateCcw,
  ArrowLeft,
  Flame,
  Sparkles,
  Trophy,
  Compass,
  Snowflake,
  Check,
} from "lucide-react";
import { ewords } from "@/data/ewords";
import { useWordbook } from "@/store/wordbook";
import { useProgress, questStatus, todayStat } from "@/store/progress";
import { wordAudioBase, cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import {
  buildPlacement,
  buildWordQuestion,
  recommendLevel,
  shuffle,
  type QuizWord,
} from "@/lib/quizEngine";
import { MIN_ANSWER_MS, todayISO } from "@/lib/learning";
import { WordQuestionView } from "./WordQuestionView";

interface DeckItem {
  word: QuizWord;
  /** 출제 시점의 Leitner 박스 (문제 유형 결정) */
  box: number;
  /** 발음 mp3 */
  src: string;
}

const audioFor = (en: string) => `/seed/_words/${wordAudioBase(en)}.mp3`;
const today = todayISO;

export function LearnClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const s = useProgress();
  const wb = useWordbook((x) => x.items);
  const { leitner, recordWord, streak, todayWords, dailyGoal } = s;

  const [deck, setDeck] = useState<DeckItem[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [stats, setStats] = useState({ right: 0, wrong: 0, rushed: 0 });
  const [sourceLabel, setSourceLabel] = useState("");
  const [graded, setGraded] = useState(false);

  /* 레벨 진단 */
  const [placement, setPlacement] = useState<ReturnType<typeof buildPlacement> | null>(
    null,
  );
  const [pIdx, setPIdx] = useState(0);
  const [pResults, setPResults] = useState<{ level: number; correct: boolean }[]>(
    [],
  );

  // 복습 대상(due) 개수
  const dueKeys = useMemo(() => {
    const t = today();
    return Object.entries(leitner)
      .filter(([, c]) => c.nextReview <= t)
      .map(([k]) => k);
  }, [leitner]);

  const ewordByEn = useMemo(() => {
    const m = new Map<string, (typeof ewords)[number]>();
    for (const w of ewords) m.set(w.english.toLowerCase(), w);
    return m;
  }, []);

  // 현재 문제 — idx/deck 이 바뀔 때만 생성(렌더마다 보기가 다시 섞이면 안 됨)
  const question = useMemo(() => {
    if (!deck || idx >= deck.length) return null;
    return buildWordQuestion(deck[idx].word, deck[idx].box);
  }, [deck, idx]);

  if (!mounted)
    return <div className="h-40 animate-pulse rounded-card bg-muted/40" />;

  /* ── 덱 만들기 ── */
  const itemFromEn = (en: string): DeckItem | null => {
    const box = leitner[en]?.box ?? 0;
    const e = ewordByEn.get(en);
    if (e)
      return {
        word: e,
        box,
        src: audioFor(e.english),
      };
    const w = wb.find((x) => x.text.toLowerCase() === en);
    if (w)
      return {
        word: {
          english: w.text,
          korean: w.meaning_ko || "(뜻 정보 없음)",
          emoji: "📝",
          example: w.example_en,
          exampleKo: w.example_ko,
          level: 0,
        },
        box,
        src: w.audioUrl || audioFor(w.text),
      };
    return null;
  };

  const start = (items: DeckItem[], label: string) => {
    if (items.length === 0) return;
    setDeck(shuffle(items));
    setIdx(0);
    setGraded(false);
    setStats({ right: 0, wrong: 0, rushed: 0 });
    setSourceLabel(label);
  };

  const startReview = () =>
    start(
      dueKeys.map(itemFromEn).filter((c): c is DeckItem => !!c),
      "복습",
    );

  const startWordbook = () =>
    start(
      wb
        .map((w) => itemFromEn(w.text.toLowerCase()))
        .filter((c): c is DeckItem => !!c),
      "내 단어장",
    );

  const startLevel = (lv: number) =>
    start(
      shuffle(ewords.filter((w) => w.level === lv))
        .slice(0, 20)
        .map((e) => ({
          word: e,
          box: leitner[e.english.toLowerCase()]?.box ?? 0,
          src: audioFor(e.english),
        })),
      `레벨 ${lv}`,
    );

  /* ── 채점 ── */
  const onGraded = (correct: boolean, elapsedMs: number) => {
    if (graded || !deck) return;
    setGraded(true);
    // 너무 빠른 응답(찍기·연타)은 박스만 갱신하고 XP·퀘스트 진척은 주지 않는다
    const rushed = elapsedMs < MIN_ANSWER_MS;
    recordWord(deck[idx].word.english, correct, !rushed);
    setStats((st) => ({
      right: st.right + (correct ? 1 : 0),
      wrong: st.wrong + (correct ? 0 : 1),
      rushed: st.rushed + (rushed ? 1 : 0),
    }));
  };

  const nextCard = () => {
    setGraded(false);
    setIdx((i) => i + 1);
  };

  /* ── 레벨 진단 ── */
  const startPlacement = () => {
    setPlacement(buildPlacement());
    setPIdx(0);
    setPResults([]);
  };

  const onPlacementGraded = (correct: boolean) => {
    if (!placement) return;
    const q = placement[pIdx];
    const next = [...pResults, { level: q.word.level, correct }];
    setPResults(next);
    window.setTimeout(() => {
      if (pIdx + 1 >= placement.length) {
        s.setPlacementLevel(recommendLevel(next));
        setPlacement(null);
        setPIdx(0);
      } else {
        setPIdx((i) => i + 1);
      }
    }, 900);
  };

  /* ── 레벨 진단 화면 ── */
  if (placement) {
    const q = placement[pIdx];
    return (
      <div className="mx-auto max-w-md space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPlacement(null)}
            aria-label="그만두기"
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(pIdx / placement.length) * 100}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-muted-foreground">
            {pIdx + 1}/{placement.length}
          </span>
        </div>
        <p className="text-center font-ko text-sm text-muted-foreground">
          🧭 레벨 진단 — 모르면 편하게 찍어도 돼요
        </p>
        <WordQuestionView
          key={pIdx}
          question={q}
          audioSrc={audioFor(q.word.english)}
          onGraded={onPlacementGraded}
        />
      </div>
    );
  }

  /* ── 완료 화면 ── */
  if (deck && idx >= deck.length) {
    const xpGained = stats.right * 10 + stats.wrong * 3;
    const acc = Math.round((stats.right / Math.max(1, deck.length)) * 100);
    return (
      <div className="mx-auto max-w-md space-y-5 text-center">
        <div className="text-6xl">{acc >= 80 ? "🎉" : "💪"}</div>
        <h2 className="text-2xl font-extrabold">{sourceLabel} 완료!</h2>
        <Card className="space-y-2 p-5">
          <div className="flex justify-around">
            <Stat label="맞춤" value={stats.right} tone="good" />
            <Stat label="복습필요" value={stats.wrong} tone="bad" />
            <Stat label="정확도" value={`${acc}%`} tone="primary" />
          </div>
        </Card>
        {stats.rushed > 0 && (
          <p className="font-ko text-sm text-muted-foreground">
            너무 빨리 누른 문제 {stats.rushed}개는 점수에 넣지 않았어요. 천천히 읽고
            답해요 🙂
          </p>
        )}
        <p className="font-ko text-sm text-muted-foreground">+{xpGained} XP</p>
        <div className="flex gap-2">
          <button
            onClick={() => setDeck(null)}
            className="flex-1 rounded-chip bg-muted py-3 font-semibold"
          >
            다른 학습
          </button>
          <button
            onClick={() => start(deck, sourceLabel)}
            className="flex-1 rounded-chip bg-primary py-3 font-semibold text-primary-foreground"
          >
            <RotateCcw className="mr-1 inline h-4 w-4" /> 다시
          </button>
        </div>
      </div>
    );
  }

  /* ── 학습 중 화면 ── */
  if (deck && question) {
    const pct = Math.round((idx / deck.length) * 100);
    return (
      <div className="mx-auto max-w-md space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDeck(null)}
            aria-label="그만두기"
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-muted-foreground">
            {idx + 1}/{deck.length}
          </span>
        </div>

        <WordQuestionView
          key={idx}
          question={question}
          audioSrc={deck[idx].src}
          onGraded={onGraded}
        />

        {graded && (
          <button
            onClick={nextCard}
            className="w-full rounded-chip bg-primary py-3.5 text-lg font-bold text-primary-foreground transition active:scale-[0.99]"
          >
            {idx + 1 >= deck.length ? "결과 보기" : "다음 문제"}
          </button>
        )}
      </div>
    );
  }

  /* ── 시작 허브 ── */
  const goalPct = Math.min(100, Math.round((todayWords / dailyGoal) * 100));
  const quests = questStatus(s);
  const day = todayStat(s);

  return (
    <div className="space-y-5">
      {/* 오늘 현황 */}
      <Card className="flex items-center gap-4 p-4">
        <div className="flex items-center gap-1.5 text-accent">
          <Flame className="h-6 w-6" />
          <span className="text-xl font-extrabold">{streak}</span>
          <span className="text-xs text-muted-foreground">일 연속</span>
        </div>
        {s.freezes > 0 && (
          <span
            className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary"
            title="하루 빠져도 연속이 유지되는 면제권"
          >
            <Snowflake className="h-3.5 w-3.5" /> {s.freezes}
          </span>
        )}
        <div className="flex-1">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>오늘 목표</span>
            <span>
              {todayWords}/{dailyGoal} 단어
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${goalPct}%` }}
            />
          </div>
        </div>
      </Card>

      {/* 오늘의 퀘스트 */}
      <section>
        <h3 className="mb-2 text-sm font-bold text-muted-foreground">
          오늘의 퀘스트
        </h3>
        <Card className="divide-y divide-border">
          {quests.map((q) => (
            <div key={q.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-xl">{q.emoji}</span>
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "text-sm font-bold",
                    q.done && "text-good line-through opacity-70",
                  )}
                >
                  {q.title}
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      q.done ? "bg-good" : "bg-primary",
                    )}
                    style={{ width: `${(q.current / q.target) * 100}%` }}
                  />
                </div>
              </div>
              <span className="shrink-0 text-xs font-bold tabular-nums text-muted-foreground">
                {q.done ? (
                  <Check className="h-5 w-5 text-good" />
                ) : (
                  `${q.current}/${q.target}${q.unit}`
                )}
              </span>
            </div>
          ))}
          {quests.every((q) => q.done) && (
            <p className="px-4 py-2.5 font-ko text-sm font-semibold text-good">
              🎯 오늘 퀘스트 모두 완료! 보너스 XP와 연속 면제권을 받았어요
            </p>
          )}
        </Card>
      </section>

      {/* 복습 (SRS due) */}
      <button
        onClick={startReview}
        disabled={dueKeys.length === 0}
        className="block w-full text-left"
      >
        <Card
          className={cn(
            "flex items-center gap-4 p-5 transition",
            dueKeys.length > 0
              ? "ring-2 ring-primary/40 hover:brightness-[0.98]"
              : "opacity-60",
          )}
        >
          <Sparkles className="h-8 w-8 text-primary" />
          <div className="flex-1">
            <h2 className="font-extrabold">오늘의 복습</h2>
            <p className="font-ko text-sm text-muted-foreground">
              {dueKeys.length > 0
                ? `복습할 때가 된 단어 ${dueKeys.length}개 (간격반복)`
                : "복습할 단어가 아직 없어요"}
            </p>
          </div>
          {dueKeys.length > 0 && (
            <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
              {dueKeys.length}
            </span>
          )}
        </Card>
      </button>

      {/* 내 단어장 */}
      <button
        onClick={startWordbook}
        disabled={wb.length === 0}
        className="block w-full text-left"
      >
        <Card
          className={cn(
            "flex items-center gap-4 p-5",
            wb.length === 0 && "opacity-60",
          )}
        >
          <Trophy className="h-7 w-7 text-accent" />
          <div className="flex-1">
            <h2 className="font-extrabold">내 단어장 학습</h2>
            <p className="font-ko text-sm text-muted-foreground">
              책에서 모은 단어 {wb.length}개로 문제 풀기
            </p>
          </div>
        </Card>
      </button>

      {/* 레벨 진단 */}
      <button onClick={startPlacement} className="block w-full text-left">
        <Card className="flex items-center gap-4 p-5 transition hover:brightness-[0.98]">
          <Compass className="h-7 w-7 text-primary" />
          <div className="flex-1">
            <h2 className="font-extrabold">레벨 진단</h2>
            <p className="font-ko text-sm text-muted-foreground">
              {s.placementLevel > 0
                ? `내 추천 레벨은 ${s.placementLevel}이에요 · 다시 진단하기`
                : "10문제로 내게 맞는 시작 레벨을 찾아요 (3분)"}
            </p>
          </div>
        </Card>
      </button>

      {/* 레벨별 1000단어 */}
      <div>
        <h3 className="mb-2 text-sm font-bold text-muted-foreground">
          초등 영단어 1000 · 레벨별
        </h3>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((lv) => {
            const total = ewords.filter((w) => w.level === lv).length;
            const learned = ewords.filter(
              (w) => w.level === lv && leitner[w.english.toLowerCase()],
            ).length;
            const recommended = s.placementLevel === lv;
            return (
              <button key={lv} onClick={() => startLevel(lv)} className="text-left">
                <Card
                  className={cn(
                    "space-y-1 p-4 transition hover:brightness-[0.98]",
                    recommended && "ring-2 ring-primary",
                  )}
                >
                  <div className="flex items-center gap-1 text-lg font-extrabold">
                    레벨 {lv} {recommended && <span className="text-sm">✨</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {learned}/{total} 학습
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.round((learned / total) * 100)}%` }}
                    />
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      </div>

      {/* 오늘 한 일 요약 */}
      {(day.books > 0 || day.shadow > 0) && (
        <p className="text-center font-ko text-xs text-muted-foreground">
          오늘 책 {day.books}권 · 쉐도잉 {day.shadow}문장 · 단어 {day.words}개
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "good" | "bad" | "primary";
}) {
  const c =
    tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-primary";
  return (
    <div className="space-y-0.5">
      <div className={cn("text-2xl font-extrabold", c)}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
