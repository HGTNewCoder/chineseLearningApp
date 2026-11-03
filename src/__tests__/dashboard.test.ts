import { bestStreak, heatmapWeeks, lastDays, levelProgress, stageCounts } from '../lib/dashboard';
import type { Card } from '../lib/srs';

// Wednesday 2026-03-11, mid-afternoon local time.
const NOW = new Date(2026, 2, 11, 15, 0);
const at = (day: number, hour = 9) => new Date(2026, 2, day, hour).getTime();
const card = (box: number, nextDue: number, reviews = 0, lapses = 0): Card => ({
  box,
  nextDue,
  lastReviewed: reviews ? nextDue - 1 : null,
  reviews,
  lapses,
});

describe('lastDays', () => {
  it('lists each day oldest first, ending today, with zeros for quiet days', () => {
    const days = lastDays({ '2026-03-09': 4, '2026-03-11': 2 }, 3, NOW);
    expect(days.map((d) => [d.day, d.count])).toEqual([
      ['2026-03-09', 4],
      ['2026-03-10', 0],
      ['2026-03-11', 2],
    ]);
  });
});

describe('heatmapWeeks', () => {
  it('builds Monday-first weeks ending this week, with future days empty', () => {
    const weeks = heatmapWeeks({ '2026-03-02': 1 }, 2, NOW);
    expect(weeks[0][0]).toMatchObject({ day: '2026-03-02', count: 1 }); // Monday of last week
    expect(weeks[1][2]).toMatchObject({ day: '2026-03-11' }); // today, a Wednesday
    expect(weeks[1].slice(3)).toEqual([null, null, null, null]);
  });
});

describe('bestStreak', () => {
  it('finds the longest run of active days, across month ends', () => {
    expect(bestStreak({})).toBe(0);
    expect(bestStreak({ '2026-02-27': 1, '2026-02-28': 2, '2026-03-01': 1, '2026-03-05': 3, '2026-03-06': 0 })).toBe(3);
  });
});

describe('stageCounts', () => {
  it('counts words per review stage', () => {
    const srs = { a: card(1, at(11), 2, 1), b: card(1, at(11)), c: card(3, at(14), 4, 0), d: card(5, at(20), 4, 1) };
    expect(stageCounts(srs)).toEqual([2, 0, 1, 0, 1]);
  });
});

describe('levelProgress', () => {
  it('reports learned and mastered words for every HSK level', () => {
    const levels = levelProgress({ 一: card(5, at(20)), 我: card(2, at(12)) });
    expect(levels.map((l) => l.hsk)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(levels[0]).toMatchObject({ learned: 2, mastered: 1 });
    expect(levels[0].total).toBeGreaterThan(100);
  });
});
