import { useEffect, useState } from 'react';
import type { Word } from '../lib/types';
import { levelOf, loadWords } from '../lib/vocab';

interface WordsResult {
  /** Details for every requested (known) id, or null while loading. */
  words: Record<string, Word> | null;
  error: boolean;
}

/**
 * Loads word details for `ids`. Already-loaded words are kept, so adding ids
 * to the list (e.g. re-queuing a missed word) doesn't flash a loading state.
 */
export function useWords(ids: string[]): WordsResult {
  const known = ids.filter((id) => levelOf(id) !== undefined);
  const key = known.join('|');
  const [loaded, setLoaded] = useState<Record<string, Word>>({});
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setError(false);
    loadWords(key ? key.split('|') : [])
      .then((words) => active && setLoaded((prev) => ({ ...prev, ...words })))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [key]);

  const ready = known.every((id) => loaded[id]);
  return { words: ready ? loaded : null, error };
}
