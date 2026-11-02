export interface Word {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
  hsk: number;
}

/** Lesson index entry; word details are loaded per HSK level on demand. */
export interface Lesson {
  id: string;
  title: string;
  hsk: number;
  /** 1-based position within its HSK level. */
  number: number;
  /** Word ids, which are also the words' hanzi. */
  wordIds: string[];
}
