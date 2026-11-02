import type { SupabaseClient } from '@supabase/supabase-js';
import { newCard, review } from '../lib/srs';
import { createInitialState, DEFAULT_SETTINGS, type AppState } from '../lib/storage';
import { fetchRemote, pushChanges } from '../sync/remote';

type Row = Record<string, unknown>;

/** In-memory stand-in for the few Supabase query-builder calls the sync layer uses. */
function fakeSupabase(tables: Record<string, Row[]> = {}) {
  const calls: string[] = [];
  const ok = { data: null, error: null };
  const client = {
    from(table: string) {
      const rows = (tables[table] ??= []);
      return {
        upsert(input: Row | Row[]) {
          const list = Array.isArray(input) ? input : [input];
          calls.push(`upsert ${table} ${list.length}`);
          rows.push(...list);
          return Promise.resolve(ok);
        },
        delete() {
          return {
            eq() {
              calls.push(`delete ${table}`);
              rows.length = 0;
              return Promise.resolve(ok);
            },
          };
        },
        select() {
          return {
            eq() {
              return {
                range: (from: number, to: number) => Promise.resolve({ data: rows.slice(from, to + 1), error: null }),
              };
            },
          };
        },
      };
    },
  };
  return { client: client as unknown as SupabaseClient, calls, tables };
}

const T = Date.UTC(2026, 2, 1);
const state = (patch: Partial<AppState>): AppState => ({ ...createInitialState(), ...patch });

describe('pushChanges', () => {
  it('uploads only what changed since the last sync', async () => {
    const unchanged = newCard(T);
    const prev = state({ srs: { a: unchanged }, lessons: { l1: { completedWordIds: ['a'] } }, activity: { d1: 1 } });
    const next = state({
      srs: { a: unchanged, b: review(newCard(T), true, T + 1) },
      lessons: { l1: { completedWordIds: ['a', 'b'] } },
      activity: { d1: 2 },
    });
    const { client, calls, tables } = fakeSupabase();

    await pushChanges(client, 'u1', prev, next);

    expect(calls).toEqual(['upsert cards 1', 'upsert lesson_words 1', 'upsert daily_activity 1']);
    expect(tables.cards[0]).toMatchObject({ user_id: 'u1', word_id: 'b', box: 2, reviews: 1 });
    expect(tables.lesson_words[0]).toEqual({ user_id: 'u1', lesson_id: 'l1', word_id: 'b' });
    expect(tables.daily_activity[0]).toEqual({ user_id: 'u1', day: 'd1', count: 2 });
  });

  it('uploads settings when they changed', async () => {
    const { client, tables } = fakeSupabase();
    const next = state({ settings: { ...DEFAULT_SETTINGS, dailyGoal: 30 }, settingsUpdatedAt: T });
    await pushChanges(client, 'u1', createInitialState(), next);
    expect(tables.profiles[0]).toMatchObject({ user_id: 'u1', settings: { dailyGoal: 30 }, settings_updated_at: T });
  });

  it('clears the cloud copy and re-uploads after a reset', async () => {
    const { client, calls } = fakeSupabase({ cards: [{ word_id: 'old' }] });
    const prev = state({ srs: { old: newCard(T) } });
    const next = state({ srs: { fresh: newCard(T + 10) }, resetAt: T + 5 });
    await pushChanges(client, 'u1', prev, next);
    expect(calls.slice(0, 3)).toEqual(['delete cards', 'delete lesson_words', 'delete daily_activity']);
    expect(calls).toContain('upsert cards 1');
  });
});

describe('fetchRemote', () => {
  it('rebuilds local state from rows, normalising bigint strings', async () => {
    const { client } = fakeSupabase({
      cards: [{ word_id: 'a', box: 3, next_due: String(T), last_reviewed: String(T - 1), reviews: 4, lapses: 1 }],
      lesson_words: [
        { lesson_id: 'l1', word_id: 'a' },
        { lesson_id: 'l1', word_id: 'b' },
      ],
      daily_activity: [{ day: '2026-03-01', count: 5 }],
      profiles: [{ settings: { dailyGoal: 20 }, settings_updated_at: String(T), reset_at: '0' }],
    });
    const remote = await fetchRemote(client, 'u1');
    expect(remote.srs.a).toEqual({ box: 3, nextDue: T, lastReviewed: T - 1, reviews: 4, lapses: 1 });
    expect(remote.lessons.l1.completedWordIds).toEqual(['a', 'b']);
    expect(remote.activity).toEqual({ '2026-03-01': 5 });
    expect(remote.settings).toEqual({ ...DEFAULT_SETTINGS, dailyGoal: 20 });
    expect(remote.settingsUpdatedAt).toBe(T);
  });
});
