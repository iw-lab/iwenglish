"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DAILY_QUESTS,
  MAX_FREEZES,
  QUEST_BONUS_XP,
  READS_TO_COMPLETE,
  addDaysISO,
  allQuestsDone,
  diffDaysISO,
  emptyDay,
  todayISO,
  type DayStat,
} from "@/lib/learning";

/* ───────── 유틸 (전부 로컬 날짜 기준 — lib/learning 참고) ───────── */
const todayStr = todayISO;
const addDays = addDaysISO;
const diffDays = diffDaysISO;

/**
 * Leitner 박스별 복습 간격(일). box 는 1~5 이므로 BOX_DAYS[box] 로 인덱싱한다.
 * box1=1일 · box2=3 · box3=7 · box4=21 · box5(마스터)=60일 뒤 망각 재검.
 * (0번 자리는 box0 이 존재하지 않아 쓰이지 않는 자리표시자다.)
 */
const BOX_DAYS = [0, 1, 3, 7, 21, 60];

/**
 * Leitner 박스(1~5) → 다음 복습까지 일수.
 * 과거 `BOX_DAYS[box - 1]` 로 잘못 인덱싱해 마스터(box5)가 60일이 아니라 21일을
 * 쓰고 BOX_DAYS[5]=60 은 영영 도달하지 못했다. 회귀 방지를 위해 함수로 고정한다.
 */
export const boxIntervalDays = (box: number) => BOX_DAYS[box] ?? 60;

/**
 * 스트릭·프리즈 전이(순수). gapDays = 마지막 활동일과 오늘의 간격(일).
 * 1일이면 연속, 2일이면 프리즈를 1개 소모해 연속 유지, 그 외에는 1로 리셋한다.
 */
export function nextStreak(
  prev: { streak: number; freezes: number },
  gapDays: number,
): { streak: number; freezes: number } {
  if (gapDays === 1) return { streak: prev.streak + 1, freezes: prev.freezes };
  if (gapDays === 2 && prev.freezes > 0)
    return { streak: prev.streak + 1, freezes: prev.freezes - 1 };
  return { streak: 1, freezes: prev.freezes };
}
/** 레벨업 곡선: 레벨 n 까지 누적 XP = 100 * n */
export const xpForLevel = (xp: number) => Math.floor(xp / 100) + 1;
export const levelFloor = (lvl: number) => (lvl - 1) * 100;
/** 일별 통계 보관 일수 */
const DAILY_KEEP = 60;

export { READS_TO_COMPLETE };

/** 레벨 칭호 — 게이미피케이션 (레벨 도달 기준, 내림차순 탐색) */
export const READER_TITLES: { min: number; title: string; emoji: string }[] = [
  { min: 20, title: "전설의 이야기꾼", emoji: "🐉" },
  { min: 16, title: "이야기 마스터", emoji: "🏰" },
  { min: 12, title: "영어 책벌레", emoji: "🦉" },
  { min: 8, title: "동화 모험가", emoji: "🗺️" },
  { min: 5, title: "단어 탐험가", emoji: "🔭" },
  { min: 3, title: "꼬마 이야기꾼", emoji: "🎈" },
  { min: 1, title: "새싹 독서가", emoji: "🌱" },
];
export const readerTitle = (lvl: number) =>
  READER_TITLES.find((t) => lvl >= t.min) ?? READER_TITLES[READER_TITLES.length - 1];

export interface LeitnerCard {
  box: number; // 1~5
  correct: number;
  wrong: number;
  lastReview: string;
  nextReview: string;
}

export interface ReadSession {
  date: string;
  slug: string;
  title: string;
  mode: string;
  words: number;
  ms: number;
  /** 청취 커버리지(0~1) — 검증 완독 여부의 근거 */
  coverage?: number;
}

