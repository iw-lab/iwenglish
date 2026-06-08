import type { CefrLevel, AgeBand } from "@/types/book";

/**
 * 출간 예정 그림책 카탈로그 (Phase 3 에서 codex imagegen + Gemini + Azure 로 실제 생성·시드).
 * 골격 모드 서재에서 "준비 중" 카드로 노출 — 학습 데이터가 아닌 기획 메타데이터.
 */
export interface PlannedBook {
  slug: string;
  title: string;
  title_ko: string;
  level: CefrLevel;
  ageBand: AgeBand;
  summary_ko: string;
  sentences: number;
}

export const PLANNED_BOOKS: PlannedBook[] = [
  { slug: "luna-and-the-lost-star", title: "Luna and the Lost Star", title_ko: "루나와 잃어버린 별", level: "preA1", ageBand: "5-7", summary_ko: "작은 여우 루나가 밤하늘에서 떨어진 별을 다시 집으로 보내주는 이야기.", sentences: 14 },
  { slug: "the-brave-little-boat", title: "The Brave Little Boat", title_ko: "용감한 작은 배", level: "preA1", ageBand: "5-7", summary_ko: "겁 많던 작은 배가 폭풍을 만나 진짜 용기를 배우는 항해.", sentences: 14 },
  { slug: "where-is-my-hat", title: "Where Is My Hat?", title_ko: "내 모자 어디 있지?", level: "preA1", ageBand: "5-7", summary_ko: "사라진 빨간 모자를 찾아 숲속 친구들을 차례로 만나는 술래잡기.", sentences: 12 },
  { slug: "a-rainy-day-friend", title: "A Rainy Day Friend", title_ko: "비 오는 날의 친구", level: "A1", ageBand: "8-10", summary_ko: "비를 싫어하던 아이가 우산을 나눠 쓰며 새 친구를 사귀는 하루.", sentences: 18 },
  { slug: "the-garden-that-sang", title: "The Garden That Sang", title_ko: "노래하는 정원", level: "A1", ageBand: "8-10", summary_ko: "할머니의 씨앗을 심자 정원이 노래를 부르기 시작한다.", sentences: 18 },
  { slug: "tigers-first-school-day", title: "Tiger's First School Day", title_ko: "호랑이의 첫 등교", level: "A1", ageBand: "8-10", summary_ko: "긴장한 아기 호랑이가 새 학교에서 첫 친구를 만나는 날.", sentences: 20 },
  { slug: "the-moons-lullaby", title: "The Moon's Lullaby", title_ko: "달의 자장가", level: "A2", ageBand: "8-10", summary_ko: "잠들지 못하는 마을을 위해 달이 직접 자장가를 들려준다.", sentences: 22 },
  { slug: "pip-the-curious-penguin", title: "Pip the Curious Penguin", title_ko: "호기심 많은 펭귄 핍", level: "A2", ageBand: "8-10", summary_ko: "남극 너머가 궁금한 펭귄 핍의 용감한 모험과 귀환.", sentences: 22 },
  { slug: "grandpas-magic-garden", title: "Grandpa's Magic Garden", title_ko: "할아버지의 마법 정원", level: "B1", ageBand: "11-13", summary_ko: "할아버지가 남긴 정원의 비밀을 풀며 가족의 기억을 되찾는 이야기.", sentences: 24 },
  { slug: "the-kite-and-the-wind", title: "The Kite and the Wind", title_ko: "연과 바람", level: "B1", ageBand: "11-13", summary_ko: "자유를 꿈꾸던 연과 변덕스러운 바람이 나누는 우정과 이별.", sentences: 24 },
];
