"use client";

import { useRef, useState } from "react";
import { Play, Pause, Loader2, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { speak } from "@/lib/speech";

/**
 * 오디오 재생 버튼.
 * - src(미리 생성된 mp3)가 있으면 <audio> 재생
 * - 없으면 text 로 Web Speech 폴백 TTS
 */
export function AudioButton({
  src,
  text,
  rate = 1,
  size = "md",
  variant = "icon",
  className,
  label = "발음 듣기",
}: {
  src?: string | null;
  text?: string;
  rate?: number;
  size?: "sm" | "md" | "lg";
  variant?: "icon" | "pill";
  className?: string;
  label?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = () => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    window.speechSynthesis?.cancel();
    setState("idle");
  };

  const play = () => {
    if (state === "playing") return stop();
    if (src) {
      setState("loading");
      const a = audioRef.current ?? new Audio(src);
      audioRef.current = a;
      a.playbackRate = rate;
      a.onplaying = () => setState("playing");
      a.onended = () => setState("idle");
      a.onerror = () => fallback();
      a.play().catch(fallback);
    } else {
      fallback();
    }
  };

  const fallback = () => {
    if (!text) return setState("idle");
    setState("playing");
    speak(text, { rate, onEnd: () => setState("idle") });
  };

  const px = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-11 w-11";
  const Icon =
    state === "loading" ? Loader2 : state === "playing" ? Pause : variant === "pill" ? Volume2 : Play;

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={play}
        aria-label={label}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/20 transition",
          className,
        )}
      >
        <Icon className={cn("h-4 w-4", state === "loading" && "animate-spin")} />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={play}
      aria-label={label}
      className={cn(
        "inline-grid place-items-center rounded-full bg-primary text-primary-foreground shadow-sm hover:brightness-95 active:brightness-90 transition",
        px,
        className,
      )}
    >
      <Icon
        className={cn(
          size === "lg" ? "h-6 w-6" : "h-5 w-5",
          state === "loading" && "animate-spin",
        )}
      />
    </button>
  );
}