interface ProgressState {
  xp: number;
  streak: number;
  longestStreak: number;
  lastActiveDate: string;
  todayDate: string;
  todayWords: number;
  todayXp: number;
  dailyGoal: number;
  booksFinished: string[]; // slug
  bookReads: Record<string, number>; // slug → 완독 도장 횟수(0~10)
  booksCompleted: string[]; // 10회 도장 달성한 slug
  sessions: ReadSession[]; // 최근 50
  leitner: Record<string, LeitnerCard>; // key: english(lowercase)
  achievements: string[]; // unlocked id

  /* ── 검증 학습(Verified Learning) 확장 ── */
  /** 날짜별 학습 통계 (최근 60일) */
  daily: Record<string, DayStat>;
  /** 책별 이해 퀴즈 통과 여부 */
  quizPassed: Record<string, boolean>;
  /** 책별 쉐도잉 사다리 단계(1~5) */
  shadowStep: Record<string, number>;
  /** 쉐도잉으로 따라 말한 누적 문장 수 */
  shadowTotal: number;
  /** 스트릭 프리즈(결석 면제권) 보유 수 */
  freezes: number;
  /** 퀘스트 보너스를 이미 받은 날짜 */
  questBonusDate: string;
  /** 레벨 진단 결과(0 = 미실시) */
  placementLevel: number;
  /** 온보딩 완료 여부 */
  onboarded: boolean;

  setDailyGoal: (n: number) => void;
  recordWord: (english: string, correct: boolean, awardXp?: boolean) => void;
  recordReading: (s: Omit<ReadSession, "date">) => void;
  finishBook: (slug: string) => void;
  /** 완독 도장 +1 — 호출 전 evaluateStamp 로 검증할 것 */
  addBookRead: (slug: string) => void;
  recordShadow: (sentences: number) => void;
  setQuizPassed: (slug: string, passed: boolean) => void;
  setShadowStep: (slug: string, step: number) => void;
  setPlacementLevel: (lv: number) => void;
  setOnboarded: (v: boolean) => void;
  resetAll: () => void;
}

