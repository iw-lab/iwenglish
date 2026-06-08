"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RotateCcw,
  Check,
  X,
  ArrowLeft,
  Flame,
  Sparkles,
  Trophy,
} from "lucide-react";
import { ewords } from "@/data/ewords";
import { useWordbook } from "@/store/wordbook";
import { useProgress } from "@/store/progress";
import { wordAudioBase } from "@/lib/utils";
import { AudioButton } from "@/components/ui/AudioButton";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface StudyCard {
  en: string;
  ko: string;
  emoji: string;
  exEn: string;
  exKo: string;
  src: string;
}

const audioFor = (en: string) => `/seed/_words/${wordAudioBase(en)}.mp3`;
const shuffle = <T,>(a: T[]) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};
const today = () => new Date().toISOString().slice(0, 10);

export function LearnClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const wb = useWordbook((s) => s.items);
  const leitner = useProgress((s) => s.leitner);
  const recordWord = useProgress((s) => s.recordWord);
  const streak = useProgress((s) => s.streak);
  const todayWords = useProgress((s) => s.todayWords);
  const dailyGoal = useProgress((s) => s.dailyGoal);

  const [deck, setDeck] = useState<StudyCard[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [stats, setStats] = useState({ right: 0, wrong: 0 });
  const [sourceLabel, setSourceLabel] = useState("");

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

  if (!mounted)
    return <div className="h-40 animate-pulse rounded-card bg-muted/40" />;

  /* ── 덱 만들기 ── */
  const cardFromEn = (en: string): StudyCard | null => {
    const e = ewordByEn.get(en);
    if (e)
      return {
        en: e.english,
        ko: e.korean,
        emoji: e.emoji,
        exEn: e.example,
        exKo: e.exampleKo,
        src: audioFor(e.english),
      };
    const w = wb.find((x) => x.text.toLowerCase() === en);
    if (w)
      return {
        en: w.text,
        ko: w.meaning_ko || "(뜻 정보 없음)",
        emoji: "📝",
        exEn: w.example_en,
        exKo: w.example_ko,
        src: w.audioUrl || audioFor(w.text),
      };
    return null;
  };

  const start = (cards: StudyCard[], label: string) => {
    if (cards.length === 0) return;
    setDeck(shuffle(cards));
    setIdx(0);
    setFlipped(false);
    setStats({ right: 0, wrong: 0 });
    setSourceLabel(label);
  };

  const startReview = () =>
    start(
      dueKeys.map(cardFromEn).filter((c): c is StudyCard => !!c),
      "복습",
    );
  const startWordbook = () =>
    start(
      wb.map((w) => ({
        en: w.text,
        ko: w.meaning_ko || "(뜻 정보 없음)",
        emoji: "📝",
        exEn: w.example_en,
        exKo: w.example_ko,
        src: w.audioUrl || audioFor(w.text),
      })),
      "내 단어장",
    );
  const startLevel = (lv: number) =>
    start(
      shuffle(ewords.filter((w) => w.level === lv))
        .slice(0, 20)
        .map((e) => ({
          en: e.english,
          ko: e.korean,
          emoji: e.emoji,
          exEn: e.example,
          exKo: e.exampleKo,
          src: audioFor(e.english),
        })),
      `레벨 ${lv}`,
    );

  /* ── 채점 ── */
  const grade = (correct: boolean) => {
    const card = deck![idx];
    recordWord(card.en, correct);
    setStats((s) => ({
      right: s.right + (correct ? 1 : 0),
      wrong: s.wrong + (correct ? 0 : 1),
    }));
    if (idx + 1 < deck!.length) {
      setIdx(idx + 1);
      setFlipped(false);
    } else {
      setIdx(deck!.length); // 완료 화면
    }
  };

  /* ── 완료 화면 ── */
  if (deck && idx >= deck.length) {
    const xpGained = stats.right * 10 + stats.wrong * 3;
    return (
      <div className="mx-auto max-w-md space-y-5 text-center">
        <div className="text-6xl">🎉</div>
        <h2 className="text-2xl font-extrabold">학습 완료!</h2>
        <Card className="space-y-2 p-5">
          <div className="flex justify-around">
            <Stat label="맞춤" value={stats.right} tone="good" />
            <Stat label="복습필요" value={stats.wrong} tone="bad" />
            <Stat label="얻은 XP" value={`+${xpGained}`} tone="primary" />
          </div>
        </Card>
        <div className="flex gap-2">
          <button
            onClick={() => setDeck(null)}
            className="flex-1 rounded-chip bg-muted py-3 font-semibold"
          >
            다른 학습
          </button>
          <button
            onClick={() => start(shuffle(deck), sourceLabel)}
            className="flex-1 rounded-chip bg-primary py-3 font-semibold text-primary-foreground"
          >
            <RotateCcw className="mr-1 inline h-4 w-4" /> 다시
          </button>
        </div>
      </div>
    );
  }

  /* ── 학습 중 화면 ── */
  if (deck) {
    const card = deck[idx];
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

        <button
          onClick={() => setFlipped((f) => !f)}
          className="block w-full"
          aria-label="카드 뒤집기"
        >
          <Card className="flex min-h-[18rem] flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="text-6xl">{card.emoji}</span>
            <span className="text-3xl font-extrabold">{card.en}</span>
            <span onClick={(e) => e.stopPropagation()}>
              <AudioButton src={card.src} text={card.en} label={`${card.en} 발음`} />
            </span>
            {flipped ? (
              <div className="space-y-1 pt-1">
                <p className="font-ko text-2xl font-bold text-primary">
                  {card.ko}
                </p>
                {card.exEn && (
                  <p className="text-sm text-muted-foreground">{card.exEn}</p>
                )}
                {card.exKo && (
                  <p className="font-ko text-sm text-muted-foreground">
                    {card.exKo}
                  </p>
                )}
              </div>
            ) : (
              <p className="pt-2 text-xs text-muted-foreground">
                탭하면 뜻이 보여요
              </p>
            )}
          </Card>
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => grade(false)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-chip bg-bad/15 py-3.5 font-bold text-bad hover:bg-bad/25"
          >
            <X className="h-5 w-5" /> 몰라요
          </button>
          <button
            onClick={() => grade(true)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-chip bg-good/15 py-3.5 font-bold text-good hover:bg-good/25"
          >
            <Check className="h-5 w-5" /> 알아요
          </button>
        </div>
      </div>
    );
  }

  /* ── 시작 허브 ── */
  const goalPct = Math.min(100, Math.round((todayWords / dailyGoal) * 100));
  return (
    <div className="space-y-5">
      {/* 오늘 현황 */}
      <Card className="flex items-center gap-4 p-4">
        <div className="flex items-center gap-1.5 text-accent">
          <Flame className="h-6 w-6" />
          <span className="text-xl font-extrabold">{streak}</span>
          <span className="text-xs text-muted-foreground">일 연속</span>
        </div>
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

      {/* 복습 (SRS due) */}
      <button onClick={startReview} disabled={dueKeys.length === 0} className="block w-full text-left">
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
      <button onClick={startWordbook} disabled={wb.length === 0} className="block w-full text-left">
        <Card className={cn("flex items-center gap-4 p-5", wb.length === 0 && "opacity-60")}>
          <Trophy className="h-7 w-7 text-accent" />
          <div className="flex-1">
            <h2 className="font-extrabold">내 단어장 학습</h2>
            <p className="font-ko text-sm text-muted-foreground">
              책에서 모은 단어 {wb.length}개로 카드 학습
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
            return (
              <button key={lv} onClick={() => startLevel(lv)} className="text-left">
                <Card className="space-y-1 p-4 transition hover:brightness-[0.98]">
                  <div className="text-lg font-extrabold">레벨 {lv}</div>
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
