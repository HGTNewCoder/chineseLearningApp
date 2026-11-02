import { DEFAULT_SETTINGS, loadState, saveState, STORAGE_KEY } from '../lib/storage';

function fakeStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

describe('storage', () => {
  it('returns a fresh state when nothing is stored', () => {
    expect(loadState(fakeStore())).toEqual({ version: 1, srs: {}, lessons: {}, settings: DEFAULT_SETTINGS });
  });

  it('round-trips saved state', () => {
    const store = fakeStore();
    const state = { ...loadState(store), lessons: { 'hsk1-1': { completedWordIds: ['我'] } } };
    expect(saveState(state, store)).toBe(true);
    expect(loadState(store)).toEqual(state);
  });

  it('fills in settings added after the data was saved', () => {
    const saved = { version: 1, srs: {}, lessons: {}, settings: { showGrid: false } };
    const store = fakeStore({ [STORAGE_KEY]: JSON.stringify(saved) });
    expect(loadState(store).settings).toEqual({ ...DEFAULT_SETTINGS, showGrid: false });
  });

  it('ignores corrupt or unknown-version data', () => {
    expect(loadState(fakeStore({ [STORAGE_KEY]: '{not json' })).srs).toEqual({});
    expect(loadState(fakeStore({ [STORAGE_KEY]: JSON.stringify({ version: 99, srs: { a: 1 } }) })).srs).toEqual({});
  });

  it('reports failure instead of throwing when storage is blocked', () => {
    const blocked = {
      getItem: (): string | null => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(loadState(blocked).version).toBe(1);
    expect(saveState(loadState(blocked), blocked)).toBe(false);
  });
});
