/**
 * 시연영상용 샘플 학습 기록.
 *
 * ⚠️ 보호자 리포트는 "지난 7일"을 그리므로 빈 스토어로는 그래프가 비어 버린다.
 *    영상에서 이 화면은 샘플 기록으로 채우고, 화면에 그 사실을 자막으로 밝힌다.
 *    (실제 앱 동작을 조작하는 게 아니라, 며칠 쓴 상태를 재현하는 것뿐이다.)
 */
const iso = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().slice(0, 10);
};

/** 지난 7일 — 하루도 빠짐없이는 부자연스러우니 하루는 쉰 것으로 둔다. */
// 주간 합계가 누적 지표와 어긋나면 안 된다(주간 완독 ≤ booksFinished, 주간 쉐도잉 ≤ shadowTotal).
const DAYS = [
  { back: 6, words: 8, shadow: 14, books: 1, minutes: 11 },
  { back: 5, words: 10, shadow: 22, books: 1, minutes: 16 },
  { back: 4, words: 0, shadow: 0, books: 0, minutes: 0 },
  { back: 3, words: 7, shadow: 18, books: 1, minutes: 13 },
  { back: 2, words: 11, shadow: 26, books: 0, minutes: 19 },
  { back: 1, words: 6, shadow: 20, books: 1, minutes: 14 },
  { back: 0, words: 4, shadow: 12, books: 0, minutes: 8 },
];

const daily = {};
for (const d of DAYS) {
  daily[iso(d.back)] = {
    words: d.words,
    shadow: d.shadow,
    books: d.books,
    minutes: d.minutes,
    xp: d.words * 4 + d.books * 20,
  };
}

/**
 * 박스 4~5 는 철자 입력형 문제가 나온다(kindsForBox). 시연에서는 4지선다 화면이
 * 훨씬 잘 읽히므로, 오늘 복습 대기열에는 박스 1~3 만 올리고 박스 5 단어는
 * 복습일을 뒤로 미뤄 "마스터 3개" 통계에만 잡히게 둔다.
 */
const WORDS = [
  ["frog", 2], ["leaf", 3], ["rain", 1], ["puddle", 2], ["forest", 3],
  ["quiet", 1], ["morning", 2], ["yellow", 3], ["friend", 2], ["garden", 1],
  ["window", 3], ["shadow", 2],
];
const MASTERED = [["butterfly", 5], ["autumn", 5], ["basket", 5]];

const leitner = {};
for (const [w, box] of WORDS) {
  leitner[w] = {
    box,
    correct: box + 2,
    wrong: 1,
    lastReview: iso(2),
    nextReview: iso(0), // 오늘 복습 예정 — "오늘의 복습" 이 열려 있어야 시연이 된다
  };
}
for (const [w, box] of MASTERED) {
  leitner[w] = { box, correct: 9, wrong: 0, lastReview: iso(1), nextReview: iso(-30) };
}

/** zustand persist 포맷 그대로 — localStorage["echotale-progress"] */
export const seededProgress = {
  state: {
    xp: 640,
    streak: 4,
    longestStreak: 6,
    lastActiveDate: iso(0),
    todayDate: iso(0),
    todayWords: 9,
    todayXp: 56,
    dailyGoal: 10,
    booksFinished: ["green-frog-hop", "one-yellow-leaf", "little-star-map", "pink-cupcake-day"],
    bookReads: { "green-frog-hop": 3, "little-star-map": 2, "pink-cupcake-day": 1 },
    booksCompleted: [],
    sessions: [],
    leitner,
    achievements: [],
    daily,
    quizPassed: { "green-frog-hop": true },
    shadowStep: {},
    shadowTotal: 112,
    freezes: 1,
    questBonusDate: "",
    placementLevel: 2,
    onboarded: true,
  },
  version: 0,
};

/** 온보딩만 넘긴 깨끗한 상태 — 치팅 차단 시연은 기록이 없어야 한다. */
export const cleanProgress = {
  state: {
    xp: 0, streak: 0, longestStreak: 0,
    lastActiveDate: "", todayDate: iso(0), todayWords: 0, todayXp: 0,
    dailyGoal: 10, booksFinished: [], bookReads: {}, booksCompleted: [],
    sessions: [], leitner: {}, achievements: [], daily: {},
    quizPassed: {}, shadowStep: {}, shadowTotal: 0, freezes: 0,
    questBonusDate: "", placementLevel: 0, onboarded: true,
  },
  version: 0,
};
