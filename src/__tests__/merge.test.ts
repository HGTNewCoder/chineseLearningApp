import { newCard, review, type Card } from '../lib/srs';
import { createInitialState, DEFAULT_SETTINGS, type AppState } from '../lib/storage';
import { mergeStates } from '../sync/merge';

const T = Date.UTC(2026, 2, 1);
const state = (patch: Partial<AppState>): AppState => ({ ...createInitialState(), ...patch });
const reviewed = (at: number, box = 2, reviews = 1): Card => ({ ...newCard(at), box, lastReviewed: at, reviews });

describe('mergeStates', () => {
  it('keeps the most recently reviewed version of each card', () => {
    const local = state({ srs: { a: reviewed(T + 10, 3), b: reviewed(T) } });
    const remote = state({ srs: { a: reviewed(T + 5, 2), c: reviewed(T) } });
    const merged = mergeStates(local, remote);
    expect(merged.srs.a.box).toBe(3);
    expect(Object.keys(merged.srs).sort()).toEqual(['a', 'b', 'c']);
  });

  it('never replaces review history with a newer unreviewed copy', () => {
    const learnedHere = newCard(T + 100); // learned later on this device, never reviewed
    const reviewedThere = review(newCard(T), true, T + 50);
    expect(mergeStates(state({ srs: { a: learnedHere } }), state({ srs: { a: reviewedThere } })).srs.a).toBe(reviewedThere);
    expect(mergeStates(state({ srs: { a: reviewedThere } }), state({ srs: { a: learnedHere } })).srs.a).toBe(reviewedThere);
  });

  it('unions lesson progress', () => {
    const local = state({ lessons: { l1: { completedWordIds: ['a', 'b'] } } });
    const remote = state({ lessons: { l1: { completedWordIds: ['b', 'c'] }, l2: { completedWordIds: ['d'] } } });
    const merged = mergeStates(local, remote);
    expect(merged.lessons.l1.completedWordIds.sort()).toEqual(['a', 'b', 'c']);
    expect(merged.lessons.l2.completedWordIds).toEqual(['d']);
  });

  it('takes the larger daily activity count', () => {
    const merged = mergeStates(state({ activity: { d1: 3, d2: 1 } }), state({ activity: { d1: 5, d3: 2 } }));
    expect(merged.activity).toEqual({ d1: 5, d2: 1, d3: 2 });
  });

  it('uses the most recently changed settings', () => {
    const local = state({ settings: { ...DEFAULT_SETTINGS, dailyGoal: 20 }, settingsUpdatedAt: T + 1 });
    const remote = state({ settings: { ...DEFAULT_SETTINGS, dailyGoal: 5 }, settingsUpdatedAt: T });
    expect(mergeStates(local, remote).settings.dailyGoal).toBe(20);
    expect(mergeStates(remote, local).settings.dailyGoal).toBe(20);
  });

  it('drops progress older than a reset made on another device', () => {
    const resetAt = T + 1000;
    const local = state({
      srs: { old: reviewed(T), fresh: reviewed(resetAt + 5) },
      lessons: { l1: { completedWordIds: ['old', 'fresh'] } },
      activity: { '2026-02-01': 9 },
    });
    const remote = state({ resetAt });
    const merged = mergeStates(local, remote);
    expect(Object.keys(merged.srs)).toEqual(['fresh']);
    expect(merged.lessons.l1.completedWordIds).toEqual(['fresh']);
    expect(merged.activity).toEqual({});
    expect(merged.resetAt).toBe(resetAt);
  });

  it('is idempotent', () => {
    const a = state({ srs: { x: reviewed(T) }, lessons: { l: { completedWordIds: ['x'] } }, activity: { d: 1 } });
    const once = mergeStates(a, a);
    expect(mergeStates(once, once)).toEqual(once);
  });
});