/* ───────── 업적 ───────── */
export interface Achievement {
  id: string;
  title: string;
  emoji: string;
  desc: string;
  check: (s: ProgressState) => boolean;
}
export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-word", title: "첫 단어", emoji: "🌱", desc: "첫 단어를 학습했어요", check: (s) => masteredCount(s) + reviewingCount(s) >= 1 },
  { id: "words-25", title: "단어 수집가", emoji: "📚", desc: "25개 단어 학습", check: (s) => studiedCount(s) >= 25 },
  { id: "words-100", title: "단어 마스터", emoji: "🏆", desc: "100개 단어 학습", check: (s) => studiedCount(s) >= 100 },
  { id: "mastered-25", title: "확실히 외웠어", emoji: "💎", desc: "25개 단어 마스터(박스5)", check: (s) => masteredCount(s) >= 25 },
  { id: "streak-3", title: "3일 연속", emoji: "🔥", desc: "3일 연속 학습", check: (s) => s.longestStreak >= 3 },
  { id: "streak-7", title: "일주일 개근", emoji: "⚡", desc: "7일 연속 학습", check: (s) => s.longestStreak >= 7 },
  { id: "book-1", title: "첫 완독", emoji: "📖", desc: "책 1권 끝까지 읽기", check: (s) => s.booksFinished.length >= 1 },
  { id: "book-5", title: "책벌레", emoji: "🐛", desc: "책 5권 완독", check: (s) => s.booksFinished.length >= 5 },
  { id: "book-all", title: "서재 정복", emoji: "👑", desc: "10권 모두 완독", check: (s) => s.booksFinished.length >= 10 },
  { id: "reread-10", title: "열 번 읽기", emoji: "🔁", desc: "한 책을 10번 읽어 완료", check: (s) => (s.booksCompleted?.length ?? 0) >= 1 },
  { id: "complete-5", title: "도장 부자", emoji: "🎖️", desc: "5권 완독 도장 완료", check: (s) => (s.booksCompleted?.length ?? 0) >= 5 },
  { id: "complete-20", title: "도장 대왕", emoji: "🏵️", desc: "20권 완독 도장 완료", check: (s) => (s.booksCompleted?.length ?? 0) >= 20 },
  { id: "book-30", title: "독서 여행가", emoji: "✈️", desc: "30권 끝까지 읽기", check: (s) => s.booksFinished.length >= 30 },
  { id: "streak-14", title: "2주 연속", emoji: "🌟", desc: "14일 연속 학습", check: (s) => s.longestStreak >= 14 },
  { id: "streak-30", title: "한 달 개근", emoji: "🏅", desc: "30일 연속 학습", check: (s) => s.longestStreak >= 30 },
  { id: "words-300", title: "단어 부자", emoji: "💰", desc: "300개 단어 학습", check: (s) => studiedCount(s) >= 300 },
  { id: "xp-500", title: "성장 중", emoji: "🚀", desc: "XP 500 달성", check: (s) => s.xp >= 500 },
  { id: "xp-2000", title: "영어 고수", emoji: "🌟", desc: "XP 2000 달성", check: (s) => s.xp >= 2000 },
  { id: "xp-5000", title: "영어 챔피언", emoji: "🏆", desc: "XP 5000 달성", check: (s) => s.xp >= 5000 },
  /* 검증 학습 업적 */
  { id: "shadow-50", title: "쉐도잉 입문", emoji: "🗣️", desc: "쉐도잉 50문장", check: (s) => (s.shadowTotal ?? 0) >= 50 },
  { id: "shadow-300", title: "쉐도잉 고수", emoji: "🎧", desc: "쉐도잉 300문장", check: (s) => (s.shadowTotal ?? 0) >= 300 },
  { id: "shadow-blind", title: "블라인드 쉐도잉", emoji: "🕶️", desc: "글씨 없이 쉐도잉 5단계 도달", check: (s) => Object.values(s.shadowStep ?? {}).some((v) => v >= 5) },
  { id: "quiz-10", title: "이야기 박사", emoji: "🧠", desc: "이해 퀴즈 10권 통과", check: (s) => Object.values(s.quizPassed ?? {}).filter(Boolean).length >= 10 },
  { id: "quest-day", title: "퀘스트 올클리어", emoji: "🎯", desc: "하루 퀘스트 3개 모두 완료", check: (s) => !!s.questBonusDate },
];

export const studiedCount = (s: ProgressState) => Object.keys(s.leitner).length;
export const masteredCount = (s: ProgressState) =>
  Object.values(s.leitner).filter((c) => c.box >= 5).length;
export const reviewingCount = (s: ProgressState) =>
  Object.values(s.leitner).filter((c) => c.box < 5).length;

/** 오늘의 통계 (없으면 빈 값) */
export const todayStat = (s: ProgressState): DayStat =>
  s.daily?.[todayStr()] ?? emptyDay();

/** 최근 n일 통계 (오래된 → 최신 순) */
export function recentDays(
  s: ProgressState,
  n = 7,
): { date: string; stat: DayStat }[] {
  const out: { date: string; stat: DayStat }[] = [];
  const today = todayStr();
  for (let i = n - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    out.push({ date: d, stat: s.daily?.[d] ?? emptyDay() });
  }
  return out;
}

/** 새로 달성한 업적 id 머지 */
function unlock(s: ProgressState): string[] {
  const have = new Set(s.achievements);
  const next = [...s.achievements];
  for (const a of ACHIEVEMENTS)
    if (!have.has(a.id) && a.check(s)) next.push(a.id);
  return next;
}

