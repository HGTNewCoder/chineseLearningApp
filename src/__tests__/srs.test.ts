import { buildQueue, DAY_MS, intervalFor, isDue, isPass, MAX_BOX, newCard, review, type Card } from '../lib/srs';

const NOW = Date.UTC(2026, 0, 1);

describe('review', () => {
  it('moves a passed card up one box and schedules by its interval', () => {
    const card = review(newCard(NOW), true, NOW);
    expect(card.box).toBe(2);
    expect(card.nextDue).toBe(NOW + DAY_MS);
    expect(card.reviews).toBe(1);
    expect(card.lapses).toBe(0);
  });

  it('caps at the top box', () => {
    let card = newCard(NOW);
    for (let i = 0; i < 10; i++) card = review(card, true, NOW);
    expect(card.box).toBe(MAX_BOX);
    expect(card.nextDue).toBe(NOW + 14 * DAY_MS);
  });

  it('sends a failed card back to box 1, due immediately, and counts a lapse', () => {
    const card = review({ ...newCard(NOW), box: 4 }, false, NOW);
    expect(card.box).toBe(1);
    expect(card.nextDue).toBe(NOW);
    expect(card.lapses).toBe(1);
  });

  it('uses 0, 1, 3, 7, 14 day intervals', () => {
    expect([1, 2, 3, 4, 5].map((b) => intervalFor(b) / DAY_MS)).toEqual([0, 1, 3, 7, 14]);
  });
});

describe('isPass', () => {
  it('allows at most one mistake per character', () => {
    expect(isPass(0, 1)).toBe(true);
    expect(isPass(1, 1)).toBe(true);
    expect(isPass(2, 1)).toBe(false);
    expect(isPass(2, 2)).toBe(true);
  });
});

describe('buildQueue', () => {
  const card = (nextDue: number): Card => ({ ...newCard(NOW), nextDue });
  const cards = { a: card(NOW - 2), b: card(NOW + DAY_MS), c: card(NOW - 5) };

  it('returns due cards, oldest first', () => {
    expect(buildQueue(cards, NOW, { size: 10 })).toEqual(['c', 'a']);
    expect(isDue(cards.b, NOW)).toBe(false);
  });

  it('tops up with new words not already in the deck', () => {
    expect(buildQueue(cards, NOW, { size: 4, newWordIds: ['a', 'x', 'y', 'z'] })).toEqual(['c', 'a', 'x', 'y']);
  });

  it('can include cards that are not due yet', () => {
    expect(buildQueue(cards, NOW, { size: 10, includeNotDue: true })).toEqual(['c', 'a', 'b']);
  });

  it('respects the size limit', () => {
    expect(buildQueue(cards, NOW, { size: 1 })).toEqual(['c']);
  });
});
