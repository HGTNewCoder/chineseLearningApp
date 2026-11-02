import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { newCard, review } from '../lib/srs';
import { createInitialState, loadState, saveState, type AppState, type Settings } from '../lib/storage';

interface ProgressApi {
  state: AppState;
  /** Records a practice result for a word already in (or new to) the deck. */
  recordReview: (wordId: string, passed: boolean) => void;
  /** Marks a word as learned in a lesson and adds it to the review deck. */
  completeLessonWord: (lessonId: string, wordId: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetProgress: () => void;
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
      return { ...s, srs: { ...s.srs, [wordId]: review(card, passed, now) } };
    });
  }, []);

  const completeLessonWord = useCallback((lessonId: string, wordId: string) => {
    setState((s) => {
      const done = s.lessons[lessonId]?.completedWordIds ?? [];
      return {
        ...s,
        srs: s.srs[wordId] ? s.srs : { ...s.srs, [wordId]: newCard(Date.now()) },
        lessons: done.includes(wordId)
          ? s.lessons
          : { ...s.lessons, [lessonId]: { completedWordIds: [...done, wordId] } },
      };
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const resetProgress = useCallback(() => {
    setState((s) => ({ ...createInitialState(), settings: s.settings }));
  }, []);

  const api = useMemo(
    () => ({ state, recordReview, completeLessonWord, updateSettings, resetProgress }),
    [state, recordReview, completeLessonWord, updateSettings, resetProgress],
  );

  return <ProgressContext.Provider value={api}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressApi {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>');
  return ctx;
}
