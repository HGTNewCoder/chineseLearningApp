import { liveDecks, normalizePinyin, searchWords } from '../lib/decks';
import type { Word } from '../lib/types';

const word = (hanzi: string, pinyin: string, english: string, hsk = 1): Word => ({ id: hanzi, hanzi, pinyin, english, hsk });
const WORDS = [
  word('你', 'nǐ', 'you'),
  word('你好', 'nǐ hǎo', 'hello'),
  word('有', 'yǒu', 'to have; there is'),
  word('女儿', 'nǚ ér', 'daughter'),
  word('吃', 'chī', 'to eat', 2),
  word('好吃', 'hǎo chī', 'tasty; delicious', 3),
];
const ids = (words: Word[]) => words.map((w) => w.id);

describe('normalizePinyin', () => {
  it('drops tones, spaces and tone numbers', () => {
    expect(normalizePinyin('Nǐ hǎo')).toBe('nihao');
    expect(normalizePinyin('ni3 hao3')).toBe('nihao');
    expect(normalizePinyin('nǚ ér')).toBe('nuer');
    expect(normalizePinyin('nv er')).toBe('nuer');
  });
});

describe('searchWords', () => {
  it('finds words by characters, pinyin or English, best matches first', () => {
    expect(ids(searchWords(WORDS, '你'))).toEqual(['你', '你好']);
    expect(ids(searchWords(WORDS, 'nihao'))).toEqual(['你好']);
    expect(ids(searchWords(WORDS, 'chi'))).toEqual(['吃', '好吃']);
    expect(ids(searchWords(WORDS, 'eat'))).toEqual(['吃']);
    expect(ids(searchWords(WORDS, 'deli'))).toEqual(['好吃']);
    expect(ids(searchWords(WORDS, 'ugh'))).toEqual([]); // not inside "daughter"
    expect(ids(searchWords(WORDS, '(x'))).toEqual([]); // regex characters are literal
    expect(ids(searchWords(WORDS, 'to have'))).toEqual(['有']);
    // "you" is both the pinyin of 有 and the meaning of 你; both are exact matches, in HSK order.
    expect(ids(searchWords(WORDS, 'you')).slice(0, 2)).toEqual(['你', '有']);
  });

  it('returns everything for an empty query', () => {
    expect(searchWords(WORDS, '  ')).toHaveLength(WORDS.length);
  });
});

describe('liveDecks', () => {
  it('hides deleted decks and orders by creation', () => {
    const decks = {
      b: { name: 'B', wordIds: ['吃'], createdAt: 2, updatedAt: 2 },
      a: { name: 'A', wordIds: ['你'], createdAt: 1, updatedAt: 5 },
      gone: { name: 'Gone', wordIds: [], createdAt: 0, updatedAt: 9, deleted: true },
    };
    expect(liveDecks(decks).map(([id]) => id)).toEqual(['a', 'b']);
  });
});
