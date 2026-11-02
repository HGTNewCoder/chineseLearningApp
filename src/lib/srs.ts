// Leitner-style spaced repetition. All functions are pure and take `now` (ms).

export interface Card {
  /** 1 (new / just missed) … MAX_BOX (well known). */
  box: number;
  nextDue: number;
  lastReviewed: number | null;
  reviews: number;
  lapses: number;
}

export const MAX_BOX = 5;
/** Days until the next review for each box (index = box - 1). */
export const INTERVAL_DAYS = [0, 1, 3, 7, 14];
export const DAY_MS = 24 * 60 * 60 * 1000;

export function newCard(now: number): Card {
  return { box: 1, nextDue: now, lastReviewed: null, reviews: 0, lapses: 0 };
}

export function intervalFor(box: number): number {
  return INTERVAL_DAYS[Math.min(Math.max(box, 1), MAX_BOX) - 1] * DAY_MS;
}

/** Pass moves the card up one box; fail sends it back to box 1. */
export function review(card: Card, passed: boolean, now: number): Card {
  const box = passed ? Math.min(card.box + 1, MAX_BOX) : 1;
  return {
    box,
    nextDue: now + intervalFor(box),
    lastReviewed: now,
    reviews: card.reviews + 1,
    lapses: card.lapses + (passed ? 0 : 1),
  };
}

export const isDue = (card: Card, now: number) => card.nextDue <= now;

/** A word passes when the user made at most one mistake per character. */
export const isPass = (totalMistakes: number, charCount: number) => totalMistakes <= charCount;

export interface QueueOptions {
  size: number;
  /** Word ids not yet in the deck, used to top up a short queue. */
  newWordIds?: string[];
  /** Include cards that are not due yet (soonest first) to fill the queue. */
  includeNotDue?: boolean;
}

export function buildQueue(cards: Record<string, Card>, now: number, options: QueueOptions): string[] {
  const { size, newWordIds = [], includeNotDue = false } = options;
  const entries = Object.entries(cards).sort(([, a], [, b]) => a.nextDue - b.nextDue);
  const queue = entries.filter(([, c]) => isDue(c, now)).map(([id]) => id);

  for (const id of newWordIds) {
    if (queue.length >= size) break;
    if (!cards[id] && !queue.includes(id)) queue.push(id);
  }
  if (includeNotDue) {
    for (const [id] of entries) {
      if (queue.length >= size) break;
      if (!queue.includes(id)) queue.push(id);
    }
  }
  return queue.slice(0, size);
}