/** 오늘 출석/스트릭 갱신 (활동 시 호출). 하루 결석은 프리즈로 메울 수 있다 */
function touchDay(s: ProgressState): Partial<ProgressState> {
  const today = todayStr();
  if (s.todayDate !== today) {
    // 날짜 바뀜 → 오늘 카운터 리셋
    s = { ...s, todayDate: today, todayWords: 0, todayXp: 0 };
  }
  let streak = s.streak;
  let longest = s.longestStreak;
  let freezes = s.freezes ?? 0;
  if (s.lastActiveDate !== today) {
    const gap = s.lastActiveDate ? diffDays(s.lastActiveDate, today) : 999;
    ({ streak, freezes } = nextStreak({ streak: s.streak, freezes }, gap));
    longest = Math.max(longest, streak);
  }
  return {
    todayDate: today,
    todayWords: s.todayDate !== today ? 0 : s.todayWords,
    todayXp: s.todayDate !== today ? 0 : s.todayXp,
    lastActiveDate: today,
    streak,
    longestStreak: longest,
    freezes,
  };
}

/** 오늘 일별 통계에 증분 반영 + 60일 초과분 정리 */
function bumpDay(
  daily: Record<string, DayStat>,
  patch: Partial<DayStat>,
): Record<string, DayStat> {
  const today = todayStr();
  const cur = daily?.[today] ?? emptyDay();
  const next: Record<string, DayStat> = {
    ...daily,
    [today]: {
      words: cur.words + (patch.words ?? 0),
      books: cur.books + (patch.books ?? 0),
      shadow: cur.shadow + (patch.shadow ?? 0),
      xp: cur.xp + (patch.xp ?? 0),
      minutes: cur.minutes + (patch.minutes ?? 0),
    },
  };
  const cutoff = addDays(today, -DAILY_KEEP);
  for (const k of Object.keys(next)) if (k < cutoff) delete next[k];
  return next;
}

/**
 * 퀘스트 3개를 모두 끝낸 날이면 보너스 XP + 스트릭 프리즈 1개를 준다(하루 1회).
 * merged 를 받아 보너스가 반영된 새 상태를 돌려준다.
 */
function applyQuestBonus(merged: ProgressState): ProgressState {
  const today = todayStr();
  if (merged.questBonusDate === today) return merged;
  const day = merged.daily?.[today] ?? emptyDay();
  if (!allQuestsDone(day)) return merged;
  return {
    ...merged,
    xp: merged.xp + QUEST_BONUS_XP,
    todayXp: merged.todayXp + QUEST_BONUS_XP,
    daily: bumpDay(merged.daily, { xp: QUEST_BONUS_XP }),
    freezes: Math.min(MAX_FREEZES, (merged.freezes ?? 0) + 1),
    questBonusDate: today,
  };
}

/** 활동 1건 반영 공통 파이프라인: 출석 → XP → 일별통계 → 퀘스트보너스 → 업적 */
function commit(
  s: ProgressState,
  opts: {
    xp?: number;
    day?: Partial<DayStat>;
    patch?: Partial<ProgressState>;
    /** 오늘 학습 단어 수 증분 (날짜가 바뀐 경우의 리셋을 반영해 계산) */
    todayWords?: number;
  },
): ProgressState {
  const dayUpdate = touchDay(s);
  const gained = opts.xp ?? 0;
  const base: ProgressState = {
    ...s,
    ...dayUpdate,
    ...opts.patch,
    xp: s.xp + gained,
    todayXp: (dayUpdate.todayXp ?? s.todayXp) + gained,
    todayWords: (dayUpdate.todayWords ?? s.todayWords) + (opts.todayWords ?? 0),
    daily: bumpDay(s.daily ?? {}, { ...opts.day, xp: gained }),
  };
  const bonused = applyQuestBonus(base);
  return { ...bonused, achievements: unlock(bonused) };
}

