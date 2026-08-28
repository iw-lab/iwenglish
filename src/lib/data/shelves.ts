import type { BookSummary, CefrLevel } from "@/types/book";

/**
 * 서재 선반 정의 — 홈과 선반 페이지(`/shelf/[key]`)가 **같은 정의를 공유**한다.
 *
 * 왜 분리했나 — 홈이 352권을 한 번에 그리면 프리렌더 결과가 3.17MB가 되고(책 1권당
 * 약 8KB × Next 가 같은 데이터를 3~4벌 저장), 워커가 깨어날 때 그걸 통째로 읽다가
 * 간헐적으로 매달렸다(2026-08-28 실측). 홈은 선반별 앞부분만 그리고, 나머지는
 * 선반 페이지로 넘긴다. 두 곳이 각자 필터를 갖고 있으면 반드시 어긋나므로 여기 하나로 둔다.
 */

/** 홈에서 선반 하나에 그리는 최대 권수 — 넘으면 "전체 보기"로 선반 페이지에 넘긴다 */
export const HOME_SHELF_LIMIT = 10;

export type ShelfGroup = "picture" | "daily" | "myth";

export interface ShelfDef {
  /** URL 조각 — `/shelf/<key>` */
  key: string;
  group: ShelfGroup;
  emoji: string;
  label: string;
  /** 대상 학년 등 부가 설명 */
  grade: string;
  match: (b: BookSummary) => boolean;
}

const isPicture = (b: BookSummary) =>
  b.collection !== "daily" && b.collection !== "myth";

const LEVELS: { level: CefrLevel; emoji: string; label: string; grade: string }[] = [
  { level: "preA1", emoji: "🌱", label: "입문", grade: "3학년 시작 · 첫 영어" },
  { level: "A1", emoji: "📗", label: "기초", grade: "3–4학년" },
  { level: "A2", emoji: "📘", label: "발전", grade: "5학년" },
  { level: "B1", emoji: "📙", label: "심화", grade: "6학년" },
];

const STAGES: { stage: number; emoji: string; label: string; grade: string }[] = [
  { stage: 1, emoji: "🐣", label: "1단계 · 첫걸음", grade: "3학년" },
  { stage: 2, emoji: "🌿", label: "2단계 · 익숙해지기", grade: "3–4학년" },
  { stage: 3, emoji: "🚀", label: "3단계 · 자신감", grade: "4학년" },
  { stage: 4, emoji: "⛰️", label: "4단계 · 도전", grade: "4–5학년" },
  { stage: 5, emoji: "🌊", label: "5단계 · 실력 다지기", grade: "5학년" },
  { stage: 6, emoji: "🏆", label: "6단계 · 마스터", grade: "6학년" },
];

export const SHELVES: ShelfDef[] = [
  ...LEVELS.map(({ level, emoji, label, grade }) => ({
    key: `picture-${level}`,
    group: "picture" as const,
    emoji,
    label,
    grade: `${grade} · ${level}`,
    match: (b: BookSummary) => isPicture(b) && b.level === level,
  })),
  ...STAGES.map(({ stage, emoji, label, grade }) => ({
    key: `daily-${stage}`,
    group: "daily" as const,
    emoji,
    label,
    grade,
    match: (b: BookSummary) => b.collection === "daily" && b.stage === stage,
  })),
  {
    key: "myth",
    group: "myth",
    emoji: "🏛️",
    label: "그리스로마신화",
    grade: "하라의 신화 모험 · 학습만화 영어판",
    match: (b: BookSummary) => b.collection === "myth",
  },
];

export const getShelf = (key: string): ShelfDef | undefined =>
  SHELVES.find((s) => s.key === key);

/** 신화는 권 순서, 나머지는 시드 순서 그대로 */
export function shelfBooks(shelf: ShelfDef, books: BookSummary[]): BookSummary[] {
  const inShelf = books.filter(shelf.match);
  return shelf.group === "myth"
    ? [...inShelf].sort((a, b) => (a.stage ?? 0) - (b.stage ?? 0))
    : inShelf;
}

/** 신화 권별 부제 (카드 meta 표기용) */
export const MYTH_VOLUME_LABEL: Record<number, string> = {
  1: "1권 · 카오스와 태초의 신들",
  2: "2권 · 우라노스와 가이아의 시대",
};
