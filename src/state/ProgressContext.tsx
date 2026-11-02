import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { newCard, review } from '../lib/srs';
import { createInitialState, loadState, saveState, type AppState, type Settings } from '../lib/storage';
import { addActivity } from '../lib/streak';

interface ProgressApi {
  state: AppState;
  /** Records a practice result for a word already in (or new to) the deck. */
  recordReview: (wordId: string, passed: boolean) => void;
  /** Marks a word as learned in a lesson and adds it to the review deck. */
  completeLessonWord: (lessonId: string, wordId: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetProgress: () => void;
  /** Replaces state wholesale (used by cloud sync). */
  replaceState: (update: (current: AppState) => AppState) => void;
}

const ProgressContext = createContext<ProgressApi | null>(null);

export function ProgressProvider({ children, initialState }: { children: ReactNode; initialState?: AppState }) {
  const [state, setState] = useState<AppState>(() => initialState ?? loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const recordReview = useCallback((wordId: string, passed: boolean) => {
    setState((s) => {
      const now = Date.now();
      const card = s.srs[wordId] ?? newCard(now);
      return {
        ...s,
        srs: { ...s.srs, [wordId]: review(card, passed, now) },
        activity: addActivity(s.activity, new Date(now)),
      };
    });
  }, []);

  const completeLessonWord = useCallback((lessonId: string, wordId: string) => {
    setState((s) => {
      const done = s.lessons[lessonId]?.completedWordIds ?? [];
      if (done.includes(wordId)) return s;
      const now = Date.now();
      return {
        ...s,
        srs: s.srs[wordId] ? s.srs : { ...s.srs, [wordId]: newCard(now) },
        lessons: { ...s.lessons, [lessonId]: { completedWordIds: [...done, wordId] } },
        activity: addActivity(s.activity, new Date(now)),
      };
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch }, settingsUpdatedAt: Date.now() }));
  }, []);

  const resetProgress = useCallback(() => {
    setState((s) => ({
      ...createInitialState(),
      settings: s.settings,
      settingsUpdatedAt: s.settingsUpdatedAt,
      syncedUserId: s.syncedUserId,
      resetAt: Date.now(),
    }));
  }, []);

  const replaceState = useCallback((update: (current: AppState) => AppState) => setState(update), []);

  const api = useMemo(
    () => ({ state, recordReview, completeLessonWord, updateSettings, resetProgress, replaceState }),
    [state, recordReview, completeLessonWord, updateSettings, resetProgress, replaceState],
  );

  return <ProgressContext.Provider value={api}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressApi {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>');
  return ctx;
}
