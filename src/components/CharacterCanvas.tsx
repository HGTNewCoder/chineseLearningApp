import HanziWriter from 'hanzi-writer';
import { useEffect, useRef, useState } from 'react';
import { charDataLoader } from '../lib/hanzi';

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
  const targetRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

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
      drawingWidth: Math.max(8, Math.round(size / 26)),
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

  const interactive = mode === 'trace' || mode === 'quiz';
  return (
    <div
      className={`char-canvas${interactive ? ' is-interactive' : ''}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={interactive ? 'Drawing area: draw the character with your mouse or finger' : `Character ${char}`}
    >
      {showGrid && <GridLines size={size} />}
      <div ref={targetRef} className="char-canvas__target" />
      {error && <div className="char-canvas__error">Couldn’t load stroke data for {char}</div>}
    </div>
  );
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
