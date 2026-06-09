"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ───────── 유틸 ───────── */
const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays = (d: string, n: number) => {
  const t = new Date(d + "T00:00:00");
  t.setDate(t.getDate() + n);
  return t.toISOString().slice(0, 10);
};
const diffDays = (a: string, b: string) =>
  Math.round(
    (new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) /
      86400000,
  );

/** Leitner 박스별 복습 간격(일) */
const BOX_DAYS = [0, 1, 3, 7, 21];
/** 레벨업 곡선: 레벨 n 까지 누적 XP = 100 * n */
export const xpForLevel = (xp: number) => Math.floor(xp / 100) + 1;
export const levelFloor = (lvl: number) => (lvl - 1) * 100;

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

  setDailyGoal: (n: number) => void;
  recordWord: (english: string, correct: boolean) => void;
  recordReading: (s: Omit<ReadSession, "date">) => void;
  finishBook: (slug: string) => void;
  addBookRead: (slug: string) => void; // 완독 도장 +1, 10회면 완료
  resetAll: () => void;
}

/** 완독 완료까지 필요한 읽기(도장) 횟수 */
export const READS_TO_COMPLETE = 10;

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
  { id: "xp-500", title: "성장 중", emoji: "🚀", desc: "XP 500 달성", check: (s) => s.xp >= 500 },
  { id: "xp-2000", title: "영어 고수", emoji: "🌟", desc: "XP 2000 달성", check: (s) => s.xp >= 2000 },
];

export const studiedCount = (s: ProgressState) => Object.keys(s.leitner).length;
export const masteredCount = (s: ProgressState) =>
  Object.values(s.leitner).filter((c) => c.box >= 5).length;
export const reviewingCount = (s: ProgressState) =>
  Object.values(s.leitner).filter((c) => c.box < 5).length;

/** 새로 달성한 업적 id 머지 */
function unlock(s: ProgressState): string[] {
  const have = new Set(s.achievements);
  const next = [...s.achievements];
  for (const a of ACHIEVEMENTS)
    if (!have.has(a.id) && a.check(s)) next.push(a.id);
  return next;
}

/** 오늘 출석/스트릭 갱신 (활동 시 호출) */
function touchDay(s: ProgressState): Partial<ProgressState> {
  const today = todayStr();
  if (s.todayDate !== today) {
    // 날짜 바뀜 → 오늘 카운터 리셋
    s = { ...s, todayDate: today, todayWords: 0, todayXp: 0 };
  }
  let streak = s.streak;
  let longest = s.longestStreak;
  if (s.lastActiveDate !== today) {
    const gap = s.lastActiveDate ? diffDays(s.lastActiveDate, today) : 999;
    streak = gap === 1 ? s.streak + 1 : 1;
    longest = Math.max(longest, streak);
  }
  return {
    todayDate: today,
    todayWords: s.todayDate !== today ? 0 : s.todayWords,
    todayXp: s.todayDate !== today ? 0 : s.todayXp,
    lastActiveDate: today,
    streak,
    longestStreak: longest,
  };
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      xp: 0,
      streak: 0,
      longestStreak: 0,
      lastActiveDate: "",
      todayDate: todayStr(),
      todayWords: 0,
      todayXp: 0,
      dailyGoal: 10,
      booksFinished: [],
      bookReads: {},
      booksCompleted: [],
      sessions: [],
      leitner: {},
      achievements: [],

      setDailyGoal: (n) => set({ dailyGoal: Math.max(5, Math.min(50, n)) }),

      recordWord: (english, correct) =>
        set((s) => {
          const key = english.toLowerCase().trim();
          const day = touchDay(s);
          const today = todayStr();
          const prev = s.leitner[key];
          const box = correct
            ? Math.min(5, (prev?.box ?? 0) + 1)
            : 1;
          const card: LeitnerCard = {
            box,
            correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
            wrong: (prev?.wrong ?? 0) + (correct ? 0 : 1),
            lastReview: today,
            nextReview: addDays(today, BOX_DAYS[box - 1]),
          };
          const gained = correct ? 10 : 3;
          const merged: ProgressState = {
            ...s,
            ...day,
            xp: s.xp + gained,
            todayXp: (day.todayXp ?? s.todayXp) + gained,
            todayWords: (day.todayWords ?? s.todayWords) + 1,
            leitner: { ...s.leitner, [key]: card },
          };
          return { ...merged, achievements: unlock(merged) };
        }),

      recordReading: (sess) =>
        set((s) => {
          const day = touchDay(s);
          const gained = 15 + Math.min(20, Math.round(sess.words / 3));
          const session: ReadSession = { ...sess, date: todayStr() };
          const merged: ProgressState = {
            ...s,
            ...day,
            xp: s.xp + gained,
            todayXp: (day.todayXp ?? s.todayXp) + gained,
            sessions: [session, ...s.sessions].slice(0, 50),
          };
          return { ...merged, achievements: unlock(merged) };
        }),

      finishBook: (slug) =>
        set((s) => {
          if (s.booksFinished.includes(slug)) return s;
          const day = touchDay(s);
          const merged: ProgressState = {
            ...s,
            ...day,
            xp: s.xp + 50,
            todayXp: (day.todayXp ?? s.todayXp) + 50,
            booksFinished: [...s.booksFinished, slug],
          };
          return { ...merged, achievements: unlock(merged) };
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
          const day = touchDay(s);
          const gained = justCompleted ? 30 : 5; // 도장 +5, 완료 보너스 +30
          const merged: ProgressState = {
            ...s,
            ...day,
            xp: s.xp + gained,
            todayXp: (day.todayXp ?? s.todayXp) + gained,
            bookReads: { ...reads, [slug]: next },
            booksCompleted: justCompleted
              ? [...completedList, slug]
              : completedList,
          };
          return { ...merged, achievements: unlock(merged) };
        }),

      resetAll: () =>
        set({
          xp: 0,
          streak: 0,
          longestStreak: 0,
          lastActiveDate: "",
          todayDate: todayStr(),
          todayWords: 0,
          todayXp: 0,
          booksFinished: [],
          bookReads: {},
          booksCompleted: [],
          sessions: [],
          leitner: {},
          achievements: [],
        }),
    }),
    { name: "echotale-progress" },
  ),
);
