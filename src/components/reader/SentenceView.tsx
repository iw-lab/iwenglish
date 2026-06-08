"use client";

import { tokenizeWords } from "@/lib/utils";
import { WordChip } from "@/components/ui/WordChip";

/**
 * 문장을 단어 토큰으로 렌더. 단어 사이 공백/구두점은 보존.
 * - activeWord: 카라오케 하이라이트 토큰 인덱스
 * - wordTap: true 면 단어 탭으로 사전 팝오버
 */
export function SentenceView({
  text,
  activeWord = -1,
  wordTap = false,
}: {
  text: string;
  activeWord?: number;
  wordTap?: boolean;
}) {
  const tokens = tokenizeWords(text);
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  tokens.forEach((tok, i) => {
    if (tok.charStart > cursor) {
      parts.push(
        <span key={`gap-${i}`}>{text.slice(cursor, tok.charStart)}</span>,
      );
    }
    if (wordTap) {
      parts.push(
        <WordChip key={`w-${i}`} word={tok.word} active={i === activeWord} />,
      );
    } else {
      parts.push(
        <span key={`w-${i}`} className={i === activeWord ? "word-active" : undefined}>
          {tok.word}
        </span>,
      );
    }
    cursor = tok.charEnd;
  });
  if (cursor < text.length) {
    parts.push(<span key="tail">{text.slice(cursor)}</span>);
  }

  return <span className="reading-text">{parts}</span>;
}
