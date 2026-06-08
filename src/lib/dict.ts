"use client";

import type { Word } from "@/types/book";
import { normalizeWord } from "@/lib/utils";

interface RawEntry {
  ipa?: string;
  pos?: string;
  meaning_ko?: string;
  example_en?: string;
  example_ko?: string;
  audioUrl?: string;
}

let cache: Record<string, RawEntry> | null = null;
let inflight: Promise<Record<string, RawEntry>> | null = null;

/** 정적 사전(/dict.json) 1회 로드·캐시 — 단어 탭마다 서버 호출 없이(Functions 0) */
async function load(): Promise<Record<string, RawEntry>> {
  if (cache) return cache;
  if (!inflight)
    inflight = fetch("/dict.json")
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  cache = await inflight;
  return cache;
}

/** 정적 사전에서 단어 조회. 없으면 null(→ /api/word 폴백) */
export async function getDictWord(raw: string): Promise<Word | null> {
  const key = normalizeWord(raw);
  if (!key) return null;
  const d = await load();
  const e = d[key];
  if (!e || !e.meaning_ko) return null;
  return {
    text: key,
    lemma: key,
    ipa: e.ipa ?? "",
    pos: e.pos ?? "",
    meaning_ko: e.meaning_ko,
    example_en: e.example_en ?? "",
    example_ko: e.example_ko ?? "",
    audioUrl: e.audioUrl ?? "",
  };
}
