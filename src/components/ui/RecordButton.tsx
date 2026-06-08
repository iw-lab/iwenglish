"use client";

import { useCallback, useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Hold-to-talk 녹음 버튼.
 * 누르고 있는 동안 녹음 → 떼면 onResult(blob) 호출.
 * Azure 발음평가 또는 user-recordings 업로드에 사용.
 */
export function RecordButton({
  onResult,
  onStart,
  busy,
  className,
}: {
  onResult: (blob: Blob) => void;
  onStart?: () => void;
  busy?: boolean;
  className?: string;
}) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    if (recording || busy) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        onResult(blob);
      };
      recorderRef.current = mr;
      mr.start();
      setRecording(true);
      onStart?.();
    } catch {
      setError("마이크 권한이 필요해요");
    }
  }, [recording, busy, onResult, onStart]);

  const stop = useCallback(() => {
    if (recorderRef.current && recording) {
      recorderRef.current.stop();
      setRecording(false);
    }
  }, [recording]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        disabled={busy}
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={() => recording && stop()}
        aria-label={recording ? "녹음 중 (떼면 종료)" : "눌러서 녹음"}
        className={cn(
          "inline-grid h-20 w-20 place-items-center rounded-full text-white shadow-lg transition active:scale-95",
          recording
            ? "bg-bad animate-pulse"
            : busy
              ? "bg-muted-foreground"
              : "bg-accent hover:brightness-95",
          className,
        )}
      >
        {busy ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : recording ? (
          <Square className="h-8 w-8" />
        ) : (
          <Mic className="h-8 w-8" />
        )}
      </button>
      <span className="text-xs text-muted-foreground">
        {error ?? (recording ? "떼면 끝나요" : busy ? "평가 중…" : "누르고 말하기")}
      </span>
    </div>
  );
}
