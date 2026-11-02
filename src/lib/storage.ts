import type { Card } from './srs';

export interface Settings {
  /** Hanzi Writer stroke-matching leniency; higher is more forgiving. */
  leniency: number;
  /** Highlight the correct stroke after this many misses in practice (false = never). */
  hintAfterMisses: number | false;
  showGrid: boolean;
  /** Words to review or learn per day. */
  dailyGoal: number;
}

export interface LessonProgress {
  completedWordIds: string[];
}

export interface AppState {
  version: 1;
  srs: Record<string, Card>;
  lessons: Record<string, LessonProgress>;
  settings: Settings;
  /** Words reviewed or learned per local day (YYYY-MM-DD). */
  activity: Record<string, number>;
  /** When settings last changed (ms), for last-write-wins sync. */
  settingsUpdatedAt: number;
  /** When progress was last reset (ms); older data from other devices is discarded. */
  resetAt: number;
  /** Account this progress was last synced with, so another account never inherits it. */
  syncedUserId: string | null;
}

export const STORAGE_KEY = 'hanzi-trainer:v1';

export const DEFAULT_SETTINGS: Settings = { leniency: 1, hintAfterMisses: 3, showGrid: true, dailyGoal: 10 };

export const createInitialState = (): AppState => ({
  version: 1,
  srs: {},
  lessons: {},
  settings: { ...DEFAULT_SETTINGS },
  activity: {},
  settingsUpdatedAt: 0,
  resetAt: 0,
  syncedUserId: null,
});

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

// Used when localStorage is unavailable (private mode, blocked site data).
const memory = new Map<string, string>();
const memoryStore: KeyValueStore = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => void memory.set(key, value),
};

function defaultStore(): KeyValueStore {
  try {
    const store = window.localStorage;
    const probe = `${STORAGE_KEY}:probe`;
    store.setItem(probe, '1');
    store.removeItem(probe);
    return store;
  } catch {
    return memoryStore;
  }
}

export function loadState(store: KeyValueStore = defaultStore()): AppState {
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (parsed.version !== 1) return createInitialState();
    // Fields added after the first release fall back to their defaults.
    return {
      ...createInitialState(),
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
  } catch {
    return createInitialState();
  }
}

export function saveState(state: AppState, store: KeyValueStore = defaultStore()): boolean {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
