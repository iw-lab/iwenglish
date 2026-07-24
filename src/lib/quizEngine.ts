/**
 * 단어 문제 생성기 — "알아요/몰라요" 자가신고를 객관식 채점으로 대체한다.
 *
 * 기존 데이터(초등 영단어 1000: 뜻·이모지·예문·발음 mp3)만으로 5가지 유형을 만든다.
 * Leitner 박스가 올라갈수록 인식(고르기) → 산출(쓰기/철자) 로 난이도가 오른다.
 */

import { ewords } from "@/data/ewords";

/** 문제 생성에 필요한 최소 단어 정보 (ewords / 내 단어장 공통) */
export interface QuizWord {
  english: string;
  korean: string;
  emoji: string;
  example: string;
  exampleKo: string;
  level: number;
}

export type WordQuestionKind = "listen" | "en2ko" | "ko2en" | "cloze" | "spell";

export interface WordQuestion {
  kind: WordQuestionKind;
  word: QuizWord;
  /** 한국어 지시문 */
  prompt: string;
  /** 4지선다 보기 (spell 은 비어 있음) */
  options: string[];
  answerIndex: number;
  /** cloze: 빈칸이 들어간 예문 */
  sentence?: string;
  /** spell: 섞인 글자 타일 */
  letters?: string[];
}

type Rng = () => number;

/** Fisher-Yates — rng 주입으로 테스트에서 결정적으로 만들 수 있다 */
export function shuffle<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const r = [...arr];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export const toQuizWord = (w: {
  english: string;
  korean: string;
  emoji: string;
  example: string;
  exampleKo: string;
  level: number;
}): QuizWord => w;

/** 오답 보기 뽑기 — 같은 레벨 우선, 부족하면 전체에서 채운다 */
function distractors(
  target: QuizWord,
  pool: readonly QuizWord[],
  pick: (w: QuizWord) => string,
  rng: Rng,
  count = 3,
): string[] {
  const answer = pick(target);
  const seen = new Set([answer.toLowerCase()]);
  const take = (list: readonly QuizWord[]) => {
    const out: string[] = [];
    for (const w of shuffle(list, rng)) {
      const v = pick(w);
      if (!v || seen.has(v.toLowerCase())) continue;
      seen.add(v.toLowerCase());
      out.push(v);
      if (out.length >= count) break;
    }
    return out;
  };
  const sameLevel = pool.filter(
    (w) => w.level === target.level && w.english !== target.english,
  );
  const got = take(sameLevel);
  if (got.length >= count) return got.slice(0, count);
  const rest = pool.filter(
    (w) => w.english !== target.english && !sameLevel.includes(w),
  );
  return [...got, ...take(rest)].slice(0, count);
}

