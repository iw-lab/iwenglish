"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Sentence } from "@/types/book";
import { tokenizeWords } from "@/lib/utils";
import { speak } from "@/lib/speech";
import { echoIndexAt, wordIndexAt } from "@/lib/learning";

export interface KaraokeState {
  playing: boolean;
  /** 현재 하이라이트할 단어 인덱스 (-1 = 없음) */
  activeWord: number;
  /**
   * 쉐도잉 "내 차례" 인덱스 — 원어민보다 echoDelayMs 만큼 뒤처진 위치.
   * echoDelayMs 가 null/미지정이면 항상 -1.
   */
  echoWord: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  restart: () => void;
}

/**
 * 한 문장의 카라오케 동기화.
 * (A) audioUrl + wordTimings 있으면 → <audio> timeupdate 로 단어 매칭(전 기기 정확)
 * (B) 없으면 → Web Speech onboundary(charIndex→단어) 폴백
 *
 * 쉐도잉: 같은 오디오 한 번만 재생하면서 하이라이트 트랙을 2개(원어민·내 차례) 돌린다.
 * 오디오를 두 번 트는 방식이 아니므로 "진짜 쉐도잉"(원어민이 말하는 중에 겹쳐 따라가기)이 된다.
 */
export function useKaraoke(
  sentence: Sentence | null,
  opts: {
    rate?: number;
    onEnd?: () => void;
    silent?: boolean;
    /** 쉐도잉 지연(ms). null = 에코 트랙 없음 */
    echoDelayMs?: number | null;
    /** 원어민 음성 볼륨(0~1) — 쉐도잉 중 내 목소리가 들리도록 감쇠 */
    volume?: number;
  } = {},
): KaraokeState {
  const [playing, setPlaying] = useState(false);
  const [activeWord, setActiveWord] = useState(-1);
  const [echoWord, setEchoWord] = useState(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const tailTimerRef = useRef<number | null>(null);
  const speechRef = useRef<{ cancel: () => void } | null>(null);
  /**
   * 재생 세대. cleanup 마다 증가시키고 각 rAF 루프는 자기 세대를 캡처한다.
   * rafRef 는 핸들이 하나뿐이라, onended 가 tailTick 을 예약하며 덮어쓰면
   * 앞서 돌던 tick 의 핸들을 잃어 취소할 수 없게 된다(오디오가 끝나면
   * currentTime 이 멈춰 tick 의 종료 조건에 영영 닿지 못한다 → 영구 루프).
   * 세대가 어긋난 루프는 스스로 멈추게 해 이 경로를 원천 차단한다.
   */
  const genRef = useRef(0);
  /** 이 재생에 건 오디오 이벤트 리스너 일괄 해제용 */
  const listenersRef = useRef<AbortController | null>(null);

  const tokens = sentence ? tokenizeWords(sentence.text) : [];
  const hasTimings =
    !!sentence?.audioUrl && (sentence?.wordTimings?.length ?? 0) > 0;
  const echoDelay = opts.echoDelayMs ?? null;
  const volume = opts.volume ?? 1;

  const cleanup = useCallback(() => {
    genRef.current += 1; // 진행 중이던 모든 rAF 루프를 무효화
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (tailTimerRef.current) clearTimeout(tailTimerRef.current);
    tailTimerRef.current = null;
    speechRef.current?.cancel();
    speechRef.current = null;
    // addEventListener 로 건 것들(applyRate 4종·재시도용 canplaythrough)까지 해제한다.
    // 남겨두면 오토플레이 차단 후 지연 발화한 canplaythrough 가 옛 오디오를 재생시킨다.
    listenersRef.current?.abort();
    listenersRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.ontimeupdate = null;
    }
  }, []);

  const pause = useCallback(() => {
    cleanup();
    setPlaying(false);
    setEchoWord(-1);
  }, [cleanup]);

  const finish = useCallback(() => {
    cleanup();
    setPlaying(false);
    setActiveWord(-1);
    setEchoWord(-1);
    opts.onEnd?.();
  }, [cleanup, opts]);

  const play = useCallback(() => {
    if (!sentence) return;
    cleanup();
    setPlaying(true);
    setActiveWord(-1);
    setEchoWord(-1);

    // 이번 재생의 세대·리스너 묶음. 아래 rAF 루프들은 전부 gen 을 캡처해
    // 세대가 바뀌면(=cleanup 이 돌면) 스스로 종료한다.
    const gen = genRef.current;
    const alive = () => gen === genRef.current;
    const ac = new AbortController();
    listenersRef.current = ac;

    const timings = sentence.wordTimings;
    /** 재생 위치(ms) → 두 하이라이트 트랙 갱신 */
    const syncTracks = (ms: number) => {
      const idx = wordIndexAt(timings, ms);
      if (idx !== -1) setActiveWord(idx);
      if (echoDelay !== null) setEchoWord(echoIndexAt(timings, ms, echoDelay));
    };

    // 혼자 읽기: 음성 없이 하이라이트만 가상 시계로 진행(학생이 직접 읽음)
    if (opts.silent && timings.length > 0) {
      const lastEnd = timings[timings.length - 1].endMs;
      const TAIL = 500;
      const rate = opts.rate ?? 1;
      const startT = performance.now();
      const tickSilent = () => {
        if (!alive()) return;
        const ms = (performance.now() - startT) * rate;
        syncTracks(ms);
        if (ms >= lastEnd + TAIL) {
          finish();
          return;
        }
        rafRef.current = requestAnimationFrame(tickSilent);
      };
      rafRef.current = requestAnimationFrame(tickSilent);
      // 오디오가 없는 모드라 rAF 가 유일한 시계 — 백그라운드에서 멈춰도
      // 문장이 영영 안 끝나지 않도록 타이머로 종료를 보장한다.
      tailTimerRef.current = window.setTimeout(finish, (lastEnd + TAIL) / rate);
      return;
    }

    if (hasTimings) {
      const a = new Audio(sentence.audioUrl!);
      const rate = opts.rate ?? 1;
      a.preservesPitch = true;
      a.volume = Math.max(0, Math.min(1, volume));
      // ⚠️ 배속 미적용 버그 근본수정: 일부 브라우저(Chrome 등)는 메타데이터 로드 전에
      // 설정한 playbackRate를 무시하거나, load()/재생 시작 시 1.0으로 되돌린다.
      // → 생성 시 + 재생이 실제 시작되는 모든 라이프사이클 시점에 재적용한다.
      const applyRate = () => {
        a.defaultPlaybackRate = rate; // load()/seek 후 자동 복원 기준값
        if (a.playbackRate !== rate) a.playbackRate = rate;
      };
      applyRate();
      const sig = { signal: ac.signal };
      a.addEventListener("loadedmetadata", applyRate, sig);
      a.addEventListener("canplay", applyRate, sig);
      a.addEventListener("play", applyRate, sig);
      a.addEventListener("playing", applyRate, sig);
      audioRef.current = a;
      const lastEnd = timings.length
        ? timings[timings.length - 1].endMs
        : Infinity;
      // 마지막 단어 끝 + 여유(릴리즈 보존 + 짧은 쉼) 뒤 종료.
      // 너무 짧으면 끝 단어가 잘려 들리고, 너무 길면 문장 사이 텀이 늘어짐.
      // 쉐도잉 중에는 에코 트랙이 문장 끝까지 따라오도록 지연만큼 더 기다린다.
      const TAIL = 360 + (echoDelay ?? 0);
      const tick = () => {
        if (!alive()) return;
        const ms = a.currentTime * 1000;
        syncTracks(ms);
        // 마지막 단어가 끝나고 무음만 남으면 즉시 종료(다음 문장으로 바로)
        if (ms >= lastEnd + TAIL) {
          finish();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      a.onended = () => {
        // 오디오가 끝나도 에코가 남아 있으면 남은 지연만큼 트랙만 더 굴린다.
        // ⚠️ 백그라운드 탭·화면 꺼짐에서는 requestAnimationFrame 이 완전히 멈춘다.
        // 화면 갱신은 rAF 로 하되, "문장 종료" 확정은 반드시 타이머로 보장해야
        // 자동 진행과 청취 인정이 멈추지 않는다.
        if (!alive()) return;
        if (echoDelay && echoDelay > 0) {
          // tick 을 먼저 취소하고 tailTick 으로 교체한다. 곧바로 덮어쓰면
          // tick 의 rAF 핸들을 잃어 취소할 수 없게 된다(오디오 종료 후
          // currentTime 이 멈춰 tick 은 스스로 끝나지도 못한다).
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          const endedAt = performance.now();
          const tailTick = () => {
            if (!alive()) return;
            syncTracks(lastEnd + (performance.now() - endedAt));
            rafRef.current = requestAnimationFrame(tailTick);
          };
          rafRef.current = requestAnimationFrame(tailTick);
          tailTimerRef.current = window.setTimeout(finish, echoDelay + 200);
          return;
        }
        finish();
      };
      // 첫 play() 거부(autoplay·버퍼링)는 로드 후 1회 재시도, 그래도 안 되면 폴백
      let retried = false;
      const startAudio = () => {
        a.playbackRate = opts.rate ?? 1; // 매 재생 시도마다 재적용(load() 리셋 방지)
        a.play()
          .then(() => {
            if (!alive()) return;
            rafRef.current = requestAnimationFrame(tick);
          })
          .catch(() => {
            if (!alive()) return;
            if (retried) {
              speakFallback();
              return;
            }
            retried = true;
            a.addEventListener("canplaythrough", startAudio, {
              once: true,
              signal: ac.signal,
            });
            try {
              a.load();
            } catch {
              /* noop */
            }
          });
      };
      startAudio();
    } else {
      speakFallback();
    }

    function speakFallback() {
      if (!sentence) return;
      speechRef.current = speak(sentence.text, {
        rate: opts.rate ?? 1,
        onWordBoundary: (charIndex) => {
          // charIndex → 토큰 인덱스
          const idx = tokens.findIndex(
            (t) => charIndex >= t.charStart && charIndex < t.charEnd,
          );
          if (idx !== -1) setActiveWord(idx);
        },
        onEnd: finish,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sentence,
    hasTimings,
    opts.rate,
    opts.silent,
    echoDelay,
    volume,
    cleanup,
    finish,
  ]);

  const toggle = useCallback(() => {
    if (playing) pause();
    else play();
  }, [playing, pause, play]);

  const restart = useCallback(() => {
    pause();
    setActiveWord(-1);
    play();
  }, [pause, play]);

  // 재생 중 속도·볼륨 변경 즉시 반영
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = opts.rate ?? 1;
  }, [opts.rate]);
  useEffect(() => {
    if (audioRef.current)
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
  }, [volume]);

  useEffect(() => cleanup, [cleanup]);
  // 문장이 바뀌면 외부 오디오 정지 + 하이라이트 초기화 (prop 동기화)
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    pause();
    setActiveWord(-1);
    setEchoWord(-1);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentence?.id]);

  return { playing, activeWord, echoWord, play, pause, toggle, restart };
}
