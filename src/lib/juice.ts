"use client";

// 반응(주스) — 정답·오답·퀴즈 통과·완독 도장·학습 세션 완료마다 «대단한 일을 한 것처럼» 반응한다.
// 2026-10-12 사용자 «사용자의 행동에 반응을 과하게 하라. 대단한 일을 하고 있는 것처럼. 전부 붙여».
// 키트 = src/lib/kit/juice.js(@gb-juice v1 — 정본, 내용 수정 금지). CSS = globals.css 끝(@gb-juice-css v1).
// 🔒 game-builder/tools/check-juice.mjs — 행동마다 sfx 포함 ≥3갈래 · fire 호출 필수.
import { createJuice } from "./kit/juice.js";

export const JUICE = {
  correct: ["sfx", "combo", "pop", "flash"], // 퀴즈 정답(단어 4지선다·철자·이해 퀴즈)
  wrong: ["sfx", "flash", "haptic"], // 오답
  quizPass: ["sfx", "banner", "flash", "haptic"], // 책 이해 퀴즈 80% 이상 통과
  stamp: ["sfx", "banner", "slowmo", "haptic"], // 완독 도장(책 한 권 다 읽음)
  sessionDone: ["sfx", "banner", "slowmo", "haptic"], // 학습 세션(복습·레벨·단어장) 완료
} as const;

/** 행동 → 효과음 파일명(public/sfx/*.wav, gen-sfx.py 레시피) */
const SFX_FILE: Record<string, string> = {
  correct: "point",
  wrong: "error",
  quizPass: "win",
  stamp: "powerup",
  sessionDone: "gauge_full",
};

// 짧은 원샷은 매번 새 Audio 를 만들어도 비용이 작고, 연속 정답(콤보)처럼
// 겹쳐 울려야 하는 소리를 당긴 재생이 끊지 않게 한다.
function playSfx(name: string, { rate = 1, vol = 1 }: { rate?: number; vol?: number } = {}) {
  if (typeof window === "undefined") return;
  const file = SFX_FILE[name] ?? name;
  try {
    const a = new Audio(`/sfx/${file}.wav`);
    a.playbackRate = Math.min(4, Math.max(0.25, rate));
    a.volume = Math.min(1, Math.max(0, vol));
    void a.play().catch(() => {});
  } catch {
    // 오디오를 못 만들면(아주 구형 환경) 조용히 넘어간다 — 반응의 다른 갈래(시각)는 그대로 남는다
  }
}

type Juice = ReturnType<typeof createJuice>;
let instance: Juice | null = null;

/** 싱글턴 — 클라이언트에서 처음 호출될 때 레이어를 document.body 에 1번만 붙인다 */
export function getJuice(): Juice | null {
  if (typeof document === "undefined") return null;
  if (!instance) {
    instance = createJuice({ table: JUICE, host: document.body, sfx: playSfx });
  }
  return instance;
}

/** 클릭/탭 이벤트에서 화면 좌표를 뽑는다 — 없으면 J.fire 가 화면 가운데로 둔다 */
export function xyOf(e?: { clientX?: number; clientY?: number } | null) {
  if (!e || typeof e.clientX !== "number") return {};
  return { x: e.clientX, y: e.clientY };
}
