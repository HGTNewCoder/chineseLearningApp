// Numbers behind the home dashboard. Pure functions of saved progress and `now`.
import { MAX_BOX, type Card } from './srs';
import { dayKey } from './streak';
import { LESSONS, LEVELS } from './vocab';

export interface DayCount {
  /** Local calendar day, YYYY-MM-DD. */
  day: string;
  date: Date;
  count: number;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Words practiced on each of the last `n` days, oldest first, ending today. */
export function lastDays(activity: Record<string, number>, n: number, now: Date): DayCount[] {
  const today = startOfDay(now);
  return Array.from({ length: n }, (_, i) => {
    const date = addDays(today, i - n + 1);
    const day = dayKey(date);
    return { day, date, count: activity[day] ?? 0 };
  });
}

/**
 * Calendar grid for a heatmap: `weeks` columns of Monday-to-Sunday days, the
 * last column holding this week. Days after today are null.
 */
export function heatmapWeeks(activity: Record<string, number>, weeks: number, now: Date): (DayCount | null)[][] {
  const today = startOfDay(now);
  const mondayOffset = (today.getDay() + 6) % 7;
  const firstMonday = addDays(today, -mondayOffset - (weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(firstMonday, w * 7 + d);
      if (date > today) return null;
      const day = dayKey(date);
      return { day, date, count: activity[day] ?? 0 };
    }),
  );
}

/** Longest run of consecutive active days ever. */
export function bestStreak(activity: Record<string, number>): number {
  const days = Object.keys(activity)
    .filter((d) => activity[d] > 0)
    .sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of days) {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    run = prev && dayKey(addDays(prev, 1)) === key ? run + 1 : 1;
    best = Math.max(best, run);
    prev = date;
  }
  return best;
}

export const STAGES = ['New', 'Learning', 'Familiar', 'Strong', 'Mastered'] as const;

/** How many words sit in each review box (index 0 = box 1). */
export function stageCounts(srs: Record<string, Card>): number[] {
  const counts = new Array<number>(MAX_BOX).fill(0);
  for (const card of Object.values(srs)) counts[Math.min(Math.max(card.box, 1), MAX_BOX) - 1]++;
  return counts;
}

export interface LevelProgress {
  hsk: number;
  total: number;
  learned: number;
  mastered: number;
}

/** Words learned (in the review deck) and mastered per HSK level. */
export function levelProgress(srs: Record<string, Card>): LevelProgress[] {
  return LEVELS.map((hsk) => {
    const ids = LESSONS.filter((l) => l.hsk === hsk).flatMap((l) => l.wordIds);
    const cards = ids.map((id) => srs[id]).filter(Boolean);
    return {
      hsk,
      total: ids.length,
      learned: cards.length,
      mastered: cards.filter((c) => c.box >= MAX_BOX).length,
    };
  });
}
