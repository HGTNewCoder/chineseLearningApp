import HanziWriter from 'hanzi-writer';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { charDataLoader } from '../lib/hanzi';
import { isPenOnly, notePenUsed } from '../lib/pen';

/**
 * - static:  the finished character
 * - outline: faint outline only
 * - blank:   empty box (for writing from memory)
 * - animate: plays the stroke-order animation once
 * - trace:   quiz over a visible outline, hint after the first miss
 * - quiz:    quiz with no outline
 */
export type CanvasMode = 'static' | 'outline' | 'blank' | 'animate' | 'trace' | 'quiz';

interface Props {
  char: string;
  mode: CanvasMode;
  size?: number;
  showGrid?: boolean;
  leniency?: number;
  hintAfterMisses?: number | false;
  onQuizComplete?: (totalMistakes: number) => void;
  onAnimationComplete?: () => void;
  onMistake?: () => void;
  onCorrectStroke?: () => void;
}

function themeColor(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function CharacterCanvas({
  char,
  mode,
  size = 260,
  showGrid = true,
  leniency = 1,
  hintAfterMisses = 3,
  onQuizComplete,
  onAnimationComplete,
  onMistake,
  onCorrectStroke,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const interactive = mode === 'trace' || mode === 'quiz';
  const drawingWidth = Math.max(8, Math.round(size / 26));
  usePenInput(wrapRef, targetRef, dotRef, interactive);

  // Keep the latest callbacks without re-creating the writer on every render.
  const callbacks = useRef({ onQuizComplete, onAnimationComplete, onMistake, onCorrectStroke });
  callbacks.current = { onQuizComplete, onAnimationComplete, onMistake, onCorrectStroke };

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    let active = true;
    el.innerHTML = '';
    setError(false);

    const writer = HanziWriter.create(el, char, {
      width: size,
      height: size,
      padding: Math.round(size * 0.05),
      showCharacter: mode === 'static',
      showOutline: mode === 'outline' || mode === 'animate' || mode === 'trace',
      strokeColor: themeColor('--ink', '#1f2328'),
      outlineColor: themeColor('--outline', '#dcdfe4'),
      highlightColor: themeColor('--accent', '#d0393e'),
      drawingColor: themeColor('--drawing', '#3b6fd8'),
      radicalColor: null,
      drawingWidth,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 250,
      charDataLoader,
      onLoadCharDataError: () => active && setError(true),
    });

    if (mode === 'animate') {
      writer.animateCharacter({
        onComplete: ({ canceled }) => {
          if (active && !canceled) callbacks.current.onAnimationComplete?.();
        },
      });
    } else if (mode === 'trace' || mode === 'quiz') {
      writer.quiz({
        leniency,
        showHintAfterMisses: mode === 'trace' ? 1 : hintAfterMisses,
        onMistake: () => active && callbacks.current.onMistake?.(),
        onCorrectStroke: () => active && callbacks.current.onCorrectStroke?.(),
        onComplete: ({ totalMistakes }) => active && callbacks.current.onQuizComplete?.(totalMistakes),
      });
    }

    return () => {
      active = false;
      writer.cancelQuiz();
      el.innerHTML = '';
    };
  }, [char, mode, size, leniency, hintAfterMisses]);

  return (
    <div
      ref={wrapRef}
      className={`char-canvas${interactive ? ' is-interactive' : ''}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={interactive ? 'Drawing area: draw the character with Apple Pencil, your finger or a mouse' : `Character ${char}`}
    >
      {showGrid && <GridLines size={size} />}
      <div ref={targetRef} className="char-canvas__target" />
      {interactive && (
        <div
          ref={dotRef}
          className="char-canvas__hover"
          style={{ width: drawingWidth, height: drawingWidth, margin: -drawingWidth / 2 }}
          aria-hidden="true"
        />
      )}
      {error && <div className="char-canvas__error">Couldn’t load stroke data for {char}</div>}
    </div>
  );
}

/**
 * Hanzi Writer ends the current stroke on any `touchend` that reaches the document, so a palm
 * lifting anywhere on the page would cut a Pencil stroke short. This listener is registered when
 * the module loads, before any writer exists, so it runs first and can hide those events from
 * Hanzi Writer while a stroke is in progress. (The app's own handlers have already run by then.)
 */
let activeStrokes = 0;
if (typeof document !== 'undefined') {
  document.addEventListener('touchend', (e) => {
    if (activeStrokes > 0) e.stopImmediatePropagation();
  });
}

/**
 * Feeds strokes to Hanzi Writer from Pointer Events instead of its own touch/mouse listeners
 * (its SVG has `pointer-events: none`, so it only sees the mouse events sent from here). This adds:
 * - palm rejection: in Pencil-only mode, finger and palm touches are ignored; and only one
 *   pointer draws at a time, so a resting palm can't hijack or end a Pencil stroke;
 * - every sample of fast Apple Pencil strokes (coalesced events), for smoother, more accurate shapes;
 * - a hover dot showing where the Pencil will land (iPad models with Pencil hover).
 */
function usePenInput(
  wrapRef: RefObject<HTMLDivElement | null>,
  targetRef: RefObject<HTMLDivElement | null>,
  dotRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!enabled || !wrap) return;
    let activeId: number | null = null;

    const send = (node: EventTarget | null | undefined, type: string, x: number, y: number) =>
      node?.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, cancelable: true }));
    const svg = () => targetRef.current?.querySelector('svg');

    // While a stroke is in progress, a palm touching elsewhere must not end it or scroll the page
    // under the Pencil.
    const stopScroll = (e: TouchEvent) => e.preventDefault();
    const guard = (on: boolean) => {
      if (on) {
        activeStrokes++;
        document.addEventListener('touchmove', stopScroll, { passive: false });
      } else {
        activeStrokes--;
        document.removeEventListener('touchmove', stopScroll);
      }
    };

    const hideDot = () => dotRef.current?.classList.remove('is-visible');
    const moveDot = (e: PointerEvent) => {
      const dot = dotRef.current;
      if (!dot) return;
      const rect = wrap.getBoundingClientRect();
      dot.style.transform = `translate(${e.clientX - rect.left}px, ${e.clientY - rect.top}px)`;
      dot.classList.add('is-visible');
    };

    const down = (e: PointerEvent) => {
      if (e.pointerType === 'pen') notePenUsed();
      if (e.pointerType === 'touch' && isPenOnly()) return; // finger or palm
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (activeId !== null) return; // one stroke at a time
      e.preventDefault();
      activeId = e.pointerId;
      try {
        wrap.setPointerCapture(e.pointerId);
      } catch {
        // Pointer already gone; the stroke still ends on pointerup/cancel.
      }
      hideDot();
      guard(true);
      send(svg(), 'mousedown', e.clientX, e.clientY);
    };

    const move = (e: PointerEvent) => {
      if (e.pointerId !== activeId) {
        if (e.pointerType === 'pen' && activeId === null && e.buttons === 0) moveDot(e);
        return;
      }
      e.preventDefault();
      const node = svg();
      const samples = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
      for (const sample of samples.length ? samples : [e]) send(node, 'mousemove', sample.clientX, sample.clientY);
    };

    const end = (e: PointerEvent) => {
      if (e.pointerId !== activeId) return;
      activeId = null;
      guard(false);
      send(document, 'mouseup', e.clientX, e.clientY);
    };

    const leave = (e: PointerEvent) => {
      if (e.pointerType === 'pen') hideDot();
    };

    wrap.addEventListener('pointerdown', down);
    wrap.addEventListener('pointermove', move);
    wrap.addEventListener('pointerup', end);
    wrap.addEventListener('pointercancel', end);
    wrap.addEventListener('pointerleave', leave);
    return () => {
      wrap.removeEventListener('pointerdown', down);
      wrap.removeEventListener('pointermove', move);
      wrap.removeEventListener('pointerup', end);
      wrap.removeEventListener('pointercancel', end);
      wrap.removeEventListener('pointerleave', leave);
      if (activeId !== null) guard(false);
    };
  }, [wrapRef, targetRef, dotRef, enabled]);
}

/** 米字格 practice grid: border, centre cross and diagonals. */
export function GridLines({ size }: { size: number }) {
  const s = size;
  return (
    <svg className="char-canvas__grid" width={s} height={s} aria-hidden="true">
      <rect x="0.5" y="0.5" width={s - 1} height={s - 1} />
      <line x1={s / 2} y1="0" x2={s / 2} y2={s} />
      <line x1="0" y1={s / 2} x2={s} y2={s / 2} />
      <line x1="0" y1="0" x2={s} y2={s} />
      <line x1={s} y1="0" x2="0" y2={s} />
    </svg>
  );
}
