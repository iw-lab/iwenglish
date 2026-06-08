import { addDays } from "date-fns";

export interface SrsState {
  ef: number;
  repetitions: number;
  intervalDays: number;
  dueDate: Date;
}

/**
 * SM-2 간격반복 알고리즘.
 * q: 자가평가 0~5 (3 미만 = 실패 → 처음부터)
 */
export function sm2(
  q: number,
  prev: { ef: number; repetitions: number; intervalDays: number },
  now: Date,
): SrsState {
  let { ef, repetitions, intervalDays } = prev;

  if (q < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    ef = Math.max(1.3, ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    repetitions += 1;
    intervalDays =
      repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(intervalDays * ef);
  }

  return {
    ef,
    repetitions,
    intervalDays,
    dueDate: addDays(now, intervalDays),
  };
}
