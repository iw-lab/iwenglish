"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff, Copy, Check } from "lucide-react";
import { useSettings } from "@/store/settings";
import { Card } from "@/components/ui/Card";

const genCode = () =>
  Array.from({ length: 6 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".charAt(
      Math.floor(Math.random() * 32),
    ),
  ).join("");

export function SyncCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  const syncId = useSettings((s) => s.syncId);
  const setSyncId = useSettings((s) => s.setSyncId);
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  if (!mounted)
    return <div className="h-24 animate-pulse rounded-card bg-muted/40" />;

  if (syncId)
    return (
      <Card className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-primary" />
          <h2 className="font-bold">기기간 동기화 켜짐</h2>
        </div>
        <p className="font-ko text-sm text-muted-foreground">
          다른 기기에서 이 코드를 입력하면 진도·단어장이 함께 보여요.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-chip bg-muted px-4 py-2.5 text-center text-lg font-extrabold tracking-[0.3em]">
            {syncId}
          </code>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(syncId).then(
                () => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                },
                () => {},
              );
            }}
            aria-label="코드 복사"
            className="grid h-11 w-11 place-items-center rounded-chip bg-primary text-primary-foreground"
          >
            {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
          </button>
        </div>
        <button
          onClick={() => {
            if (confirm("동기화를 끌까요? (이 기기 데이터는 유지돼요)"))
              setSyncId("");
          }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-bad"
        >
          <CloudOff className="h-4 w-4" /> 동기화 끄기
        </button>
      </Card>
    );

  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center gap-2">
        <Cloud className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-bold">기기간 동기화</h2>
      </div>
      <p className="font-ko text-sm text-muted-foreground">
        코드를 만들면 폰·태블릿·PC에서 진도와 단어장이 이어져요. (배포 후 D1
        연결 시 작동)
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSyncId(genCode())}
          className="rounded-chip bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          새 코드 만들기
        </button>
        <div className="flex flex-1 items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="기존 코드 입력"
            maxLength={8}
            className="min-w-0 flex-1 rounded-chip border border-border bg-background px-3 py-2.5 text-sm tracking-widest"
          />
          <button
            onClick={() => input.trim() && setSyncId(input.trim())}
            className="rounded-chip bg-muted px-4 py-2.5 text-sm font-semibold"
          >
            연결
          </button>
        </div>
      </div>
    </Card>
  );
}
