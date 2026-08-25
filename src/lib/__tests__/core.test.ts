import { describe, it, expect } from "vitest";
import { tokenizeWords, normalizeWord, scoreColor } from "@/lib/utils";
import { boxIntervalDays, nextStreak } from "@/store/progress";
import {
  MIN_COVERAGE,
  READS_TO_COMPLETE,
  SHADOW_STEPS,
  addDaysISO,
  allQuestsDone,
  coverageRatio,
  diffDaysISO,
  echoIndexAt,
  emptyDay,
  evaluateStamp,
  isQuizPassed,
  todayISO,
  wordIndexAt,
  ymd,
} from "@/lib/learning";
import {
  buildPlacement,
  buildWordQuestion,
  checkSpelling,
  kindsForBox,
  recommendLevel,
  shuffle,
  type QuizWord,
} from "@/lib/quizEngine";
import type { WordTiming } from "@/types/book";

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
  // 2026-08-25 실측 결함: 작은따옴표 대사에서 'brave · 'i'm 같은 키가 생겨
  // 사전에 영원히 없는 단어가 됐다(34개). 양끝 아포스트로피는 벗겨야 한다.
  it("양끝 아포스트로피·하이픈을 벗긴다", () => {
    expect(normalizeWord("'brave")).toBe("brave");
    expect(normalizeWord("grandparents'")).toBe("grandparents");
    expect(normalizeWord("'")).toBe("");
    expect(normalizeWord("-well-")).toBe("well");
  });
  it("단어 안쪽의 아포스트로피·하이픈은 보존한다", () => {
    expect(normalizeWord("don't")).toBe("don't");
    expect(normalizeWord("grown-ups")).toBe("grown-ups");
    expect(normalizeWord("'it's'")).toBe("it's");
  });
  it("둥근 따옴표(U+2019)를 곧은 것으로 통일한다", () => {
    expect(normalizeWord("don\u2019t")).toBe("don't");
  });
});

describe("lemmaCandidates", () => {
  it("규칙 굴절의 원형 후보를 낸다", async () => {
    const { lemmaCandidates } = await import("@/lib/lemma");
    expect(lemmaCandidates("waddles")).toContain("waddle");
    expect(lemmaCandidates("bellies")).toContain("belly");
    expect(lemmaCandidates("stopped")).toContain("stop");
    expect(lemmaCandidates("running")).toContain("run");
    expect(lemmaCandidates("making")).toContain("make");
    expect(lemmaCandidates("happiest")).toContain("happy");
    expect(lemmaCandidates("quickly")).toContain("quick");
    expect(lemmaCandidates("dog's")).toContain("dog");
  });
  it("자기 자신·두 글자 미만은 내지 않는다", async () => {
    const { lemmaCandidates } = await import("@/lib/lemma");
    expect(lemmaCandidates("cat")).not.toContain("cat");
    expect(lemmaCandidates("is")).toEqual([]);
  });
});

describe("scoreColor", () => {
  it("점수 구간을 색으로 매핑", () => {
    expect(scoreColor(85)).toBe("good");
    expect(scoreColor(70)).toBe("warn");
    expect(scoreColor(40)).toBe("bad");
  });
});

/* ───────── 날짜 (로컬 기준 — UTC 밀림 방지) ───────── */