const initial = {
  xp: 0,
  streak: 0,
  longestStreak: 0,
  lastActiveDate: "",
  todayDate: todayStr(),
  todayWords: 0,
  todayXp: 0,
  dailyGoal: 10,
  booksFinished: [] as string[],
  bookReads: {} as Record<string, number>,
  booksCompleted: [] as string[],
  sessions: [] as ReadSession[],
  leitner: {} as Record<string, LeitnerCard>,
  achievements: [] as string[],
  daily: {} as Record<string, DayStat>,
  quizPassed: {} as Record<string, boolean>,
  shadowStep: {} as Record<string, number>,
  shadowTotal: 0,
  freezes: 0,
  questBonusDate: "",
  placementLevel: 0,
  onboarded: false,
};

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      ...initial,

      setDailyGoal: (n) => set({ dailyGoal: Math.max(5, Math.min(50, n)) }),

      /**
       * 단어 채점 결과 기록.
       * awardXp=false 면(너무 빠른 연타 등) 박스는 갱신하되 XP·퀘스트 진척은 주지 않는다.
       */
      recordWord: (english, correct, awardXp = true) =>
        set((s) => {
          const key = english.toLowerCase().trim();
          const today = todayStr();
          const prev = s.leitner[key];
          const box = correct ? Math.min(5, (prev?.box ?? 0) + 1) : 1;
          const card: LeitnerCard = {
            box,
            correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
            wrong: (prev?.wrong ?? 0) + (correct ? 0 : 1),
            lastReview: today,
            nextReview: addDays(today, boxIntervalDays(box)),
          };
          const gained = awardXp ? (correct ? 10 : 3) : 0;
          return commit(s, {
            xp: gained,
            day: { words: awardXp && correct ? 1 : 0 },
            todayWords: awardXp ? 1 : 0,
            patch: { leitner: { ...s.leitner, [key]: card } },
          });
        }),

      recordReading: (sess) =>
        set((s) => {
          const gained = 15 + Math.min(20, Math.round(sess.words / 3));
          const session: ReadSession = { ...sess, date: todayStr() };
          return commit(s, {
            xp: gained,
            day: { minutes: Math.round(sess.ms / 60000) },
            patch: { sessions: [session, ...s.sessions].slice(0, 50) },
          });
        }),

      finishBook: (slug) =>
        set((s) => {
          if (s.booksFinished.includes(slug)) return s;
          return commit(s, {
            xp: 50,
            patch: { booksFinished: [...s.booksFinished, slug] },
          });
        }),

      addBookRead: (slug) =>
        set((s) => {
          const reads = s.bookReads ?? {};
          const completedList = s.booksCompleted ?? [];
          const prev = reads[slug] ?? 0;
          if (prev >= READS_TO_COMPLETE) return s; // 이미 완료 — 변화 없음
          const next = prev + 1;
          const justCompleted =
            next >= READS_TO_COMPLETE && !completedList.includes(slug);
          return commit(s, {
            xp: justCompleted ? 30 : 5, // 도장 +5, 완료 보너스 +30
            day: { books: 1 },
            patch: {
              bookReads: { ...reads, [slug]: next },
              booksCompleted: justCompleted
                ? [...completedList, slug]
                : completedList,
            },
          });
        }),

      recordShadow: (sentences) =>
        set((s) => {
          if (sentences <= 0) return s;
          return commit(s, {
            xp: sentences * 2,
            day: { shadow: sentences },
            patch: { shadowTotal: (s.shadowTotal ?? 0) + sentences },
          });
        }),

      setQuizPassed: (slug, passed) =>
        set((s) => ({
          quizPassed: { ...(s.quizPassed ?? {}), [slug]: passed },
        })),

      setShadowStep: (slug, step) =>
        set((s) => ({
          shadowStep: {
            ...(s.shadowStep ?? {}),
            [slug]: Math.max(1, Math.min(5, step)),
          },
        })),

      setPlacementLevel: (lv) =>
        set({ placementLevel: Math.max(0, Math.min(5, lv)) }),

      setOnboarded: (onboarded) => set({ onboarded }),

      resetAll: () => set({ ...initial, todayDate: todayStr(), onboarded: true }),
    }),
    { name: "echotale-progress" },
  ),
);

/** 오늘 퀘스트 진행 상황 (UI 용) */
export function questStatus(s: ProgressState) {
  const day = todayStat(s);
  return DAILY_QUESTS.map((q) => ({
    ...q,
    done: day[q.key] >= q.target,
    current: Math.min(day[q.key], q.target),
  }));
}
