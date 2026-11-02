import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Word } from '../lib/types';
import { getNextLesson, LESSONS, LEVELS, levelOf, loadWords, TOTAL_WORDS } from '../lib/vocab';

const levelFile = (hsk: number): Word[] =>
  JSON.parse(readFileSync(join(__dirname, `../../public/vocab/hsk${hsk}.json`), 'utf8'));

describe('lesson index', () => {
  it('covers HSK 1–6 in order with unique lesson and word ids', () => {
    expect(LEVELS).toEqual([1, 2, 3, 4, 5, 6]);
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
    const ids = LESSONS.flatMap((l) => l.wordIds);
    expect(new Set(ids).size).toBe(ids.length);
    expect(TOTAL_WORDS).toBe(ids.length);
    expect(LESSONS.every((l) => l.wordIds.length > 0 && l.wordIds.length <= 10)).toBe(true);
  });

  it('matches the per-level word files exactly', () => {
    for (const hsk of LEVELS) {
      const fromIndex = LESSONS.filter((l) => l.hsk === hsk).flatMap((l) => l.wordIds);
      expect(levelFile(hsk).map((w) => w.id)).toEqual(fromIndex);
    }
  });

  it('has complete word details', () => {
    for (const hsk of LEVELS) {
      for (const w of levelFile(hsk)) {
        expect(w.hanzi).toMatch(/^\p{Script=Han}+$/u);
        expect(w.pinyin).not.toBe('');
        expect(w.english).not.toBe('');
        expect(w.hsk).toBe(hsk);
      }
    }
  });

  it('keeps the first lesson stable for existing users', () => {
    expect(LESSONS[0]).toMatchObject({ id: 'hsk1-1', title: 'HSK 1 · Lesson 1', hsk: 1, number: 1 });
    expect(LESSONS[0].wordIds.slice(0, 3)).toEqual(['的', '了', '我']);
  });

  it('links each lesson to the next', () => {
    expect(getNextLesson(LESSONS[0].id)).toBe(LESSONS[1]);
    expect(getNextLesson(LESSONS[LESSONS.length - 1].id)).toBeUndefined();
  });
});

describe('loadWords', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('fetches only the levels it needs and skips unknown ids', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const hsk = Number(/hsk(\d)\.json$/.exec(url)![1]);
      return new Response(JSON.stringify(levelFile(hsk)));
    });
    vi.stubGlobal('fetch', fetchMock);

    const hsk3Word = LESSONS.find((l) => l.hsk === 3)!.wordIds[0];
    const words = await loadWords(['我', hsk3Word, 'not-a-word']);

    expect(Object.keys(words).sort()).toEqual(['我', hsk3Word].sort());
    expect(words['我']).toMatchObject({ hanzi: '我', pinyin: 'wǒ', hsk: 1 });
    expect(levelOf(hsk3Word)).toBe(3);
    expect(fetchMock.mock.calls.map(([url]) => url).sort()).toEqual(['/vocab/hsk1.json', '/vocab/hsk3.json']);
  });
});
