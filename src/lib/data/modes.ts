import type { LearningMode } from "@/types/book";

export interface ModeInfo {
  id: LearningMode;
  emoji: string;
  title: string;
  subtitle: string;
  desc: string;
  principle: string;
}

/** 5대 학습 모드 — SLA 원리 매핑 */
export const MODES: ModeInfo[] = [
  {
    id: "read-aloud",
    emoji: "📖",
    title: "쭉 읽어주기",
    subtitle: "Read-Aloud",
    desc: "원어민 낭독을 들으며 현재 읽는 단어가 카라오케처럼 하이라이트. 페이지가 자동으로 넘어가요.",
    principle: "이해가능입력(i+1) · 멀티모달",
  },
  {
    id: "sentence",
    emoji: "💬",
    title: "한 문장씩",
    subtitle: "Sentence Mode",
    desc: "문장을 탭해 한 문장만 반복. 한글 번역 토글과 느리게 듣기로 꼼꼼하게.",
    principle: "Noticing · 청크 학습",
  },
  {
    id: "word-tap",
    emoji: "👆",
    title: "단어 탭",
    subtitle: "Word Tap",
    desc: "모르는 단어를 탭하면 뜻·발음·예문이 바로. 단어장에 담아 SRS 복습.",
    principle: "어휘 자동화 · 간격반복",
  },
  {
    id: "shadowing",
    emoji: "🎙️",
    title: "쉐도잉",
    subtitle: "Shadowing",
    desc: "6단계 사다리로 따라 말하고 발음을 점수로 확인. 내 목소리 vs 원어민 비교.",
    principle: "출력가설 · Shadowing(Hamada)",
  },
  {
    id: "read-yourself",
    emoji: "🌟",
    title: "따라 읽기",
    subtitle: "Read-It-Yourself",
    desc: "한 페이지를 통째로 낭독하고 유창성·정확도·WPM 평가. 별점과 배지를 모아요.",
    principle: "자동화 · 유창성",
  },
];
