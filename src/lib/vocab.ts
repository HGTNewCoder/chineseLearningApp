import lessonIndex from '../data/lessons.json';
import type { Lesson, Word } from './types';

// The lesson index (word ids only) is bundled; pinyin and English for each
// HSK level live in public/vocab/hsk<N>.json and are fetched when needed.
export const LESSONS: Lesson[] = lessonIndex;
export const LEVELS: number[] = [...new Set(LESSONS.map((l) => l.hsk))];
export const TOTAL_WORDS = LESSONS.reduce((n, l) => n + l.wordIds.length, 0);

const lessonsById = new Map(LESSONS.map((l) => [l.id, l]));
const levelByWordId = new Map(LESSONS.flatMap((l) => l.wordIds.map((id) => [id, l.hsk] as const)));

export const getLesson = (id: string) => lessonsById.get(id);
export const levelOf = (wordId: string) => levelByWordId.get(wordId);
export const lessonsForLevel = (hsk: number) => LESSONS.filter((l) => l.hsk === hsk);

export function getNextLesson(id: string): Lesson | undefined {
  const index = LESSONS.findIndex((l) => l.id === id);
  return index >= 0 ? LESSONS[index + 1] : undefined;
}

const levelCache = new Map<number, Promise<Map<string, Word>>>();

export function loadLevel(hsk: number): Promise<Map<string, Word>> {
  let pending = levelCache.get(hsk);
  if (!pending) {
    pending = fetch(`${import.meta.env.BASE_URL}vocab/hsk${hsk}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Couldn’t load HSK ${hsk} vocabulary`);
        return res.json() as Promise<Word[]>;
      })
      .then((words) => new Map(words.map((w) => [w.id, w])));
    pending.catch(() => levelCache.delete(hsk));
    levelCache.set(hsk, pending);
  }
  return pending;
}

/** Loads details for the given word ids; unknown ids are left out. */
export async function loadWords(ids: string[]): Promise<Record<string, Word>> {
  const levels = new Set(ids.map(levelOf).filter((l): l is number => l !== undefined));
  const maps = await Promise.all([...levels].map(loadLevel));
  const words: Record<string, Word> = {};
  for (const id of ids) {
    const word = maps.find((m) => m.has(id))?.get(id);
    if (word) words[id] = word;
  }
  return words;
}
