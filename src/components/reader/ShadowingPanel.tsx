"use client";

import { useState } from "react";
import type { Book, LearningMode, Sentence } from "@/types/book";
import { AudioButton } from "@/components/ui/AudioButton";
import { RecordButton } from "@/components/ui/RecordButton";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { Card } from "@/components/ui/Card";
import { SentenceView } from "./SentenceView";
import { cn, scoreColor } from "@/lib/utils";

const SHADOW_STEPS = [
  "듣기",
  "블라인드 쉐도잉",
  "싱크로",
  "느리게 따라",
  "정속 따라",
  "기억해서 말하기",
];

interface WordScore {
  word: string;
  accuracy: number;
}
interface AssessResult {
  accuracy: number;
  fluency: number;
  completeness: number;
  prosody: number;
  overall: number;
  words: WordScore[];
  encouragement?: string;
}

export function ShadowingPanel({
  book,
  sentence,
  mode,
}: {
  book: Book;
  sentence: Sentence | null;
  mode: LearningMode;
}) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [myAudio, setMyAudio] = useState<string | null>(null);
  const [result, setResult] = useState<AssessResult | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const refText =
    mode === "read-yourself"
      ? book.pages
          .flatMap((p) => p.sentences)
          .find((s) => s.id === sentence?.id)?.text ?? sentence?.text ?? ""
      : sentence?.text ?? "";

  const onResult = async (blob: Blob) => {
    setMyAudio(URL.createObjectURL(blob));
    setResult(null);
    setNote(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("audio", blob, "rec.webm");
      fd.append("reference", refText);
      const r = await fetch("/api/pronounce", { method: "POST", body: fd });
      if (r.ok) {
        setResult(await r.json());
      } else if (r.status === 503) {
        setNote(
          "발음 평가는 Azure Speech 키가 필요해요. 지금은 내 목소리와 원어민 발음을 비교해 보세요.",
        );
      } else {
        setNote("평가 중 문제가 생겼어요. 다시 시도해 주세요.");
      }
    } catch {
      setNote("네트워크 오류 — 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  if (!sentence) {
    return (
      <Card className="p-5 text-center font-ko text-sm text-muted-foreground">
        이 책에는 아직 문장이 없어요.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 6단계 사다리 (쉐도잉만) */}
      {mode === "shadowing" && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {SHADOW_STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                i === step
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {i + 1}. {s}
            </button>
          ))}
        </div>
      )}

      {/* 원어민 + 문장 */}
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">
            {mode === "read-yourself" ? "이 문장을 또박또박 읽어요" : "원어민 듣기"}
          </span>
          <AudioButton src={sentence.audioUrl} text={sentence.text} size="sm" />
        </div>
        {/* 블라인드 쉐도잉 단계에선 텍스트 가림 */}
        {mode === "shadowing" && step === 1 ? (
          <p className="reading-text select-none blur-sm">{sentence.text}</p>
        ) : (
          <SentenceView text={sentence.text} />
        )}
        {sentence.translation_ko && (
          <p className="font-ko text-sm text-muted-foreground">
            {sentence.translation_ko}
          </p>
        )}
      </Card>

      {/* 녹음 */}
      <div className="flex flex-col items-center gap-3 py-2">
        <RecordButton onResult={onResult} busy={busy} />
        {myAudio && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">내 목소리:</span>
            <AudioButton src={myAudio} size="sm" label="내 녹음 듣기" />
            <span className="text-muted-foreground">원어민:</span>
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
        <Card className="p-4 text-center font-ko text-sm text-accent">{note}</Card>
      )}

      {/* 평가 결과 */}
      {result && (
        <Card className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <span className="font-bold">발음 평가</span>
            <span className="text-3xl font-extrabold tabular-nums text-primary">
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
        </Card>
      )}
    </div>
  );
}
