"use client";

import { useEffect, useRef } from "react";
import { useSettings } from "@/store/settings";
import { useProgress } from "@/store/progress";
import { useWordbook } from "@/store/wordbook";

/**
 * Cloudflare D1 기기간 동기화(선택). settings.syncId 가 있으면:
 *  - 마운트 시 클라우드에서 pull → 로컬 store 갱신
 *  - 이후 progress/wordbook 변경을 디바운스 push
 * D1 미배포/로컬이면 /api/sync 가 available:false → 조용히 무시(로컬만 동작).
 */
export function CloudSync() {
  const syncId = useSettings((s) => s.syncId);
  const pulled = useRef(false);

  // pull
  useEffect(() => {
    pulled.current = false;
    if (!syncId) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/sync?id=${encodeURIComponent(syncId)}`);
        const j = (await r.json()) as {
          available?: boolean;
          data?: { progress?: unknown; wordbook?: { items?: unknown } };
        };
        if (!cancelled && j.available && j.data) {
          if (j.data.progress)
            useProgress.setState(j.data.progress as object);
          if (j.data.wordbook?.items)
            useWordbook.setState({
              items: j.data.wordbook.items as never[],
            });
        }
      } catch {
        /* offline — 로컬만 */
      } finally {
        if (!cancelled) pulled.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [syncId]);

  // push (디바운스)
  useEffect(() => {
    if (!syncId) return;
    const timers: Record<string, ReturnType<typeof setTimeout>> = {};
    const push = (key: string, value: unknown) => {
      clearTimeout(timers[key]);
      timers[key] = setTimeout(() => {
        fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: syncId, key, value }),
        }).catch(() => {});
      }, 1500);
    };
    const unsubP = useProgress.subscribe((st) => {
      if (pulled.current) push("progress", st);
    });
    const unsubW = useWordbook.subscribe((st) => {
      if (pulled.current) push("wordbook", { items: st.items });
    });
    return () => {
      unsubP();
      unsubW();
      Object.values(timers).forEach(clearTimeout);
    };
  }, [syncId]);

  return null;
}
