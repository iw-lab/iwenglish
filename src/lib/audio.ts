"use client";

/**
 * 미리 생성된 mp3 음원을 안정적으로 1회 재생.
 * - 첫 play() 거부(autoplay 정책·첫 버퍼링)되면 canplaythrough 뒤 1회 재시도.
 * - 실제 음원 URL이 있으면 절대 브라우저 Web Speech 로 폴백하지 않는다
 *   (시스템 기본 음성=쉰 목소리 오작동 방지). 끝내 실패하면 조용히 무음.
 * 반환된 Audio 로 호출측이 정지/상태제어 가능.
 */
export function playAudioUrl(
  url: string,
  opts: { rate?: number; onPlay?: () => void; onEnd?: () => void } = {},
): HTMLAudioElement {
  const a = new Audio(url);
  a.preload = "auto";
  if (opts.rate) a.playbackRate = opts.rate;
  if (opts.onPlay) a.onplaying = opts.onPlay;
  if (opts.onEnd) a.onended = opts.onEnd;

  let retried = false;
  const attempt = () => {
    a.play().catch(() => {
      if (retried) return; // 1회만 재시도 — 폴백(쉰 목소리) 없이 무음
      retried = true;
      const onReady = () => {
        a.play().catch(() => {});
      };
      a.addEventListener("canplaythrough", onReady, { once: true });
      try {
        a.load();
      } catch {
        /* noop */
      }
    });
  };
  attempt();
  return a;
}