/** 예문에서 대상 단어를 빈칸으로 — 단어가 예문에 없으면 null */
function clozeSentence(w: QuizWord): string | null {
  if (!w.example) return null;
  const re = new RegExp(
    `\\b${w.english.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
    "i",
  );
  if (!re.test(w.example)) return null;
  return w.example.replace(re, "______");
}

/** 4지선다 조립 — 정답을 무작위 위치에 넣고 answerIndex 를 맞춰 반환 */
function mcq(answer: string, wrong: string[], rng: Rng) {
  const options = shuffle([answer, ...wrong], rng);
  return { options, answerIndex: options.indexOf(answer) };
}

/**
 * Leitner 박스에 맞는 문제 유형 후보.
 * 박스 0~1(처음 만난 단어)=인식, 2~3=산출 초입, 4~5=철자까지.
 */
export function kindsForBox(box: number): WordQuestionKind[] {
  if (box <= 1) return ["listen", "en2ko"];
  if (box <= 3) return ["ko2en", "cloze"];
  return ["spell", "cloze"];
}

/**
 * 단어 하나로 문제 1개 생성. 선택한 유형이 그 단어에 불가능하면
 * (예문 없음·철자 너무 김) 가능한 유형으로 자동 강등한다.
 */
export function buildWordQuestion(
  word: QuizWord,
  box: number,
  pool: readonly QuizWord[] = ewords,
  rng: Rng = Math.random,
): WordQuestion {
  const candidates = shuffle(kindsForBox(box), rng);
  for (const kind of candidates) {
    const q = tryBuild(kind, word, pool, rng);
    if (q) return q;
  }
  // 최후 폴백 — en2ko 는 어떤 단어에서도 만들 수 있다
  return tryBuild("en2ko", word, pool, rng)!;
}

function tryBuild(
  kind: WordQuestionKind,
  word: QuizWord,
  pool: readonly QuizWord[],
  rng: Rng,
): WordQuestion | null {
  switch (kind) {
    case "listen": {
      const { options, answerIndex } = mcq(
        word.korean,
        distractors(word, pool, (w) => w.korean, rng),
        rng,
      );
      return {
        kind,
        word,
        prompt: "잘 듣고 알맞은 뜻을 고르세요",
        options,
        answerIndex,
      };
    }
    case "en2ko": {
      const { options, answerIndex } = mcq(
        word.korean,
        distractors(word, pool, (w) => w.korean, rng),
        rng,
      );
      return {
        kind,
        word,
        prompt: `“${word.english}” 의 뜻은?`,
        options,
        answerIndex,
      };
    }
    case "ko2en": {
      const { options, answerIndex } = mcq(
        word.english,
        distractors(word, pool, (w) => w.english, rng),
        rng,
      );
      return {
        kind,
        word,
        prompt: `“${word.korean}” 을(를) 영어로 쓰면?`,
        options,
        answerIndex,
      };
    }
    case "cloze": {
      const sentence = clozeSentence(word);
      if (!sentence) return null;
      const { options, answerIndex } = mcq(
        word.english,
        distractors(word, pool, (w) => w.english, rng),
        rng,
      );
      return {
        kind,
        word,
        prompt: "빈칸에 알맞은 단어를 고르세요",
        sentence,
        options,
        answerIndex,
      };
    }
    case "spell": {
      const letters = word.english.replace(/[^a-zA-Z]/g, "");
      // 3글자 미만은 너무 쉽고, 9글자 이상은 초등에게 가혹 → 다른 유형으로
      if (letters.length < 3 || letters.length > 8) return null;
      return {
        kind,
        word,
        prompt: `“${word.korean}” — 글자를 눌러 단어를 완성하세요`,
        options: [],
        answerIndex: -1,
        letters: shuffle(letters.split(""), rng),
      };
    }
  }
}

/** 철자 문제 채점 (대소문자 무시) */
export function checkSpelling(word: QuizWord, typed: string): boolean {
  return (
    typed.trim().toLowerCase() ===
    word.english.replace(/[^a-zA-Z]/g, "").toLowerCase()
  );
}

/* ───────────────────────── 레벨 진단(배치 테스트) ───────────────────────── */

/** 레벨 1~5 에서 2문항씩, 쉬운 것부터 10문항 */
export function buildPlacement(rng: Rng = Math.random): WordQuestion[] {
  const qs: WordQuestion[] = [];
  for (let lv = 1; lv <= 5; lv++) {
    const bucket = ewords.filter((w) => w.level === lv);
    for (const w of shuffle(bucket, rng).slice(0, 2)) {
      const q = tryBuild("en2ko", w, ewords, rng);
      if (q) qs.push(q);
    }
  }
  return qs;
}

/**
 * 진단 결과 → 추천 시작 레벨.
 * 레벨별 2문항 중 하나라도 틀리기 시작하는 지점을 시작점으로 본다(최소 1, 최대 5).
 */
export function recommendLevel(results: { level: number; correct: boolean }[]): number {
  const byLevel = new Map<number, { ok: number; total: number }>();
  for (const r of results) {
    const cur = byLevel.get(r.level) ?? { ok: 0, total: 0 };
    cur.total += 1;
    if (r.correct) cur.ok += 1;
    byLevel.set(r.level, cur);
  }
  let level = 1;
  for (let lv = 1; lv <= 5; lv++) {
    const s = byLevel.get(lv);
    if (!s || s.total === 0) break;
    if (s.ok === s.total) level = Math.min(5, lv + 1);
    else break;
  }
  return level;
}
