export interface Word {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
  hsk: number;
}

export interface Lesson {
  id: string;
  title: string;
  hsk: number;
  /** 1-based position within its HSK level. */
  number: number;
  words: Word[];
}
