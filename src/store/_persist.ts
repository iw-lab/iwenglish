"use client";

import type { PersistStorage, StorageValue } from "zustand/middleware";

/**
 * zustand persist 용 방어적 localStorage 어댑터.
 *
 * 왜 필요한가 — zustand 5.0.14 의 기본 어댑터는 다음 세 가지를 처리하지 않는다
 * (node_modules/zustand/middleware.js 실측):
 *
 *  ① **손상된 JSON**: `getItem` 이 던지면 hydrate 의 `.catch` 가 그것을
 *     `onRehydrateStorage(undefined, e)` 로만 흘린다. 그 콜백이 없으면 아무 데도
 *     알려지지 않고 스토어는 기본값으로 조용히 리셋되며, 다음 `set()` 이 그 위를
 *     덮어써 **학습 진도가 확정 소실**된다.
 *  ② **용량 초과**: `setItem` 에 try/catch 가 없다(middleware.js:360-365).
 *     `QuotaExceededError` 가 `set()` 호출부(=React 이벤트 핸들러)로 그대로 튀어나온다.
 *  ③ **레거시 버전**: 저장된 값의 `version` 이 숫자가 아니면 `migrate` 를 아예
 *     호출하지 않는다(middleware.js:392). 즉 지금처럼 `version` 없이 저장된 데이터에
 *     나중에 `version: 1` 만 붙여도 **기존 사용자에겐 마이그레이션이 안 돈다.**
 *     그래서 아래 `legacyVersion` 으로 "버전 없는 값 = v0" 이라고 못박아 넣어 준다.
 *
 * 손상 값은 지우지 않고 `<name>.corrupt.<timestamp>` 로 옮겨 둔다 — 사용자의
 * 학습 기록일 수 있으므로 복구 여지를 남긴다.
 */

/** 저장 실패(용량 초과 등)를 UI 가 알 수 있게 남기는 플래그 */
let lastWriteFailed = false;
export const didPersistWriteFail = () => lastWriteFailed;

function backupCorrupt(name: string, raw: string) {
  try {
    window.localStorage.setItem(`${name}.corrupt.${Date.now()}`, raw);
  } catch {
    /* 백업 실패는 삼킨다 — 원본 보존이 최선이지 필수는 아니다 */
  }
  try {
    window.localStorage.removeItem(name);
  } catch {
    /* noop */
  }
}

/** 이전에 남긴 손상 백업을 오래된 것부터 지워 용량을 회수한다 */
function reclaimSpace(): boolean {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.includes(".corrupt.")) keys.push(k);
    }
    if (keys.length === 0) return false;
    keys.sort();
    window.localStorage.removeItem(keys[0]);
    return true;
  } catch {
    return false;
  }
}

export function safeStorage<S>(): PersistStorage<S> | undefined {
  if (typeof window === "undefined") return undefined;
  return {
    getItem: (name) => {
      let raw: string | null = null;
      try {
        raw = window.localStorage.getItem(name);
      } catch {
        return null; // 사파리 프라이빗 모드 등 — 기본값으로 시작
      }
      if (raw === null) return null;
      try {
        const parsed = JSON.parse(raw) as StorageValue<S>;
        if (!parsed || typeof parsed !== "object" || !("state" in parsed)) {
          backupCorrupt(name, raw);
          return null;
        }
        // 버전 없는 옛 값을 v0 으로 못박아 migrate 가 실제로 돌게 한다(위 ③).
        if (typeof parsed.version !== "number") parsed.version = 0;
        return parsed;
      } catch {
        backupCorrupt(name, raw);
        return null;
      }
    },
    setItem: (name, value) => {
      const write = () =>
        window.localStorage.setItem(name, JSON.stringify(value));
      try {
        write();
        lastWriteFailed = false;
      } catch {
        // 용량 초과 — 손상 백업을 버려 공간을 만들고 한 번만 재시도한다.
        // 끝내 실패해도 예외를 밖으로 던지지 않는다(던지면 set() 호출부가 죽는다).
        if (reclaimSpace()) {
          try {
            write();
            lastWriteFailed = false;
            return;
          } catch {
            /* fallthrough */
          }
        }
        lastWriteFailed = true;
      }
    },
    removeItem: (name) => {
      try {
        window.localStorage.removeItem(name);
      } catch {
        /* noop */
      }
    },
  };
}
