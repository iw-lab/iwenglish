"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Check, Loader2 } from "lucide-react";
import { cn, normalizeWord } from "@/lib/utils";
import { speak } from "@/lib/speech";
import { useWordbook } from "@/store/wordbook";
import { getDictWord } from "@/lib/dict";
import { AudioButton } from "./AudioButton";
import type { Word } from "@/types/book";

/**
 * 본문 단어 — 탭하면 뜻·IPA·발음·예문 팝오버 + 단어장 추가.
 * 데이터는 /api/word 에서 가져온다(없으면 런타임 사전 조회·캐시).
 */
export function WordChip({
  word,
  active,
  className,
}: {
  word: string;
  active?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Word | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);
  const playedRef = useRef(false);
  // 팝오버를 body 로 포탈 → 부모 문장의 opacity/overflow 영향 제거(불투명 보장)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );

  const key = normalizeWord(word);
  const tappable = key.length > 0;

  // 로컬 단어장(localStorage) — 로그인/DB 없이 동작
  const addWord = useWordbook((s) => s.add);
  const removeWord = useWordbook((s) => s.remove);
  const added = useWordbook((s) => s.items.some((w) => w.text === key));

  const ensureData = () => {
    if (data || loading || !tappable) return;
    setLoading(true);
    // ① 정적 사전(/dict.json, 캐시) 우선 — 서버 호출 0
    getDictWord(key)
      .then((local) => {
        if (local) {
          setData(local);
          setLoading(false);
          return;
        }
        // ② 사전에 없으면 그때만 /api/word
        return fetch(`/api/word?w=${encodeURIComponent(key)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d: Word | null) => setData(d))
          .finally(() => setLoading(false));
      })
      .catch(() => {
        setData(null);
        setLoading(false);
      });
  };

  /** 발음 1회 재생 — 생성된 mp3 우선, 없으면 Web Speech */
  const playPronunciation = (d: Word) => {
    if (d.audioUrl) {
      const a = new Audio(d.audioUrl);
      a.play().catch(() => speak(d.text));
    } else {
      speak(d.text);
    }
  };

  const toggle = () => {
    setOpen((o) => {
      const next = !o;
      if (next) {
        ensureData();
        // 단어 위치 기준으로 화면 좌표 계산(뷰포트 안으로 클램프)
        const r = ref.current?.getBoundingClientRect();
        if (r) {
          const half = 128; // 팝오버 너비(256)/2
          const left = Math.min(
            window.innerWidth - half - 8,
            Math.max(half + 8, r.left + r.width / 2),
          );
          setCoords({ top: r.bottom + 8, left });
        }
      }
      return next;
    });
  };

  // 팝오버가 열리고 데이터가 준비되면 발음을 1회 자동 재생
  useEffect(() => {
    if (open && data && !playedRef.current) {
      playedRef.current = true;
      playPronunciation(data);
    }
    if (!open) playedRef.current = false;
  }, [open, data]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(t) &&
        popRef.current &&
        !popRef.current.contains(t)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggleWordbook = () => {
    if (added) {
      removeWord(key);
      return;
    }
    addWord({
      text: key,
      lemma: data?.lemma || key,
      ipa: data?.ipa ?? "",
      pos: data?.pos ?? "",
      meaning_ko: data?.meaning_ko ?? "",
      example_en: data?.example_en ?? "",
      example_ko: data?.example_ko ?? "",
      audioUrl: data?.audioUrl ?? "",
    });
    // 비로그인이라도 로그인 사용자면 서버에도 best-effort 동기화
    fetch("/api/wordbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: key }),
    }).catch(() => {});
  };

  if (!tappable) return <span className={className}>{word}</span>;

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        className={cn(
          "rounded-[0.35rem] px-0.5 transition-colors hover:bg-primary/15",
          active && "word-active",
          className,
        )}
      >
        {word}
      </button>

      {open &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
        <span
          ref={popRef}
          role="dialog"
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            transform: "translateX(-50%)",
            backgroundColor: "var(--card)",
          }}
          className="z-50 block w-64 -translate-x-1/2 rounded-card border border-border p-3 text-left shadow-2xl ring-1 ring-black/10"
        >
          {loading ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> 사전 찾는 중…
            </span>
          ) : data ? (
            <span className="block space-y-1.5">
              <span className="flex items-center justify-between gap-2">
                <span className="text-lg font-bold">{data.text}</span>
                <AudioButton
                  src={data.audioUrl}
                  text={data.text}
                  size="sm"
                  label={`${data.text} 발음`}
                />
              </span>
              {data.ipa && (
                <span className="block text-sm text-muted-foreground">
                  {data.ipa} · {data.pos}
                </span>
              )}
              <span className="block font-ko text-base">{data.meaning_ko}</span>
              {data.example_en && (
                <span className="block rounded-md bg-muted px-2 py-1 text-sm">
                  {data.example_en}
                  <br />
                  <span className="font-ko text-muted-foreground">
                    {data.example_ko}
                  </span>
                </span>
              )}
              <button
                type="button"
                onClick={toggleWordbook}
                className={cn(
                  "mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-chip px-3 py-2 text-sm font-semibold transition",
                  added
                    ? "bg-good/15 text-good hover:bg-good/25"
                    : "bg-accent text-accent-foreground hover:brightness-95",
                )}
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4" /> 단어장에 추가됨 · 빼기
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> 단어장 추가
                  </>
                )}
              </button>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">
              사전 정보를 찾지 못했어요.
            </span>
          )}
        </span>,
          document.body,
        )}
    </span>
  );
}
