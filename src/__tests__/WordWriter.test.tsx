import { act, render } from '@testing-library/react';
import { createRef } from 'react';
import { WordWriter, type WordWriterHandle } from '../components/WordWriter';

// Minimal HanziWriter stand-in that records each instance so tests can finish quizzes.
interface FakeWriter {
  char: string;
  options: Record<string, unknown>;
  quizOptions?: { onComplete?: (s: { character: string; totalMistakes: number }) => void };
  animateOptions?: { onComplete?: (r: { canceled: boolean }) => void };
}
const writers: FakeWriter[] = [];

vi.mock('hanzi-writer', () => ({
  default: {
    create: (_el: HTMLElement, char: string, options: Record<string, unknown>) => {
      const w: FakeWriter = { char, options };
      writers.push(w);
      return {
        quiz: (o: FakeWriter['quizOptions']) => void (w.quizOptions = o),
        animateCharacter: (o: FakeWriter['animateOptions']) => void (w.animateOptions = o),
        cancelQuiz: () => {},
      };
    },
  },
}));

/** The most recently created writer for a character (earlier ones were torn down). */
const live = (char: string) => writers.filter((w) => w.char === char).at(-1)!;

beforeEach(() => {
  writers.length = 0;
});

describe('WordWriter', () => {
  it('quizzes one character at a time and reports total mistakes', () => {
    const onComplete = vi.fn();
    render(<WordWriter hanzi="你好" mode="quiz" onComplete={onComplete} />);

    expect(live('你').quizOptions).toBeDefined();
    expect(live('好').quizOptions).toBeUndefined(); // waiting as a blank box
    expect(live('好').options.showOutline).toBe(false);

    act(() => live('你').quizOptions!.onComplete!({ character: '你', totalMistakes: 2 }));
    expect(live('你').options.showCharacter).toBe(true); // finished character is shown
    expect(live('好').quizOptions).toBeDefined();
    expect(onComplete).not.toHaveBeenCalled();

    act(() => live('好').quizOptions!.onComplete!({ character: '好', totalMistakes: 1 }));
    expect(onComplete).toHaveBeenCalledWith(3);
  });

  it('shows upcoming characters as outlines when tracing', () => {
    render(<WordWriter hanzi="你好" mode="trace" />);
    expect(live('你').options.showOutline).toBe(true);
    expect(live('你').quizOptions).toBeDefined();
    expect(live('好').options.showOutline).toBe(true);
    expect(live('好').quizOptions).toBeUndefined();
  });

  it('plays animations in sequence and reports when all are done', () => {
    const onAnimationComplete = vi.fn();
    render(<WordWriter hanzi="你好" mode="animate" onAnimationComplete={onAnimationComplete} />);
    expect(live('好').animateOptions).toBeUndefined();

    act(() => live('你').animateOptions!.onComplete!({ canceled: false }));
    expect(live('好').animateOptions).toBeDefined();

    act(() => live('好').animateOptions!.onComplete!({ canceled: false }));
    expect(onAnimationComplete).toHaveBeenCalledTimes(1);
  });

  it('reveal() stops the quiz and animates the answer', () => {
    const ref = createRef<WordWriterHandle>();
    render(<WordWriter ref={ref} hanzi="好" mode="quiz" />);
    expect(live('好').animateOptions).toBeUndefined();

    act(() => ref.current!.reveal());
    expect(live('好').animateOptions).toBeDefined();
    expect(live('好').quizOptions).toBeUndefined();
  });
});
