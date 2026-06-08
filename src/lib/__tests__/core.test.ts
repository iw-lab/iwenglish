import { describe, it, expect } from "vitest";
import { tokenizeWords, normalizeWord, scoreColor } from "@/lib/utils";
import { sm2 } from "@/lib/srs";

describe("tokenizeWords", () => {
  it("단어와 charStart/charEnd 를 정확히 추출한다", () => {
    const t = tokenizeWords("The little fox.");
    expect(t.map((x) => x.word)).toEqual(["The", "little", "fox"]);
    expect(t[1].charStart).toBe(4);
    expect(t[1].charEnd).toBe(10);
  });
  it("아포스트로피 단어를 한 토큰으로 본다", () => {
    expect(tokenizeWords("don't stop").map((x) => x.word)).toEqual([
      "don't",
      "stop",
    ]);
  });
});

describe("normalizeWord", () => {
  it("소문자화 + 양끝 구두점 제거", () => {
    expect(normalizeWord("Sky!")).toBe("sky");
    expect(normalizeWord('"Hello,"')).toBe("hello");
  });
});

describe("scoreColor", () => {
  it("점수 구간을 색으로 매핑", () => {
    expect(scoreColor(85)).toBe("good");
    expect(scoreColor(70)).toBe("warn");
    expect(scoreColor(40)).toBe("bad");
  });
});

describe("sm2", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  it("실패(q<3)면 반복 초기화 + 1일 후", () => {
    const r = sm2(2, { ef: 2.5, repetitions: 5, intervalDays: 30 }, now);
    expect(r.repetitions).toBe(0);
    expect(r.intervalDays).toBe(1);
  });
  it("성공이면 반복 증가 + EF 갱신", () => {
    const r = sm2(5, { ef: 2.5, repetitions: 0, intervalDays: 0 }, now);
    expect(r.repetitions).toBe(1);
    expect(r.intervalDays).toBe(1);
    expect(r.ef).toBeGreaterThan(2.5);
  });
  it("EF 하한 1.3 을 지킨다", () => {
    const r = sm2(3, { ef: 1.3, repetitions: 2, intervalDays: 6 }, now);
    expect(r.ef).toBeGreaterThanOrEqual(1.3);
  });
});
