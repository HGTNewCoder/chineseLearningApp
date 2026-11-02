import vocabData from '../data/vocab.json';
import type { Lesson, Word } from './types';

export const LESSON_SIZE = 10;

/** Groups words by HSK level (in order), then splits each level into fixed-size lessons. */
export function buildLessons(words: Word[], size = LESSON_SIZE): Lesson[] {
  const levels = [...new Set(words.map((w) => w.hsk))].sort((a, b) => a - b);
  return levels.flatMap((hsk) => {
    const levelWords = words.filter((w) => w.hsk === hsk);
    const lessons: Lesson[] = [];
    for (let i = 0; i < levelWords.length; i += size) {
      const number = i / size + 1;
      lessons.push({
        id: `hsk${hsk}-${number}`,
        title: `HSK ${hsk} · Lesson ${number}`,
        hsk,
        number,
        words: levelWords.slice(i, i + size),
      });
    }
    return lessons;
  });
}

export const WORDS: Word[] = vocabData;
export const LESSONS: Lesson[] = buildLessons(WORDS);

const wordsById = new Map(WORDS.map((w) => [w.id, w]));
const lessonsById = new Map(LESSONS.map((l) => [l.id, l]));

export const getWord = (id: string) => wordsById.get(id);
export const getLesson = (id: string) => lessonsById.get(id);

export function getNextLesson(id: string): Lesson | undefined {
  const index = LESSONS.findIndex((l) => l.id === id);
  return index >= 0 ? LESSONS[index + 1] : undefined;
}
