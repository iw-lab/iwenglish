"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Sentence } from "@/types/book";
import { tokenizeWords } from "@/lib/utils";
import { speak } from "@/lib/speech";

export interface KaraokeState {
  playing: boolean;
  /** 현재 하이라이트할 단어 인덱스 (-1 = 없음) */
  activeWord: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  restart: () => void;
}

/**
 * 한 문장의 카라오케 동기화.
 * (A) audioUrl + wordTimings 있으면 → <audio> timeupdate 로 단어 매칭(전 기기 정확)
 * (B) 없으면 → Web Speech onboundary(charIndex→단어) 폴백
 */
export function useKaraoke(
  sentence: Sentence | null,
  opts: { rate?: number; onEnd?: () => void; silent?: boolean } = {},
): KaraokeState {
  const [playing, setPlaying] = useState(false);
  const [activeWord, setActiveWord] = useState(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const speechRef = useRef<{ cancel: () => void } | null>(null);

  const tokens = sentence ? tokenizeWords(sentence.text) : [];
  const hasTimings =
    !!sentence?.audioUrl && (sentence?.wordTimings?.length ?? 0) > 0;

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    speechRef.current?.cancel();
    speechRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.ontimeupdate = null;
    }
  }, []);

  const pause = useCallback(() => {
    cleanup();
    setPlaying(false);
  }, [cleanup]);

  const finish = useCallback(() => {
    cleanup();
    setPlaying(false);
    setActiveWord(-1);
    opts.onEnd?.();
  }, [cleanup, opts]);

  const play = useCallback(() => {
    if (!sentence) return;
    cleanup();
    setPlaying(true);
    setActiveWord(-1);

    // 혼자 읽기: 음성 없이 하이라이트만 가상 시계로 진행(학생이 직접 읽음)
    const timingsArr = sentence.wordTimings;
    if (opts.silent && timingsArr.length > 0) {
      const lastEnd = timingsArr[timingsArr.length - 1].endMs;
      const TAIL = 500;
      const rate = opts.rate ?? 1;
      const startT = performance.now();
      const tickSilent = () => {
        const ms = (performance.now() - startT) * rate;
        let idx = -1;
        for (let i = 0; i < timingsArr.length; i++) {
          if (timingsArr[i].startMs <= ms) idx = i;
          else break;
        }
        if (idx !== -1) setActiveWord(idx);
        if (ms >= lastEnd + TAIL) {
          finish();
          return;
        }
        rafRef.current = requestAnimationFrame(tickSilent);
      };
      rafRef.current = requestAnimationFrame(tickSilent);
      return;
    }

    if (hasTimings) {
      const a = new Audio(sentence.audioUrl!);
      const rate = opts.rate ?? 1;
      a.preservesPitch = true;
      // ⚠️ 배속 미적용 버그 근본수정: 일부 브라우저(Chrome 등)는 메타데이터 로드 전에
      // 설정한 playbackRate를 무시하거나, load()/재생 시작 시 1.0으로 되돌린다.
      // → 생성 시 + 재생이 실제 시작되는 모든 라이프사이클 시점에 재적용한다.
      const applyRate = () => {
        a.defaultPlaybackRate = rate; // load()/seek 후 자동 복원 기준값
        if (a.playbackRate !== rate) a.playbackRate = rate;
      };
      applyRate();
      a.addEventListener("loadedmetadata", applyRate);
      a.addEventListener("canplay", applyRate);
      a.addEventListener("play", applyRate);
      a.addEventListener("playing", applyRate);
      audioRef.current = a;
      const timings = sentence.wordTimings;
      const lastEnd = timings.length
        ? timings[timings.length - 1].endMs
        : Infinity;
      // 마지막 단어 끝 + 여유(릴리즈 보존 + 짧은 쉼) 뒤 종료.
      // 너무 짧으면 끝 단어가 잘려 들리고, 너무 길면 문장 사이 텀이 늘어짐.
      const TAIL = 360;
      const tick = () => {
        const ms = a.currentTime * 1000;
        // 현재(또는 직전) 단어 = startMs <= ms 인 마지막 토큰 → 다음 단어 시작 전까지 유지
        let idx = -1;
        for (let i = 0; i < timings.length; i++) {
          if (timings[i].startMs <= ms) idx = i;
          else break;
        }
        if (idx !== -1) setActiveWord(idx);
        // 마지막 단어가 끝나고 무음만 남으면 즉시 종료(다음 문장으로 바로)
        if (ms >= lastEnd + TAIL) {
          finish();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      a.onended = finish;
      // 첫 play() 거부(autoplay·버퍼링)는 로드 후 1회 재시도, 그래도 안 되면 폴백
      let retried = false;
      const startAudio = () => {
        a.playbackRate = opts.rate ?? 1; // 매 재생 시도마다 재적용(load() 리셋 방지)
        a.play()
          .then(() => {
            rafRef.current = requestAnimationFrame(tick);
          })
          .catch(() => {
            if (retried) {
              speakFallback();
              return;
            }
            retried = true;
            a.addEventListener("canplaythrough", startAudio, { once: true });
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
  }, [sentence, hasTimings, opts.rate, opts.silent, cleanup, finish]);

  const toggle = useCallback(() => {
    if (playing) pause();
    else play();
  }, [playing, pause, play]);

  const restart = useCallback(() => {
    pause();
    setActiveWord(-1);
    play();
  }, [pause, play]);

  // 재생 중 속도 변경 즉시 반영
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = opts.rate ?? 1;
  }, [opts.rate]);

  useEffect(() => cleanup, [cleanup]);
  // 문장이 바뀌면 외부 오디오 정지 + 하이라이트 초기화 (prop 동기화)
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    pause();
    setActiveWord(-1);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentence?.id]);

  return { playing, activeWord, play, pause, toggle, restart };
}
