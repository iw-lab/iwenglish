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

  // push — D1 쓰기 최소화(무료 인원 극대화) + 비정상 종료에도 손실 0
  //  · 로컬(localStorage)은 zustand persist 가 변경 즉시 저장 → 기기엔 항상 안전
  //  · 클라우드는 "거울": 활동이 멎고 8초 뒤 1회 저장(잦은 변경 묶음)
  //  · 계속 바뀌어도 최소 60초마다 1회는 강제 저장 → 크래시 시 클라우드 손실 ≤60초
  //  · 화면 숨김(모바일 백그라운드)·페이지 종료 시 keepalive 로 남은 변경 즉시 전송
  useEffect(() => {
    if (!syncId) return;
    const QUIET = 8000; // 활동 멈춘 뒤 이만큼 지나면 저장
    const MAX_WAIT = 60000; // 계속 바뀌어도 최소 이 주기마다 1회는 저장(손실 상한)
    const send = (key: string, value: unknown) =>
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: syncId, key, value }),
        keepalive: true,
      }).catch(() => {});
    const pending: Record<string, unknown> = {};
    const firstDirtyAt: Record<string, number> = {};
    const timers: Record<string, ReturnType<typeof setTimeout>> = {};
    const fire = (key: string) => {
      if (!(key in pending)) return;
      clearTimeout(timers[key]);
      delete timers[key];
      const value = pending[key];
      delete pending[key];
      delete firstDirtyAt[key];
      send(key, value);
    };
    const schedule = (key: string, value: unknown) => {
      pending[key] = value;
      const now = Date.now();
      if (firstDirtyAt[key] == null) firstDirtyAt[key] = now;
      clearTimeout(timers[key]);
      // 평소 8초 디바운스, 단 첫 변경 후 60초가 차면 즉시 저장
      const delay = Math.min(QUIET, Math.max(0, MAX_WAIT - (now - firstDirtyAt[key])));
      timers[key] = setTimeout(() => fire(key), delay);
    };
    const flush = () => {
      for (const k of Object.keys(pending)) fire(k);
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    const unsubP = useProgress.subscribe((st) => {
      if (pulled.current) schedule("progress", st);
    });
    const unsubW = useWordbook.subscribe((st) => {
      if (pulled.current) schedule("wordbook", { items: st.items });
    });
    return () => {
      flush(); // 언마운트(라우트 이동 등) 시에도 남은 변경 저장
      unsubP();
      unsubW();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      Object.values(timers).forEach(clearTimeout);
    };
  }, [syncId]);

  return null;
}
