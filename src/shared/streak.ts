import { istToday, addDays } from "./ist";

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
}

/**
 * Streak calculation — exact port of the Java StreakCalculator.
 * `presentDates` are ISO `YYYY-MM-DD` strings (days the user was present).
 *
 * - longest: longest run of consecutive calendar days anywhere in history.
 * - current: run ending today (IST), or ending yesterday if today is absent.
 */
export function calculateStreak(presentDates: string[]): StreakResult {
  if (!presentDates || presentDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const sorted = [...presentDates].sort();
  const set = new Set(sorted);

  let longest = 1;
  let running = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (cur === addDays(prev, 1)) {
      running++;
      longest = Math.max(longest, running);
    } else if (cur !== prev) {
      running = 1;
    }
  }

  const today = istToday();
  const yesterday = addDays(today, -1);
  let current = 0;
  if (set.has(today)) {
    current = 1;
    let cursor = addDays(today, -1);
    while (set.has(cursor)) {
      current++;
      cursor = addDays(cursor, -1);
    }
  } else if (set.has(yesterday)) {
    current = 1;
    let cursor = addDays(yesterday, -1);
    while (set.has(cursor)) {
      current++;
      cursor = addDays(cursor, -1);
    }
  }

  return { currentStreak: current, longestStreak: longest };
}

/**
 * Longest run of consecutive calendar days within a date list (e.g. days present in one month).
 * Unlike lifetime streak badges, Student of the Month uses only dates inside that month.
 */
export function longestConsecutiveStreak(presentDates: string[]): number {
  if (!presentDates || presentDates.length === 0) return 0;
  const sorted = [...presentDates].sort();
  let longest = 1;
  let running = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (cur === addDays(prev, 1)) {
      running++;
      longest = Math.max(longest, running);
    } else if (cur !== prev) {
      running = 1;
    }
  }
  return longest;
}
