"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, NotebookPen, BookOpen } from "lucide-react";
import { useWordbook } from "@/store/wordbook";
import { AudioButton } from "@/components/ui/AudioButton";
import { Card } from "@/components/ui/Card";

export function WordbookList() {
  const items = useWordbook((s) => s.items);
  const remove = useWordbook((s) => s.remove);
  const clear = useWordbook((s) => s.clear);
  // localStorage 하이드레이션 후 렌더(SSR 불일치 방지)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  if (!mounted)
    return <div className="h-24 animate-pulse rounded-card bg-muted/40" />;

  if (items.length === 0)
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <NotebookPen className="h-8 w-8 text-muted-foreground" />
        <p className="font-ko text-sm text-muted-foreground">
          아직 모은 단어가 없어요.
          <br />책을 읽다가 단어를 탭하고{" "}
          <span className="font-semibold text-accent">단어장 추가</span>를
          눌러보세요.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-chip bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <BookOpen className="h-4 w-4" /> 서재로 가기
        </Link>
      </Card>
    );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-muted-foreground">
          모은 단어 {items.length}개
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/learn"
            className="inline-flex items-center gap-1.5 rounded-chip bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground hover:brightness-95"
          >
            <BookOpen className="h-4 w-4" /> 카드로 학습하기
          </Link>
          <button
            onClick={() => {
              if (confirm("단어장을 모두 비울까요?")) clear();
            }}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            비우기
          </button>
        </div>
      </div>

      <ul className="space-y-2.5 sm:grid sm:grid-cols-2 sm:gap-2.5 sm:space-y-0 lg:grid-cols-3">
        {items.map((w) => (
          <li key={w.text}>
            <Card className="flex items-start gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{w.text}</span>
                  <AudioButton
                    src={w.audioUrl}
                    text={w.text}
                    size="sm"
                    label={`${w.text} 발음`}
                  />
                  {w.pos && (
                    <span className="text-xs text-muted-foreground">
                      {w.ipa} · {w.pos}
                    </span>
                  )}
                </div>
                {w.meaning_ko && (
                  <p className="mt-0.5 font-ko text-base">{w.meaning_ko}</p>
                )}
                {w.example_en && (
                  <p className="mt-1 rounded-md bg-muted px-2 py-1 text-sm">
                    {w.example_en}
                    {w.example_ko && (
                      <span className="block font-ko text-muted-foreground">
                        {w.example_ko}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <button
                onClick={() => remove(w.text)}
                aria-label={`${w.text} 삭제`}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-bad"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
