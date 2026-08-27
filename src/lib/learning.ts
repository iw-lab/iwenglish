/**
 * 학습 무결성(Verified Learning) · 쉐도잉 엔진의 순수 코어.
 *
 * UI·스토어에 의존하지 않는 계산만 모아 유닛 테스트로 불변식을 강제한다.
 * - 도장(완독)은 "실제로 들은 문장 비율"이 기준을 넘어야만 찍힌다.
 * - 쉐도잉 에코 인덱스는 항상 원어민 인덱스보다 뒤처진다.
 */

import type { WordTiming } from "@/types/book";

/* ───────────────────────── 날짜 (로컬 기준) ───────────────────────── */

/**
 * Date → "YYYY-MM-DD" (사용자 로컬 시간 기준).
 *
 * ⚠️ toISOString() 을 쓰면 UTC 로 변환되어 KST(+9)에서는 자정~09시 사이,
 * 그리고 "로컬 자정"으로 만든 Date 는 언제나 전날로 밀린다.
 * 학습 기록·복습 예정일은 전부 아이가 사는 지역의 날짜여야 하므로 로컬로 포맷한다.
 */
export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 오늘 날짜 "YYYY-MM-DD" (로컬) */
export const todayISO = (): string => ymd(new Date());

/** "YYYY-MM-DD" 에 n일 더한 날짜 (로컬) */
export function addDaysISO(date: string, n: number): string {
  const t = new Date(date + "T00:00:00");
  t.setDate(t.getDate() + n);
  return ymd(t);
}

/** 두 날짜 사이의 일수 (b - a) */
export function diffDaysISO(a: string, b: string): number {
  return Math.round(
    (new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) /
      86400000,
  );
}

/* ───────────────────────── 무결성 상수 ───────────────────────── */

/** 완독 도장에 필요한 최소 청취 커버리지(90%) */
export const MIN_COVERAGE = 0.9;
/** 마지막(완료) 도장에 필요한 최소 퀴즈 정답률(80%) */
export const QUIZ_PASS_RATIO = 0.8;
/** 완독 완료까지 필요한 도장 수 */
export const READS_TO_COMPLETE = 10;
/** 단어 문제 최소 응답 시간(ms) — 이보다 빠른 연타는 XP 미지급 */
export const MIN_ANSWER_MS = 700;

/* ───────────────────────── 커버리지 ───────────────────────── */

/** 들은 문장 수 / 전체 문장 수 (0~1). 전체가 0이면 0 */
export function coverageRatio(heard: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, heard / total);
}

/**
 * `after` 다음(순서상)으로 아직 듣지 않은 문장의 인덱스. 없으면 -1.
 * "안 들은 문장만 이어 듣기"가 이미 들은 문장을 건너뛰는 근거.
 */
export function nextUnheardIndex(
  ids: readonly string[],
  heard: ReadonlySet<string>,
  after = -1,
): number {
  for (let i = after + 1; i < ids.length; i++) {
    if (!heard.has(ids[i])) return i;
  }
  return -1;
}

export interface UnheardPage {
  /** 0-based 쪽 번호 */
  pageIdx: number;
  /** 그 쪽에서 아직 안 들은 문장 수 */
  count: number;
  /** 그 쪽 첫 미청취 문장의 전체(flat) 인덱스 — 탭하면 여기로 점프 */
  firstIndex: number;
}

/**
 * 미청취 문장을 쪽 단위로 묶는다 — "어디를 안 들었는지" 지도.
 * 학생에게 개수만 알려 주면 어디를 다시 들어야 할지 몰라 책을 통째로 다시 듣게 된다.
 */
export function unheardByPage(
  flat: readonly { id: string; pageIdx: number }[],
  heard: ReadonlySet<string>,
): UnheardPage[] {
  const out: UnheardPage[] = [];
  for (let i = 0; i < flat.length; i++) {
    const f = flat[i];
    if (heard.has(f.id)) continue;
    const last = out[out.length - 1];
    if (last && last.pageIdx === f.pageIdx) last.count += 1;
    else out.push({ pageIdx: f.pageIdx, count: 1, firstIndex: i });
  }
  return out;
}

export type StampBlock = "ok" | "coverage" | "quiz" | "already";

export interface StampVerdict {
  /** 도장을 찍을 수 있는가 */
  ok: boolean;
  reason: StampBlock;
  /** 0~1 */
  coverage: number;
  /** 아직 듣지 않은 문장 수 */
  missing: number;
  /** 이번이 마지막(완료) 도장인가 */
  isFinalStamp: boolean;
}

/**
 * 완독 도장 게이트 — 이 함수가 false 를 주면 어떤 경로로도 도장이 찍히면 안 된다.
 *
 * 규칙
 *  1. 이미 완료(10회)한 책이면 더 못 찍는다.
 *  2. 들은 문장이 90% 미만이면 못 찍는다. (페이지 점프·스킵 차단)
 *  3. 마지막 10번째 도장은 이해 퀴즈를 통과해야 찍힌다. (퀴즈가 있는 책만)
 */
export function evaluateStamp(p: {
  heard: number;
  total: number;
  readCount: number;
  completed: boolean;
  hasQuiz: boolean;
  quizPassed: boolean;
}): StampVerdict {
  const coverage = coverageRatio(p.heard, p.total);
  const missing = Math.max(0, p.total - p.heard);
  const isFinalStamp = p.readCount === READS_TO_COMPLETE - 1;
  const base = { coverage, missing, isFinalStamp };

  if (p.completed || p.readCount >= READS_TO_COMPLETE)
    return { ok: false, reason: "already", ...base };
  if (coverage < MIN_COVERAGE) return { ok: false, reason: "coverage", ...base };
  if (isFinalStamp && p.hasQuiz && !p.quizPassed)
    return { ok: false, reason: "quiz", ...base };
  return { ok: true, reason: "ok", ...base };
}

