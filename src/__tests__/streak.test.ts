import { addActivity, currentStreak, dayKey } from '../lib/streak';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);

describe('streaks', () => {
  it('formats local days', () => {
    expect(dayKey(at(2026, 3, 7))).toBe('2026-03-07');
  });

  it('counts consecutive active days ending today', () => {
    const activity = { '2026-03-05': 4, '2026-03-06': 1, '2026-03-07': 2 };
    expect(currentStreak(activity, at(2026, 3, 7))).toBe(3);
  });

  it('keeps yesterday’s streak alive until today ends', () => {
    const activity = { '2026-03-05': 4, '2026-03-06': 1 };
    expect(currentStreak(activity, at(2026, 3, 7, 23))).toBe(2);
  });

  it('breaks on a missed day', () => {
    const activity = { '2026-03-04': 4, '2026-03-06': 1 };
    expect(currentStreak(activity, at(2026, 3, 8))).toBe(0);
    expect(currentStreak(activity, at(2026, 3, 6))).toBe(1);
  });

  it('crosses month boundaries', () => {
    const activity = { '2026-02-28': 1, '2026-03-01': 1 };
    expect(currentStreak(activity, at(2026, 3, 1))).toBe(2);
  });

  it('adds activity to the current day', () => {
    const now = at(2026, 3, 7);
    expect(addActivity(addActivity({}, now), now, 2)).toEqual({ '2026-03-07': 3 });
  });
});
