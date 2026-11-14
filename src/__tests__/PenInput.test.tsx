import { fireEvent, render } from '@testing-library/react';
import { CharacterCanvas } from '../components/CharacterCanvas';
import { isPenOnly, resetPenOnlyForTests, setPenOnly } from '../lib/pen';

// Hanzi Writer stand-in: an <svg> that records the mouse events the Pointer Events layer sends it.
const received: string[] = [];
vi.mock('hanzi-writer', () => ({
  default: {
    create: (el: HTMLElement) => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      el.appendChild(svg);
      for (const type of ['mousedown', 'mousemove']) {
        svg.addEventListener(type, (e) => received.push(`${type}@${(e as MouseEvent).clientX}`));
      }
      return { quiz: () => {}, animateCharacter: () => {}, cancelQuiz: () => {} };
    },
  },
}));
const onDocMouseUp = () => received.push('mouseup');

beforeEach(() => {
  received.length = 0;
  resetPenOnlyForTests();
  document.addEventListener('mouseup', onDocMouseUp);
});
afterEach(() => document.removeEventListener('mouseup', onDocMouseUp));

const canvas = () => document.querySelector('.char-canvas') as HTMLElement;
const stroke = (pointerType: string, pointerId: number, x = 10) => {
  fireEvent.pointerDown(canvas(), { pointerType, pointerId, clientX: x, button: 0 });
  fireEvent.pointerMove(canvas(), { pointerType, pointerId, clientX: x + 5, buttons: 1 });
  fireEvent.pointerUp(canvas(), { pointerType, pointerId, clientX: x + 5 });
};

describe('Pencil input', () => {
  it('turns a Pencil stroke into a stroke for Hanzi Writer and switches to Pencil-only', () => {
    render(<CharacterCanvas char="人" mode="quiz" />);
    stroke('pen', 1);
    expect(received).toEqual(['mousedown@10', 'mousemove@15', 'mouseup']);
    expect(isPenOnly()).toBe(true);
  });

  it('ignores fingers and palms in Pencil-only mode', () => {
    setPenOnly(true);
    render(<CharacterCanvas char="人" mode="quiz" />);
    stroke('touch', 2);
    expect(received).toEqual([]);
  });

  it('lets fingers draw when Pencil-only is off, and a user choice of off sticks', () => {
    setPenOnly(false);
    render(<CharacterCanvas char="人" mode="quiz" />);
    stroke('touch', 2);
    expect(received).toEqual(['mousedown@10', 'mousemove@15', 'mouseup']);
    stroke('pen', 1);
    expect(isPenOnly()).toBe(false);
  });

  it('keeps a second pointer (a resting palm) from joining or ending the stroke', () => {
    render(<CharacterCanvas char="人" mode="quiz" />);
    fireEvent.pointerDown(canvas(), { pointerType: 'pen', pointerId: 1, clientX: 10, button: 0 });
    fireEvent.pointerDown(canvas(), { pointerType: 'touch', pointerId: 7, clientX: 90, button: 0 });
    fireEvent.pointerMove(canvas(), { pointerType: 'touch', pointerId: 7, clientX: 95, buttons: 1 });
    fireEvent.pointerUp(canvas(), { pointerType: 'touch', pointerId: 7, clientX: 95 });
    fireEvent.pointerMove(canvas(), { pointerType: 'pen', pointerId: 1, clientX: 20, buttons: 1 });
    fireEvent.pointerUp(canvas(), { pointerType: 'pen', pointerId: 1, clientX: 20 });
    expect(received).toEqual(['mousedown@10', 'mousemove@20', 'mouseup']);
  });

  it('does not take input when only showing a character', () => {
    render(<CharacterCanvas char="人" mode="static" />);
    stroke('pen', 1);
    expect(received).toEqual([]);
  });
});
