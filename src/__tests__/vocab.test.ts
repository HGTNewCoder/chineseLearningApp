import type { Word } from '../lib/types';
import { buildLessons, getNextLesson, LESSONS, WORDS } from '../lib/vocab';

const word = (id: string, hsk: number): Word => ({ id, hanzi: id, pinyin: '', english: '', hsk });

describe('buildLessons', () => {
  it('groups by HSK level and chunks into fixed-size lessons', () => {
    const words = [word('a', 2), word('b', 1), word('c', 1), word('d', 1)];
    const lessons = buildLessons(words, 2);
    expect(lessons.map((l) => [l.id, l.words.map((w) => w.id)])).toEqual([
      ['hsk1-1', ['b', 'c']],
      ['hsk1-2', ['d']],
      ['hsk2-1', ['a']],
    ]);
    expect(lessons[0].title).toBe('HSK 1 · Lesson 1');
  });
});

describe('bundled vocabulary', () => {
  it('has HSK 1 and 2 words with unique ids and complete fields', () => {
    expect(WORDS.length).toBeGreaterThan(250);
    expect(new Set(WORDS.map((w) => w.id)).size).toBe(WORDS.length);
    for (const w of WORDS) {
      expect(w.hanzi).toMatch(/^\p{Script=Han}+$/u);
      expect(w.pinyin).not.toBe('');
      expect(w.english).not.toBe('');
      expect([1, 2]).toContain(w.hsk);
    }
  });

  it('links each lesson to the next', () => {
    expect(getNextLesson(LESSONS[0].id)).toBe(LESSONS[1]);
    expect(getNextLesson(LESSONS[LESSONS.length - 1].id)).toBeUndefined();
  });
});
