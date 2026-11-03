/** Which side of a flashcard is shown first. */
export type FlashcardFront = 'hanzi' | 'english';

export interface FlashcardSession {
  /** Unique word ids in the deck, in their original order. */
  deck: string[];
  /** Cards in the order they're shown; a card marked "again" is appended to the end. */
  queue: string[];
  index: number;
  /** Words marked "again" at least once, in the order they were first missed. */
  missed: string[];
}

export function shuffle<T>(items: T[], random = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function startSession(ids: string[], options: { shuffle?: boolean; random?: () => number } = {}): FlashcardSession {
  const deck = [...new Set(ids)];
  return { deck, queue: options.shuffle ? shuffle(deck, options.random) : deck, index: 0, missed: [] };
}

export const currentCard = (s: FlashcardSession): string | undefined => s.queue[s.index];
export const isFinished = (s: FlashcardSession) => s.index >= s.queue.length;

/** Words not yet marked "got it", including the current card. */
export const remainingCount = (s: FlashcardSession) => new Set(s.queue.slice(s.index)).size;

/** "Got it" moves on; "again" sends the card to the back until it's known. */
export function answer(s: FlashcardSession, knew: boolean): FlashcardSession {
  const id = currentCard(s);
  if (id === undefined) return s;
  if (knew) return { ...s, index: s.index + 1 };
  return {
    ...s,
    queue: [...s.queue, id],
    index: s.index + 1,
    missed: s.missed.includes(id) ? s.missed : [...s.missed, id],
  };
}
