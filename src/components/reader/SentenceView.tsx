"use client";

import { tokenizeWords, cn } from "@/lib/utils";
import { WordChip } from "@/components/ui/WordChip";

/**
 * 문장을 단어 토큰으로 렌더. 단어 사이 공백/구두점은 보존.
 * - activeWord: 원어민이 지금 읽는 토큰 (노랑 하이라이트)
 * - echoWord: 쉐도잉에서 "내가 지금 말할" 토큰 (코랄 밑줄) — 항상 activeWord 이하
 * - wordTap: true 면 단어 탭으로 사전 팝오버
 * - hidden: 블라인드 쉐도잉 — 글자를 가리고 자리만 남긴다
 */
export function SentenceView({
  text,
  activeWord = -1,
  echoWord = -1,
  wordTap = false,
  hidden = false,
}: {
  text: string;
  activeWord?: number;
  echoWord?: number;
  wordTap?: boolean;
  hidden?: boolean;
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
    if (hidden) {
      // 블라인드: 글자는 가리고 단어 길이만큼 자리 표시 — 지금 말할 단어만 색으로 알려줌
      parts.push(
        <span
          key={`w-${i}`}
          aria-hidden
          className={cn(
            "mx-[0.06em] inline-block rounded-[0.35rem] align-middle",
            i === echoWord ? "bg-accent" : "bg-muted-foreground/25",
          )}
          style={{ width: `${Math.max(1, tok.word.length) * 0.52}em`, height: "0.72em" }}
        />,
      );
    } else if (wordTap) {
      parts.push(
        <WordChip
          key={`w-${i}`}
          word={tok.word}
          active={i === activeWord}
          echo={i === echoWord}
        />,
      );
    } else {
      parts.push(
        <span
          key={`w-${i}`}
          className={cn(
            i === activeWord && "word-active",
            i === echoWord && "word-echo",
          )}
        >
          {tok.word}
        </span>,
      );
    }
    cursor = tok.charEnd;
  });
  if (cursor < text.length && !hidden) {
    parts.push(<span key="tail">{text.slice(cursor)}</span>);
  }

  return (
    <span className="reading-text">
      {parts}
      {hidden && <span className="sr-only">{text}</span>}
    </span>
  );
}
