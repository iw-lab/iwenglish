"use client";

import { useState } from "react";
import { Mic, ChevronDown } from "lucide-react";
import type { Sentence } from "@/types/book";
import { RecordButton } from "@/components/ui/RecordButton";
import { AudioButton } from "@/components/ui/AudioButton";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { Card } from "@/components/ui/Card";
import { cn, scoreColor } from "@/lib/utils";

interface AssessResult {
  accuracy: number;
  fluency: number;
  completeness: number;
  prosody: number;
  overall: number;
  words: { word: string; accuracy: number }[];
  encouragement?: string;
}

/**
 * 녹음 기능 (따라 말하기/쉐도잉과 분리) — 현재 문장을 직접 녹음해
 * 내 목소리 vs 원어민 비교 + (Azure 연결 시) 발음 점수.
 */
export function RecordPractice({ sentence }: { sentence: Sentence | null }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [myAudio, setMyAudio] = useState<string | null>(null);
  const [result, setResult] = useState<AssessResult | null>(null);
  const [note, setNote] = useState<string | null>(null);

  if (!sentence) return null;

  const onResult = async (blob: Blob) => {
    setMyAudio(URL.createObjectURL(blob));
    setResult(null);
    setNote(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("audio", blob, "rec.webm");
      fd.append("reference", sentence.text);
      const r = await fetch("/api/pronounce", { method: "POST", body: fd });
      if (r.ok) {
        setResult(await r.json());
      } else if (r.status === 503) {
        setNote("내 목소리와 원어민 발음을 비교해 보세요. (정밀 점수는 Azure 키 연결 시)");
      } else {
        setNote("평가 중 문제가 생겼어요. 다시 해볼까요?");
      }
    } catch {
      setNote("네트워크 오류 — 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5 text-sm font-bold">
          <Mic className="h-4 w-4 text-accent" /> 녹음해서 비교하기
        </span>
        <ChevronDown
          className={cn("h-5 w-5 text-muted-foreground transition", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="space-y-3 px-4 pb-4">
          <div className="flex flex-col items-center gap-2">
            <RecordButton onResult={onResult} busy={busy} />
            {myAudio && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">내 목소리</span>
                <AudioButton src={myAudio} size="sm" label="내 녹음 듣기" />
                <span className="text-muted-foreground">원어민</span>
                <AudioButton
                  src={sentence.audioUrl}
                  text={sentence.text}
                  size="sm"
                  label="원어민 듣기"
                />
              </div>
            )}
          </div>

          {note && (
            <p className="text-center font-ko text-sm text-accent">{note}</p>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold">발음 평가</span>
                <span className="text-2xl font-extrabold tabular-nums text-primary">
                  {Math.round(result.overall)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <ScoreGauge label="정확도" value={result.accuracy} />
                <ScoreGauge label="유창성" value={result.fluency} />
                <ScoreGauge label="완성도" value={result.completeness} />
                <ScoreGauge label="운율" value={result.prosody} />
              </div>
              {result.words?.length > 0 && (
                <p className="flex flex-wrap gap-1.5 reading-text !text-base">
                  {result.words.map((w, i) => (
                    <span
                      key={i}
                      className={cn(
                        "rounded px-1",
                        scoreColor(w.accuracy) === "good" && "text-good",
                        scoreColor(w.accuracy) === "warn" && "text-warn",
                        scoreColor(w.accuracy) === "bad" && "text-bad font-bold",
                      )}
                      title={`정확도 ${Math.round(w.accuracy)}`}
                    >
                      {w.word}
                    </span>
                  ))}
                </p>
              )}
              {result.encouragement && (
                <p className="rounded-md bg-muted px-3 py-2 font-ko text-sm">
                  {result.encouragement}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