describe("로컬 날짜 헬퍼", () => {
  it("ymd 는 로컬 연·월·일을 그대로 쓴다", () => {
    // 로컬 자정 — UTC 변환 시 KST(+9)에서는 전날로 밀리는 시각
    expect(ymd(new Date(2026, 6, 24, 0, 0, 0))).toBe("2026-07-24");
    expect(ymd(new Date(2026, 0, 1, 23, 59, 0))).toBe("2026-01-01");
  });

  it("0일 더하면 같은 날 (하루 밀림 회귀 방지)", () => {
    expect(addDaysISO("2026-07-24", 0)).toBe("2026-07-24");
    expect(addDaysISO(todayISO(), 0)).toBe(todayISO());
  });

  it("날짜를 앞뒤로 옮긴다 (월·연 경계 포함)", () => {
    expect(addDaysISO("2026-07-24", 1)).toBe("2026-07-25");
    expect(addDaysISO("2026-07-24", -7)).toBe("2026-07-17");
    expect(addDaysISO("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDaysISO("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysISO("2028-02-28", 1)).toBe("2028-02-29"); // 윤년
  });

  it("최근 7일 창에는 반드시 오늘이 들어간다", () => {
    const today = todayISO();
    const window = Array.from({ length: 7 }, (_, i) =>
      addDaysISO(today, -(6 - i)),
    );
    expect(window).toHaveLength(7);
    expect(window[window.length - 1]).toBe(today);
    expect(new Set(window).size).toBe(7);
  });

  it("diffDaysISO 는 일수 차이를 준다", () => {
    expect(diffDaysISO("2026-07-24", "2026-07-25")).toBe(1);
    expect(diffDaysISO("2026-07-24", "2026-07-24")).toBe(0);
    expect(diffDaysISO("2026-07-24", "2026-07-26")).toBe(2);
  });
});

/* ───────── 학습 무결성 (치팅 방지) ───────── */

describe("coverageRatio", () => {
  it("전체가 0이면 0", () => expect(coverageRatio(0, 0)).toBe(0));
  it("1을 넘지 않는다", () => expect(coverageRatio(12, 10)).toBe(1));
  it("비율을 그대로 돌려준다", () => expect(coverageRatio(9, 10)).toBeCloseTo(0.9));
});

describe("evaluateStamp — 완독 도장 게이트", () => {
  const base = {
    total: 20,
    readCount: 0,
    completed: false,
    hasQuiz: true,
    quizPassed: false,
  };

  it("한 문장도 안 들으면 도장을 못 찍는다 (막 넘기기 차단)", () => {
    const v = evaluateStamp({ ...base, heard: 0 });
    expect(v.ok).toBe(false);
    expect(v.reason).toBe("coverage");
    expect(v.missing).toBe(20);
  });

  it("커버리지가 기준 미만이면 어떤 경우에도 막힌다", () => {
    // 0% ~ 89% 전 구간에서 ok 가 나오면 안 된다
    for (let heard = 0; heard < MIN_COVERAGE * 20; heard++) {
      const v = evaluateStamp({ ...base, heard });
      expect(v.ok, `heard=${heard}`).toBe(false);
      expect(v.reason).toBe("coverage");
    }
  });

  it("90% 이상 들으면 도장을 찍을 수 있다", () => {
    const v = evaluateStamp({ ...base, heard: 18 });
    expect(v.ok).toBe(true);
    expect(v.reason).toBe("ok");
  });

  it("마지막(10번째) 도장은 퀴즈를 통과해야 찍힌다", () => {
    const last = { ...base, heard: 20, readCount: READS_TO_COMPLETE - 1 };
    expect(evaluateStamp(last).ok).toBe(false);
    expect(evaluateStamp(last).reason).toBe("quiz");
    expect(evaluateStamp({ ...last, quizPassed: true }).ok).toBe(true);
  });

  it("퀴즈가 없는 책은 마지막 도장에서 퀴즈를 요구하지 않는다", () => {
    const v = evaluateStamp({
      ...base,
      heard: 20,
      readCount: READS_TO_COMPLETE - 1,
      hasQuiz: false,
    });
    expect(v.ok).toBe(true);
  });

  it("이미 완료한 책은 더 찍히지 않는다", () => {
    const v = evaluateStamp({ ...base, heard: 20, completed: true });
    expect(v.ok).toBe(false);
    expect(v.reason).toBe("already");
  });

  it("도장 횟수가 상한이면 막힌다", () => {
    const v = evaluateStamp({
      ...base,
      heard: 20,
      readCount: READS_TO_COMPLETE,
      quizPassed: true,
    });
    expect(v.ok).toBe(false);
    expect(v.reason).toBe("already");
  });
});

describe("isQuizPassed", () => {
  it("80% 이상이면 통과", () => {
    expect(isQuizPassed(4, 5)).toBe(true);
    expect(isQuizPassed(3, 5)).toBe(false);
    expect(isQuizPassed(0, 0)).toBe(false);
  });
});

/* ───────── 쉐도잉 엔진 ───────── */

const timings: WordTiming[] = [
  { word: "The", startMs: 0, endMs: 200, charStart: 0, charEnd: 3 },
  { word: "cat", startMs: 250, endMs: 600, charStart: 4, charEnd: 7 },
  { word: "sat", startMs: 650, endMs: 1000, charStart: 8, charEnd: 11 },
  { word: "down", startMs: 1050, endMs: 1500, charStart: 12, charEnd: 16 },
];

describe("wordIndexAt", () => {
  it("시작 전에는 -1", () => expect(wordIndexAt(timings, -10)).toBe(-1));
  it("단어 사이 공백에서는 직전 단어를 유지한다", () =>
    expect(wordIndexAt(timings, 620)).toBe(1));
  it("마지막 단어 이후에도 마지막을 유지한다", () =>
    expect(wordIndexAt(timings, 9999)).toBe(3));
});

describe("echoIndexAt — 지연 추적 쉐도잉", () => {
  it("지연 0이면 원어민과 같은 위치(같이 읽기)", () => {
    for (let ms = 0; ms <= 1600; ms += 25)
      expect(echoIndexAt(timings, ms, 0)).toBe(wordIndexAt(timings, ms));
  });

  it("에코는 항상 원어민보다 뒤처진다 (핵심 불변식)", () => {
    for (const delay of [250, 300, 450, 800]) {
      for (let ms = 0; ms <= 2000; ms += 10) {
        expect(
          echoIndexAt(timings, ms, delay),
          `delay=${delay} ms=${ms}`,
        ).toBeLessThanOrEqual(wordIndexAt(timings, ms));
      }
    }
  });

  it("한 단어(450ms) 지연이면 실제로 한 박자 뒤 단어를 가리킨다", () => {
    // 700ms: 원어민은 "sat"(2), 나는 250ms 시점 → "cat"(1)
    expect(wordIndexAt(timings, 700)).toBe(2);
    expect(echoIndexAt(timings, 700, 450)).toBe(1);
  });

  it("음수 지연은 0으로 취급(에코가 앞서지 않는다)", () => {
    expect(echoIndexAt(timings, 700, -500)).toBe(wordIndexAt(timings, 700));
  });
});

describe("SHADOW_STEPS — 사다리", () => {
  it("5단계이며 뒤로 갈수록 지연이 짧아진다", () => {
    expect(SHADOW_STEPS).toHaveLength(5);
    const delays = SHADOW_STEPS.filter((s) => s.delayMs !== null).map(
      (s) => s.delayMs as number,
    );
    // 2단계(0) 이후로는 감소 수열
    const withDelay = SHADOW_STEPS.filter((s) => (s.delayMs ?? 0) > 0);
    for (let i = 1; i < withDelay.length; i++)
      expect(withDelay[i].delayMs!).toBeLessThan(withDelay[i - 1].delayMs!);
    expect(delays.every((d) => d >= 0)).toBe(true);
  });

  it("단계가 오를수록 원어민 볼륨은 커지지 않는다(내 목소리 확보)", () => {
    for (let i = 1; i < SHADOW_STEPS.length; i++)
      expect(SHADOW_STEPS[i].volume).toBeLessThanOrEqual(
        SHADOW_STEPS[i - 1].volume,
      );
  });

  it("마지막 단계만 텍스트를 가린다", () => {
    expect(SHADOW_STEPS.filter((s) => s.hideText)).toHaveLength(1);
    expect(SHADOW_STEPS[SHADOW_STEPS.length - 1].hideText).toBe(true);
  });
});

/* ───────── 퀘스트 ───────── */

describe("allQuestsDone", () => {
  it("빈 하루는 미완료", () => expect(allQuestsDone(emptyDay())).toBe(false));
  it("셋 다 채우면 완료", () =>
    expect(
      allQuestsDone({ ...emptyDay(), books: 1, words: 10, shadow: 5 }),
    ).toBe(true));
  it("하나라도 모자라면 미완료", () =>
    expect(
      allQuestsDone({ ...emptyDay(), books: 1, words: 9, shadow: 5 }),
    ).toBe(false));
});

/* ───────── 단어 문제 생성기 ───────── */

const W = (o: Partial<QuizWord> & { english: string; korean: string }): QuizWord => ({
  emoji: "🍎",
  example: "",
  exampleKo: "",
  level: 1,
  ...o,
});

const pool: QuizWord[] = [
  W({ english: "apple", korean: "사과", example: "I eat an apple." }),
  W({ english: "banana", korean: "바나나", example: "The banana is yellow." }),
  W({ english: "cat", korean: "고양이", example: "The cat is cute." }),
  W({ english: "dog", korean: "개", example: "I have a dog." }),
  W({ english: "book", korean: "책", example: "I read a book." }),
  W({ english: "water", korean: "물", example: "I drink water." }),
];

/** 결정적 rng — 항상 첫 요소를 고르게 해 스냅샷 가능한 결과를 만든다 */
const rng0 = () => 0;

describe("kindsForBox", () => {
  it("박스가 오를수록 산출형 문제가 나온다", () => {
    expect(kindsForBox(0)).toContain("listen");
    expect(kindsForBox(3)).toContain("cloze");
    expect(kindsForBox(5)).toContain("spell");
  });
});

describe("buildWordQuestion", () => {
  it("모든 박스에서 유효한 문제를 만든다", () => {
    for (let box = 0; box <= 5; box++) {
      for (const w of pool) {
        const q = buildWordQuestion(w, box, pool);
        expect(q.word.english).toBe(w.english);
        if (q.kind === "spell") {
          expect(q.letters!.sort().join("")).toBe(
            w.english.split("").sort().join(""),
          );
        } else {
          expect(q.options).toHaveLength(4);
          expect(q.answerIndex).toBeGreaterThanOrEqual(0);
          expect(q.answerIndex).toBeLessThan(4);
          // 보기 중복 없음
          expect(new Set(q.options).size).toBe(4);
        }
      }
    }
  });

  it("정답 보기는 실제 정답과 일치한다", () => {
    const q = buildWordQuestion(pool[0], 0, pool, rng0);
    expect(q.options[q.answerIndex]).toBe(pool[0].korean);
  });

  it("빈칸 문제는 대상 단어를 실제로 가린다", () => {
    const w = pool[0]; // "I eat an apple."
    const q = buildWordQuestion(w, 3, pool, rng0);
    if (q.kind === "cloze") {
      expect(q.sentence).toContain("______");
      expect(q.sentence!.toLowerCase()).not.toContain("apple");
      expect(q.options[q.answerIndex]).toBe("apple");
    }
  });

  it("예문이 없으면 빈칸 문제 대신 다른 유형으로 강등된다", () => {
    const noExample = W({ english: "zebra", korean: "얼룩말" });
    const q = buildWordQuestion(noExample, 3, pool);
    expect(q.kind).not.toBe("cloze");
    expect(q.options).toHaveLength(4);
  });

  it("너무 긴 단어는 철자 문제로 내지 않는다", () => {
    const long = W({ english: "refrigerator", korean: "냉장고" });
    const q = buildWordQuestion(long, 5, pool);
    expect(q.kind).not.toBe("spell");
  });
});

describe("checkSpelling", () => {
  const w = pool[0];
  it("대소문자를 무시하고 채점한다", () => {
    expect(checkSpelling(w, "APPLE")).toBe(true);
    expect(checkSpelling(w, " apple ")).toBe(true);
    expect(checkSpelling(w, "aple")).toBe(false);
  });
});

describe("shuffle", () => {
  it("원본을 바꾸지 않고 같은 원소를 돌려준다", () => {
    const src = [1, 2, 3, 4, 5];
    const out = shuffle(src);
    expect(src).toEqual([1, 2, 3, 4, 5]);
    expect(out.sort()).toEqual(src);
  });
});

describe("레벨 진단", () => {
  it("10문항(레벨당 2개)을 만든다", () => {
    expect(buildPlacement()).toHaveLength(10);
  });

  it("다 맞히면 상위 레벨을, 초반에 틀리면 1을 추천한다", () => {
    const all = [1, 2, 3, 4, 5].flatMap((level) => [
      { level, correct: true },
      { level, correct: true },
    ]);
    expect(recommendLevel(all)).toBe(5);
    expect(
      recommendLevel([
        { level: 1, correct: false },
        { level: 1, correct: true },
      ]),
    ).toBe(1);
    expect(
      recommendLevel([
        { level: 1, correct: true },
        { level: 1, correct: true },
        { level: 2, correct: false },
        { level: 2, correct: true },
      ]),
    ).toBe(2);
  });
});

describe("Leitner 복습 간격 (boxIntervalDays)", () => {
  it("박스 1~4 간격이 설계값과 일치한다", () => {
    expect(boxIntervalDays(1)).toBe(1);
    expect(boxIntervalDays(2)).toBe(3);
    expect(boxIntervalDays(3)).toBe(7);
    expect(boxIntervalDays(4)).toBe(21);
  });

  it("마스터(박스5)는 60일 뒤 망각 재검 — 21일로 되돌아가는 회귀 방지", () => {
    // 과거 BOX_DAYS[box-1] 로 인덱싱해 box5 가 21일을 쓰고
    // 60일 값은 영영 도달하지 못하는 버그가 있었다.
    expect(boxIntervalDays(5)).toBe(60);
  });

  it("범위를 벗어난 박스도 최장 간격으로 안전하게 떨어진다", () => {
    expect(boxIntervalDays(6)).toBe(60);
    expect(boxIntervalDays(99)).toBe(60);
  });
});

describe("스트릭·프리즈 전이 (nextStreak)", () => {
  it("어제 학습했으면 연속 +1, 프리즈는 그대로", () => {
    expect(nextStreak({ streak: 3, freezes: 2 }, 1)).toEqual({
      streak: 4,
      freezes: 2,
    });
  });

  it("하루 결석 + 프리즈 보유 → 프리즈 1개 쓰고 연속 유지", () => {
    expect(nextStreak({ streak: 3, freezes: 2 }, 2)).toEqual({
      streak: 4,
      freezes: 1,
    });
  });

  it("하루 결석인데 프리즈가 없으면 1로 리셋", () => {
    expect(nextStreak({ streak: 9, freezes: 0 }, 2)).toEqual({
      streak: 1,
      freezes: 0,
    });
  });

  it("이틀 이상 결석은 프리즈가 있어도 리셋된다(프리즈는 소모하지 않음)", () => {
    expect(nextStreak({ streak: 9, freezes: 3 }, 3)).toEqual({
      streak: 1,
      freezes: 3,
    });
  });

  it("첫 학습(이전 기록 없음)은 연속 1부터 시작", () => {
    expect(nextStreak({ streak: 0, freezes: 0 }, 999)).toEqual({
      streak: 1,
      freezes: 0,
    });
  });
});

/**
 * 🔴 자산 무결성 — '듣고 고르기'는 단어를 화면에 보여주지 않는다.
 * 발음 mp3 가 없으면 아이는 소리도 글자도 없이 4지선다를 찍어야 하고,
 * 그 결과가 Leitner 박스에 그대로 기록된다. "검증된 학습"의 근간이 무너지는 결함이라
 * 데이터 쪽에서 막는다.
 *
 * 실측 사고(2026-08-10): gen-word-audio 가 **책 본문 단어만** 대상으로 삼아
 * 그림책에 안 나오는 학술 어휘가 통째로 빠졌다 — 1000개 중 403개 결손, 레벨5는 92%.
 * 라이브에서 실제로 404 였고 화면엔 아무 경고도 없었다.
 */
describe("자산 무결성 — 학습 단어 발음", () => {
  it("ewords 1000개 전부 발음 mp3 가 실재한다", async ({ skip }) => {
    const { existsSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { ewords } = await import("@/data/ewords");
    const { wordAudioBase } = await import("@/lib/utils");

    const dir = join(process.cwd(), "public", "seed", "_words");
    // 대회 제출 ZIP 은 용량 때문에 public/seed(1.8GB)를 뺀 소스만 담는다.
    // 그 상태로 pnpm test 를 돌리면 "에셋이 없다"는 이유로 실패해 버려,
    // 코드 결함이 아닌 것을 결함으로 보고하게 된다 → 에셋이 아예 없으면 건너뛴다.
    // (에셋을 포함한 저장소·개발 환경에서는 정상적으로 검사된다.)
    if (!existsSync(dir)) {
      skip();
      return;
    }

    const missing = ewords
      .map((w) => ({ w: w.english, f: join(dir, `${wordAudioBase(w.english)}.mp3`) }))
      .filter(({ f }) => !existsSync(f) || statSync(f).size < 300)
      .map(({ w }) => w);

    expect(
      missing,
      `발음 mp3 결손 ${missing.length}개 — 'pnpm seed:words' 로 생성하세요. 예: ${missing.slice(0, 8).join(", ")}`,
    ).toEqual([]);
  });
});

/**
 * 🔴 사전 커버리지 — 본문에 나온 단어를 아이가 탭했는데 한글 뜻이 안 뜨면
 * 그건 "사전 정보를 못 찾았다"가 아니라 콘텐츠 결손이다.
 *
 * 실측 사고(2026-08-25): 책을 추가하고 `pnpm seed:worddict` 를 다시 돌리지 않아
 * dict.json 이 낡은 채로 배포됐다 — 본문 고유단어 4,478개 중 **977개(92권)** 가
 * 한글 뜻 없음. 화면엔 경고 대신 외부 사전의 영어 예문("the waddle of a duck")만
 * 떴다. qa-seed.mjs 에 WARN 이 있었지만 아무도 안 봤다 → 테스트로 내린다.
 */
describe("사전 커버리지 — 본문 단어 한글 뜻", () => {
  it("모든 책의 본문 단어에 한글 뜻이 있다", async ({ skip }) => {
    const { existsSync, readFileSync, readdirSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { tokenizeWords, normalizeWord } = await import("@/lib/utils");
    const { lemmaCandidates } = await import("@/lib/lemma");

    const dictFile = join(process.cwd(), "public", "dict.json");
    const seedDir = join(process.cwd(), "data", "seed");
    // dict.json 은 `pnpm seed:content` 산출물 — 없는 체크아웃에선 건너뛴다.
    if (!existsSync(dictFile) || !existsSync(seedDir)) {
      skip();
      return;
    }

    const dict = JSON.parse(readFileSync(dictFile, "utf8")) as Record<
      string,
      { meaning_ko?: string }
    >;
    const known = (w: string) => Boolean(dict[w]?.meaning_ko);

    const missing = new Map<string, string>(); // 단어 → 처음 발견된 책
    for (const f of readdirSync(seedDir).filter(
      (x) => x.endsWith(".json") && !x.startsWith("_"),
    )) {
      const book = JSON.parse(readFileSync(join(seedDir, f), "utf8")) as {
        words?: Record<string, { meaning_ko?: string }>;
        pages: { sentences: { text: string }[] }[];
      };
      for (const p of book.pages)
        for (const s of p.sentences)
          for (const t of tokenizeWords(s.text)) {
            const w = normalizeWord(t.word);
            if (!w || /^[0-9-]+$/.test(w) || missing.has(w)) continue;
            if (book.words?.[w]?.meaning_ko || known(w)) continue;
            if (lemmaCandidates(w).some(known)) continue;
            missing.set(w, f.replace(/\.json$/, ""));
          }
    }

    const list = [...missing].map(([w, b]) => `${w}(${b})`);
    expect(
      list,
      `한글 뜻 없는 본문 단어 ${list.length}개 — 'pnpm seed:worddict' 로 생성하세요. 예: ${list.slice(0, 8).join(", ")}`,
    ).toEqual([]);
  });
});

/**
 * 🔴 정규화 규칙 단일화 — 토큰화/정규화 규칙은 src/lib/utils.ts 와
 * scripts/_word-norm.mjs 두 구현으로 존재한다(.mjs 스크립트가 tsx 없이 돌아야 해서).
 * 예전엔 이 규칙이 스크립트 3곳에 각각 복붙돼 있어 utils.ts 를 고쳐도 따라오지 않았다.
 * 두 구현이 어긋나면 dict.json 키와 앱의 조회 키가 갈라져 단어 뜻이 통째로 샌다.
 */
describe("정규화 규칙 단일화 — utils.ts ↔ scripts/_word-norm.mjs", () => {
  it("같은 입력에 같은 결과를 낸다", async () => {
    const { normalizeWord, wordAudioBase } = await import("@/lib/utils");
    const mjs = await import("../../../scripts/_word-norm.mjs");
    const samples = [
      "Sky!",
      '"Hello,"',
      "'brave",
      "grandparents'",
      "don't",
      "grown-ups",
      "Tae's",
      "K-Pop",
      "-well-",
      "waddles",
      "'",
      "1",
    ];
    for (const s of samples) {
      expect(mjs.normalizeWord(s), `normalizeWord("${s}")`).toBe(
        normalizeWord(s),
      );
      expect(mjs.wordAudioBase(s), `wordAudioBase("${s}")`).toBe(
        wordAudioBase(s),
      );
    }
  });
});
