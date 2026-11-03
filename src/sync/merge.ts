import type { CustomDeck } from '../lib/decks';
import type { Card } from '../lib/srs';
import type { AppState, LessonProgress } from '../lib/storage';
import { dayKey } from '../lib/streak';

/** When a card last changed: its last review, or its creation (new cards are due at creation). */
export const cardStamp = (card: Card) => card.lastReviewed ?? card.nextDue;

function newerCard(a: Card | undefined, b: Card | undefined): Card | undefined {
  if (!a || !b) return a ?? b;
  // Never let a freshly learned (unreviewed) copy wipe out review history.
  if ((a.lastReviewed === null) !== (b.lastReviewed === null)) return a.lastReviewed === null ? b : a;
  const diff = cardStamp(a) - cardStamp(b);
  if (diff !== 0) return diff > 0 ? a : b;
  return a.reviews >= b.reviews ? a : b;
}

/** Drops progress made before a reset that happened elsewhere. */
function since(state: AppState, resetAt: number): AppState {
  if (state.resetAt >= resetAt) return state;
  const srs = Object.fromEntries(Object.entries(state.srs).filter(([, c]) => cardStamp(c) >= resetAt));
  // Lesson words have no timestamp; keep those whose card survived (learning a word creates its card).
  const lessons: Record<string, LessonProgress> = {};
  for (const [id, p] of Object.entries(state.lessons)) {
    const kept = p.completedWordIds.filter((w) => srs[w]);
    if (kept.length) lessons[id] = { completedWordIds: kept };
  }
  const resetDay = dayKey(new Date(resetAt));
  const activity = Object.fromEntries(Object.entries(state.activity).filter(([day]) => day >= resetDay));
  return { ...state, srs, lessons, activity, resetAt };
}

/**
 * Merges two copies of a user's progress (this device and the cloud):
 * newest card wins, lesson progress is unioned, daily activity takes the max,
 * newest settings and newest copy of each deck win, and progress older than
 * the latest reset is dropped.
 */
export function mergeStates(localIn: AppState, remoteIn: AppState): AppState {
  const resetAt = Math.max(localIn.resetAt, remoteIn.resetAt);
  const local = since(localIn, resetAt);
  const remote = since(remoteIn, resetAt);

  const srs: Record<string, Card> = {};
  for (const id of new Set([...Object.keys(local.srs), ...Object.keys(remote.srs)])) {
    srs[id] = newerCard(local.srs[id], remote.srs[id])!;
  }

  const lessons: Record<string, LessonProgress> = {};
  for (const id of new Set([...Object.keys(local.lessons), ...Object.keys(remote.lessons)])) {
    const words = new Set([...(local.lessons[id]?.completedWordIds ?? []), ...(remote.lessons[id]?.completedWordIds ?? [])]);
    lessons[id] = { completedWordIds: [...words] };
  }

  const activity: Record<string, number> = { ...remote.activity };
  for (const [day, count] of Object.entries(local.activity)) {
    activity[day] = Math.max(count, activity[day] ?? 0);
  }

  const decks: Record<string, CustomDeck> = { ...remote.decks };
  for (const [id, deck] of Object.entries(local.decks)) {
    if (!decks[id] || deck.updatedAt >= decks[id].updatedAt) decks[id] = deck;
  }

  const settingsFrom = local.settingsUpdatedAt >= remote.settingsUpdatedAt ? local : remote;

  return {
    ...local,
    srs,
    lessons,
    activity,
    decks,
    settings: settingsFrom.settings,
    settingsUpdatedAt: settingsFrom.settingsUpdatedAt,
    resetAt,
  };
}
