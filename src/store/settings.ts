"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

interface SettingsState {
  theme: ThemeMode;
  /** 난독증 친화 폰트(Lexend) 사용 */
  dyslexiaFont: boolean;
  /** 본문 글자 크기 배율 (0.9 ~ 1.5) */
  fontScale: number;
  /** 낭독 기본 속도 (0.5 ~ 1.5) */
  playbackRate: number;
  /** 문장별 한글 번역 기본 표시 */
  showTranslation: boolean;
  /** 기기간 동기화 코드(D1). 비어있으면 동기화 끔 */
  syncId: string;
  setTheme: (t: ThemeMode) => void;
  setSyncId: (id: string) => void;
  toggleDyslexiaFont: () => void;
  setFontScale: (n: number) => void;
  setPlaybackRate: (n: number) => void;
  toggleTranslation: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "light",
      dyslexiaFont: false,
      fontScale: 1,
      playbackRate: 1,
      showTranslation: false,
      syncId: "",
      setTheme: (theme) => set({ theme }),
      setSyncId: (syncId) => set({ syncId: syncId.trim() }),
      toggleDyslexiaFont: () =>
        set((s) => ({ dyslexiaFont: !s.dyslexiaFont })),
      setFontScale: (fontScale) =>
        set({ fontScale: Math.min(1.5, Math.max(0.9, fontScale)) }),
      setPlaybackRate: (playbackRate) =>
        set({ playbackRate: Math.min(1.5, Math.max(0.5, playbackRate)) }),
      toggleTranslation: () =>
        set((s) => ({ showTranslation: !s.showTranslation })),
    }),
    { name: "echotale-settings" },
  ),
);
