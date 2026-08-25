import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { StorageValue } from "zustand/middleware";

/**
 * 🔴 학습 진도 보존 — zustand 기본 persist 는 손상 JSON 을 조용히 버리고,
 * 용량 초과를 set() 호출부로 던진다(middleware.js 실측). 그 두 경로가
 * 아이의 학습 기록을 날리는 자리라 어댑터에서 막고, 여기서 강제한다.
 */

class FakeLocalStorage {
  map: Record<string, string> = {};
  /** 0 이면 무제한. 양수면 전체 문자열 길이 합의 상한(용량 초과 재현용) */
  cap = 0;
  get length() {
    return Object.keys(this.map).length;
  }
  key(i: number) {
    return Object.keys(this.map)[i] ?? null;
  }
  getItem(k: string) {
    return Object.prototype.hasOwnProperty.call(this.map, k)
      ? this.map[k]
      : null;
  }
  setItem(k: string, v: string) {
    if (this.cap > 0) {
      const used = Object.entries(this.map)
        .filter(([key]) => key !== k)
        .reduce((n, [, val]) => n + val.length, 0);
      if (used + v.length > this.cap) {
        const e = new Error("QuotaExceededError");
        e.name = "QuotaExceededError";
        throw e;
      }
    }
    this.map[k] = v;
  }
  removeItem(k: string) {
    delete this.map[k];
  }
}

let ls: FakeLocalStorage;

beforeEach(() => {
  ls = new FakeLocalStorage();
  (globalThis as { window?: unknown }).window = { localStorage: ls };
});
afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

type State = { xp: number };

async function storage() {
  const { safeStorage } = await import("@/store/_persist");
  const s = safeStorage<State>();
  if (!s) throw new Error("storage 없음");
  return s;
}

/** getItem 은 비동기 저장소도 지원해 union 을 반환한다 — 이 어댑터는 항상 동기다. */
function readSync(
  s: Awaited<ReturnType<typeof storage>>,
  name: string,
): StorageValue<State> | null {
  const v = s.getItem(name);
  if (v instanceof Promise) throw new Error("동기 저장소여야 한다");
  return v;
}

describe("safeStorage — 손상된 저장값", () => {
  it("잘린 JSON 은 삭제가 아니라 백업으로 격리하고 null 을 준다", async () => {
    ls.setItem("echotale-progress", '{"state":{"xp":42},"vers');
    const s = await storage();

    expect(readSync(s, "echotale-progress")).toBeNull();
    // 원본이 사라지면 복구 불가 — 반드시 백업이 남아야 한다
    const backups = Object.keys(ls.map).filter((k) => k.includes(".corrupt."));
    expect(backups).toHaveLength(1);
    expect(ls.map[backups[0]]).toBe('{"state":{"xp":42},"vers');
    expect(ls.getItem("echotale-progress")).toBeNull();
  });

  it("JSON 이지만 state 가 없는 값도 격리한다", async () => {
    ls.setItem("echotale-progress", '"문자열일 뿐"');
    const s = await storage();
    expect(readSync(s, "echotale-progress")).toBeNull();
    expect(Object.keys(ls.map).some((k) => k.includes(".corrupt."))).toBe(true);
  });
});

describe("safeStorage — 레거시 버전", () => {
  it("version 없는 옛 값에 version 0 을 부여한다(migrate 가 돌게)", async () => {
    // zustand 는 stored.version 이 number 가 아니면 migrate 를 아예 안 부른다.
    ls.setItem("echotale-progress", JSON.stringify({ state: { xp: 7 } }));
    const s = await storage();
    const got = readSync(s, "echotale-progress");
    expect(got).not.toBeNull();
    expect(got!.version).toBe(0);
    expect(got!.state).toEqual({ xp: 7 });
  });

  it("이미 숫자 version 이 있으면 건드리지 않는다", async () => {
    ls.setItem(
      "echotale-progress",
      JSON.stringify({ state: { xp: 7 }, version: 3 }),
    );
    const s = await storage();
    expect(readSync(s, "echotale-progress")!.version).toBe(3);
  });
});

describe("safeStorage — 용량 초과", () => {
  it("QuotaExceededError 를 호출부로 던지지 않는다", async () => {
    const s = await storage();
    ls.cap = 10;
    expect(() =>
      s.setItem("echotale-progress", { state: { xp: 1 }, version: 1 }),
    ).not.toThrow();
  });

  it("손상 백업을 버려 공간을 만들고 재시도해 저장에 성공한다", async () => {
    ls.setItem("echotale-progress.corrupt.1", "x".repeat(60));
    const s = await storage();
    // 백업 60자 + 본문 30자 = 90 > 80 → 첫 쓰기는 반드시 실패해야 회수 경로를 탄다
    ls.cap = 80;

    s.setItem("echotale-progress", { state: { xp: 1 }, version: 1 });

    expect(ls.getItem("echotale-progress")).not.toBeNull();
    expect(ls.getItem("echotale-progress.corrupt.1")).toBeNull();
    const { didPersistWriteFail } = await import("@/store/_persist");
    expect(didPersistWriteFail()).toBe(false);
  });

  it("회수해도 못 쓰면 실패를 플래그로 남긴다(조용한 유실 금지)", async () => {
    const s = await storage();
    ls.cap = 5;
    s.setItem("echotale-progress", { state: { xp: 1 }, version: 1 });
    const { didPersistWriteFail } = await import("@/store/_persist");
    expect(didPersistWriteFail()).toBe(true);
  });
});

describe("safeStorage — 저장소 자체가 막힌 환경", () => {
  it("localStorage 접근이 던져도 null 로 흘려보낸다(사파리 프라이빗)", async () => {
    const s = await storage();
    ls.getItem = () => {
      throw new Error("SecurityError");
    };
    expect(readSync(s, "echotale-progress")).toBeNull();
  });
});
