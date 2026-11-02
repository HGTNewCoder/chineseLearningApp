import type { Card } from './srs';

export interface Settings {
  /** Hanzi Writer stroke-matching leniency; higher is more forgiving. */
  leniency: number;
  /** Highlight the correct stroke after this many misses in practice (false = never). */
  hintAfterMisses: number | false;
  showGrid: boolean;
}

export interface LessonProgress {
  completedWordIds: string[];
}

export interface AppState {
  version: 1;
  srs: Record<string, Card>;
  lessons: Record<string, LessonProgress>;
  settings: Settings;
}

export const STORAGE_KEY = 'hanzi-trainer:v1';

export const DEFAULT_SETTINGS: Settings = { leniency: 1, hintAfterMisses: 3, showGrid: true };

export const createInitialState = (): AppState => ({
  version: 1,
  srs: {},
  lessons: {},
  settings: { ...DEFAULT_SETTINGS },
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
    return {
      version: 1,
      srs: parsed.srs ?? {},
      lessons: parsed.lessons ?? {},
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
