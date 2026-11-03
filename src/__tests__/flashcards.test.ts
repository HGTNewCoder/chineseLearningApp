import { answer, currentCard, isFinished, remainingCount, shuffle, startSession } from '../lib/flashcards';

describe('flashcards', () => {
  it('shows each card once when every answer is "got it"', () => {
    let s = startSession(['a', 'b', 'a', 'c']);
    expect(s.deck).toEqual(['a', 'b', 'c']);
    const seen: string[] = [];
    while (!isFinished(s)) {
      seen.push(currentCard(s)!);
      s = answer(s, true);
    }
    expect(seen).toEqual(['a', 'b', 'c']);
    expect(s.missed).toEqual([]);
  });

  it('sends missed cards to the back until they are known', () => {
    let s = startSession(['a', 'b']);
    s = answer(s, false); // a again
    expect(s.queue).toEqual(['a', 'b', 'a']);
    expect(remainingCount(s)).toBe(2);
    s = answer(s, true); // b
    s = answer(s, false); // a again, still the only card left
    expect(currentCard(s)).toBe('a');
    expect(remainingCount(s)).toBe(1);
    s = answer(s, true);
    expect(isFinished(s)).toBe(true);
    expect(s.missed).toEqual(['a']);
  });

  it('ignores answers after the session is over', () => {
    const done = answer(startSession(['a']), true);
    expect(answer(done, false)).toBe(done);
  });

  it('shuffles without losing or duplicating cards', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    let seed = 0.42;
    const random = () => (seed = (seed * 9301 + 0.49297) % 1);
    const shuffled = shuffle(items, random);
    expect([...shuffled].sort()).toEqual(items);
    expect(items).toEqual(['a', 'b', 'c', 'd', 'e']); // input untouched
    expect(startSession(items, { shuffle: true, random: () => 0 }).queue).toEqual(['b', 'c', 'd', 'e', 'a']);
  });
});
