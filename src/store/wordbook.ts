"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Word } from "@/types/book";
import { safeStorage } from "./_persist";

/** persist 스키마 버전 — 저장 구조를 바꿀 때마다 올리고 migrate 에 변환을 적는다. */
const WORDBOOK_SCHEMA_VERSION = 1;


export interface SavedWord extends Word {
  /** 추가 시각(ms) */
  addedAt: number;
  /** 간단 복습용: 본 횟수 */
  reviews: number;
}

interface WordbookState {
  items: SavedWord[];
  has: (text: string) => boolean;
  add: (w: Word) => void;
  remove: (text: string) => void;
  markReviewed: (text: string) => void;
  clear: () => void;
}

/**
 * 로그인·DB 없이 동작하는 로컬 단어장(localStorage).
 * Supabase 연결 시 추후 동기화 가능. 키는 normalizeWord 된 text 기준.
 */
export const useWordbook = create<WordbookState>()(
  persist(
    (set, get) => ({
      items: [],
      has: (text) => get().items.some((w) => w.text === text),
      add: (w) =>
        set((s) =>
          s.items.some((x) => x.text === w.text)
            ? s
            : {
                items: [
                  { ...w, addedAt: Date.now(), reviews: 0 },
                  ...s.items,
                ],
              },
        ),
      remove: (text) =>
        set((s) => ({ items: s.items.filter((w) => w.text !== text) })),
      markReviewed: (text) =>
        set((s) => ({
          items: s.items.map((w) =>
            w.text === text ? { ...w, reviews: w.reviews + 1 } : w,
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "echotale-wordbook",
      storage: safeStorage<WordbookState>(),
      version: WORDBOOK_SCHEMA_VERSION,
      migrate: (persisted) => persisted as WordbookState,
      merge: (persisted, current) => {
        const p = persisted as Partial<WordbookState>;
        return {
          ...current,
          ...p,
          // 저장분이 배열이 아니면(손상·구버전) 빈 목록으로 — 렌더에서 터지지 않게.
          items: Array.isArray(p?.items) ? p.items : current.items,
        };
      },
    },
  ),
);
