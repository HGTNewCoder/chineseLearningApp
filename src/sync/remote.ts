import type { SupabaseClient } from '@supabase/supabase-js';
import type { Card } from '../lib/srs';
import { createInitialState, DEFAULT_SETTINGS, type AppState, type Settings } from '../lib/storage';

// Row shapes of the tables in supabase/migrations.
interface CardRow {
  user_id: string;
  word_id: string;
  box: number;
  next_due: number;
  last_reviewed: number | null;
  reviews: number;
  lapses: number;
}
interface LessonWordRow {
  user_id: string;
  lesson_id: string;
  word_id: string;
}
interface ActivityRow {
  user_id: string;
  day: string;
  count: number;
}
interface ProfileRow {
  user_id: string;
  settings: Partial<Settings>;
  settings_updated_at: number;
  reset_at: number;
}

const PAGE = 1000; // Supabase's default max rows per request
const CHUNK = 500;

function check<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

async function selectAll<T>(client: SupabaseClient, table: string, userId: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const page = check<T[]>(
      await client
        .from(table)
        .select('*')
        .eq('user_id', userId)
        .range(from, from + PAGE - 1),
    );
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

async function upsertChunked(client: SupabaseClient, table: string, rows: object[]) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    check(await client.from(table).upsert(rows.slice(i, i + CHUNK)));
  }
}

const cardToRow = (userId: string, wordId: string, c: Card): CardRow => ({
  user_id: userId,
  word_id: wordId,
  box: c.box,
  next_due: c.nextDue,
  last_reviewed: c.lastReviewed,
  reviews: c.reviews,
  lapses: c.lapses,
});

/** Reads the user's cloud copy into the same shape as local state. */
export async function fetchRemote(client: SupabaseClient, userId: string): Promise<AppState> {
  const [cards, lessonWords, activity, profiles] = await Promise.all([
    selectAll<CardRow>(client, 'cards', userId),
    selectAll<LessonWordRow>(client, 'lesson_words', userId),
    selectAll<ActivityRow>(client, 'daily_activity', userId),
    selectAll<ProfileRow>(client, 'profiles', userId),
  ]);
  const state = createInitialState();
  for (const r of cards) {
    // bigint columns can arrive as strings; normalise to numbers.
    state.srs[r.word_id] = {
      box: r.box,
      nextDue: Number(r.next_due),
      lastReviewed: r.last_reviewed === null ? null : Number(r.last_reviewed),
      reviews: r.reviews,
      lapses: r.lapses,
    };
  }
  for (const r of lessonWords) {
    (state.lessons[r.lesson_id] ??= { completedWordIds: [] }).completedWordIds.push(r.word_id);
  }
  for (const r of activity) state.activity[r.day] = r.count;
  const profile = profiles[0];
  if (profile) {
    state.settings = { ...DEFAULT_SETTINGS, ...profile.settings };
    state.settingsUpdatedAt = Number(profile.settings_updated_at);
    state.resetAt = Number(profile.reset_at);
  }
  return state;
}

/** Deletes all of the user's progress in the cloud and records when. */
export async function resetRemote(client: SupabaseClient, userId: string, resetAt: number) {
  for (const table of ['cards', 'lesson_words', 'daily_activity']) {
    check(await client.from(table).delete().eq('user_id', userId));
  }
  check(await client.from('profiles').upsert({ user_id: userId, reset_at: resetAt }));
}

/**
 * Uploads what changed between `prev` (what the cloud is known to hold) and
 * `next`. State updates are immutable, so changed entries are new objects.
 */
export async function pushChanges(client: SupabaseClient, userId: string, prev: AppState, next: AppState) {
  if (next.resetAt !== prev.resetAt) {
    await resetRemote(client, userId, next.resetAt);
    prev = { ...createInitialState(), resetAt: next.resetAt };
  }

  const cards = Object.entries(next.srs)
    .filter(([id, card]) => prev.srs[id] !== card)
    .map(([id, card]) => cardToRow(userId, id, card));

  const lessonWords: LessonWordRow[] = [];
  for (const [lessonId, progress] of Object.entries(next.lessons)) {
    const before = new Set(prev.lessons[lessonId]?.completedWordIds);
    for (const wordId of progress.completedWordIds) {
      if (!before.has(wordId)) lessonWords.push({ user_id: userId, lesson_id: lessonId, word_id: wordId });
    }
  }

  const activity: ActivityRow[] = Object.entries(next.activity)
    .filter(([day, count]) => prev.activity[day] !== count)
    .map(([day, count]) => ({ user_id: userId, day, count }));

  await upsertChunked(client, 'cards', cards);
  await upsertChunked(client, 'lesson_words', lessonWords);
  await upsertChunked(client, 'daily_activity', activity);

  if (next.settingsUpdatedAt !== prev.settingsUpdatedAt || next.resetAt !== prev.resetAt) {
    const profile: ProfileRow = {
      user_id: userId,
      settings: next.settings,
      settings_updated_at: next.settingsUpdatedAt,
      reset_at: next.resetAt,
    };
    check(await client.from('profiles').upsert(profile));
  }
}
