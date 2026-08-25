"use client";

/**
 * 미리 생성된 mp3 음원을 안정적으로 1회 재생.
 * - 첫 play() 거부(autoplay 정책·첫 버퍼링)되면 canplaythrough 뒤 1회 재시도.
 * - 실제 음원 URL이 있으면 절대 브라우저 Web Speech 로 폴백하지 않는다
 *   (시스템 기본 음성=쉰 목소리 오작동 방지).
 * - ⚠️ 끝내 실패하면 **조용히 무음으로 두지 않고 onError 로 알린다.**
 *   '듣고 고르기'는 단어를 화면에 안 보여주므로, 음원이 죽으면 아이는 소리도
 *   글자도 없이 4지선다를 찍게 되고 그 결과가 Leitner 박스에 그대로 남는다
 *   (2026-08-25 교차검증 지적). 호출측이 화면으로 복구할 수 있어야 한다.
 * 반환된 Audio 로 호출측이 정지/상태제어 가능.
 */
export function playAudioUrl(
  url: string,
  opts: {
    rate?: number;
    onPlay?: () => void;
    onEnd?: () => void;
    /** 재시도까지 실패해 소리가 나지 않았을 때 1회 호출 */
    onError?: () => void;
  } = {},
): HTMLAudioElement {
  const a = new Audio(url);
  a.preload = "auto";
  if (opts.rate) a.playbackRate = opts.rate;
  if (opts.onPlay) a.onplaying = opts.onPlay;
  if (opts.onEnd) a.onended = opts.onEnd;

  let failed = false;
  const fail = () => {
    if (failed) return; // 한 번만 — play() 거부와 element error 가 겹쳐 올 수 있다
    failed = true;
    opts.onError?.();
  };
  // 404·네트워크 오류는 play() 를 거부하지 않고 element error 로만 온다.
  a.addEventListener("error", fail);

  let retried = false;
  const attempt = () => {
    a.play().catch(() => {
      if (retried) {
        fail(); // 1회만 재시도 — 폴백(쉰 목소리) 없이 실패를 알린다
        return;
      }
      retried = true;
      const onReady = () => {
        a.play().catch(fail);
      };
      a.addEventListener("canplaythrough", onReady, { once: true });
      try {
        a.load();
      } catch {
        fail();
      }
    });
  };
  attempt();
  return a;
}