/** 퀴즈 통과 판정 */
export function isQuizPassed(score: number, total: number): boolean {
  if (total <= 0) return false;
  return score / total >= QUIZ_PASS_RATIO;
}

/* ───────────────────────── 쉐도잉 엔진 ───────────────────────── */

/**
 * ms 시점에 하이라이트할 토큰 인덱스.
 * startMs <= ms 인 마지막 토큰(= 다음 단어 시작 전까지 유지). 없으면 -1.
 */
export function wordIndexAt(timings: WordTiming[], ms: number): number {
  let idx = -1;
  for (let i = 0; i < timings.length; i++) {
    if (timings[i].startMs <= ms) idx = i;
    else break;
  }
  return idx;
}

/**
 * 쉐도잉 "내 차례" 인덱스 — 원어민보다 delayMs 만큼 뒤처진 위치.
 * delayMs >= 0 이므로 언제나 wordIndexAt(timings, ms) 이하가 보장된다.
 */
export function echoIndexAt(
  timings: WordTiming[],
  ms: number,
  delayMs: number,
): number {
  return wordIndexAt(timings, ms - Math.max(0, delayMs));
}

export interface ShadowStep {
  id: number;
  emoji: string;
  name: string;
  desc: string;
  /** null = 에코 트랙 없음(듣기 전용) */
  delayMs: number | null;
  /** 본문 텍스트를 가리는가(블라인드 쉐도잉) */
  hideText: boolean;
  /** 원어민 음성 볼륨(내 목소리가 들리도록 감쇠) */
  volume: number;
}

/**
 * 쉐도잉 사다리 — Hamada(2016) 단계적 쉐도잉을 5단계로 압축.
 * 뒤로 갈수록 지연이 짧아지고(=진짜 쉐도잉에 가까워지고) 텍스트 도움이 사라진다.
 */
export const SHADOW_STEPS: ShadowStep[] = [
  {
    id: 1,
    emoji: "👂",
    name: "듣기",
    desc: "먼저 귀로만 들어요. 입은 소리 없이 따라 움직여도 좋아요.",
    delayMs: null,
    hideText: false,
    volume: 1,
  },
  {
    id: 2,
    emoji: "👫",
    name: "같이 읽기",
    desc: "원어민과 동시에 읽어요. 주황 글씨가 노란 칸과 같이 움직여요.",
    delayMs: 0,
    hideText: false,
    volume: 0.85,
  },
  {
    id: 3,
    emoji: "🐢",
    name: "느린 쉐도잉",
    desc: "한 단어 반쯤 뒤에서 따라가요. 주황 글씨를 소리 내어 읽어요.",
    delayMs: 800,
    hideText: false,
    volume: 0.6,
  },
  {
    id: 4,
    emoji: "🐇",
    name: "표준 쉐도잉",
    desc: "딱 한 단어 뒤에서 따라가요. 진짜 쉐도잉이에요!",
    delayMs: 450,
    hideText: false,
    volume: 0.5,
  },
  {
    id: 5,
    emoji: "🕶️",
    name: "블라인드",
    desc: "글씨 없이 귀로만 듣고 따라 말해요. 최고 단계!",
    delayMs: 300,
    hideText: true,
    volume: 0.45,
  },
];

export const shadowStep = (id: number): ShadowStep =>
  SHADOW_STEPS.find((s) => s.id === id) ?? SHADOW_STEPS[0];

/* ───────────────────────── 데일리 퀘스트 ───────────────────────── */

export interface DayStat {
  /** 객관식으로 맞힌 단어 수 */
  words: number;
  /** 검증 완독(도장) 수 */
  books: number;
  /** 쉐도잉으로 따라 말한 문장 수 */
  shadow: number;
  /** 획득 XP */
  xp: number;
  /** 학습 시간(분) */
  minutes: number;
}

export const emptyDay = (): DayStat => ({
  words: 0,
  books: 0,
  shadow: 0,
  xp: 0,
  minutes: 0,
});

export interface QuestDef {
  id: string;
  emoji: string;
  title: string;
  target: number;
  unit: string;
  key: "books" | "words" | "shadow";
}

export const DAILY_QUESTS: QuestDef[] = [
  {
    id: "q-book",
    emoji: "📖",
    title: "책 1권 끝까지 읽기",
    target: 1,
    unit: "권",
    key: "books",
  },
  {
    id: "q-word",
    emoji: "🔤",
    title: "단어 10개 맞히기",
    target: 10,
    unit: "개",
    key: "words",
  },
  {
    id: "q-shadow",
    emoji: "🗣️",
    title: "쉐도잉 5문장",
    target: 5,
    unit: "문장",
    key: "shadow",
  },
];

/** 퀘스트 3개를 모두 끝냈는가 */
export function allQuestsDone(day: DayStat): boolean {
  return DAILY_QUESTS.every((q) => day[q.key] >= q.target);
}

/** 퀘스트 완주 보너스 XP */
export const QUEST_BONUS_XP = 40;
/** 스트릭 프리즈 최대 보유 수 */
export const MAX_FREEZES = 3;
