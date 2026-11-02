import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { CharacterCanvas, type CanvasMode } from './CharacterCanvas';

export type WordMode = 'static' | 'animate' | 'trace' | 'quiz';

export interface WordWriterHandle {
  /** Replays the stroke animation for every character in order. */
  replay: () => void;
  /** Stops the quiz and animates the correct answer. */
  reveal: () => void;
}

interface Props {
  hanzi: string;
  mode: WordMode;
  showGrid?: boolean;
  leniency?: number;
  hintAfterMisses?: number | false;
  /** Called once every character has been written, with the summed mistakes. */
  onComplete?: (totalMistakes: number) => void;
  onAnimationComplete?: () => void;
  onMistake?: () => void;
  ref?: Ref<WordWriterHandle>;
}

const MAX_SIZE = 280;
const MIN_SIZE = 120;
const GAP = 12;

/** Largest canvas size that fits `count` characters across the viewport. */
function fitSize(count: number): number {
  const available = Math.min(window.innerWidth, 760) - 32;
  const size = Math.floor((available - GAP * (count - 1)) / count);
  return Math.max(MIN_SIZE, Math.min(MAX_SIZE, size));
}

function useCanvasSize(count: number): number {
  const [size, setSize] = useState(() => fitSize(count));
  useEffect(() => {
    const onResize = () => setSize(fitSize(count));
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [count]);
  return size;
}

/**
 * Writes a (possibly multi-character) word one character at a time.
 * Characters before the active one are shown finished; later ones wait as
 * outlines (trace/animate) or blank boxes (quiz). Remount (via `key`) to start over.
 */
export function WordWriter({
  hanzi,
  mode,
  showGrid = true,
  leniency,
  hintAfterMisses,
  onComplete,
  onAnimationComplete,
  onMistake,
  ref,
}: Props) {
  const chars = [...hanzi];
  const size = useCanvasSize(chars.length);
  const [active, setActive] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [run, setRun] = useState(0);
  const mistakes = useRef(0);

  useImperativeHandle(ref, () => ({
    replay: () => {
      setActive(0);
      setRun((r) => r + 1);
    },
    reveal: () => {
      setRevealed(true);
      setActive(0);
      setRun((r) => r + 1);
    },
  }));

  const effectiveMode: WordMode = revealed ? 'animate' : mode;

  const modeFor = (i: number): CanvasMode => {
    if (effectiveMode === 'static' || i < active) return 'static';
    if (i === active) return effectiveMode;
    return effectiveMode === 'quiz' ? 'blank' : 'outline';
  };

  const handleQuizComplete = (charMistakes: number) => {
    mistakes.current += charMistakes;
    const next = active + 1;
    setActive(next);
    if (next >= chars.length) onComplete?.(mistakes.current);
  };

  const handleAnimationComplete = () => {
    const next = active + 1;
    setActive(next);
    if (next >= chars.length) onAnimationComplete?.();
  };

  return (
    <div className="word-writer" style={{ gap: GAP }}>
      {chars.map((char, i) => (
        <CharacterCanvas
          key={`${run}-${i}`}
          char={char}
          mode={modeFor(i)}
          size={size}
          showGrid={showGrid}
          leniency={leniency}
          hintAfterMisses={hintAfterMisses}
          onQuizComplete={handleQuizComplete}
          onAnimationComplete={handleAnimationComplete}
          onMistake={onMistake}
        />
      ))}
    </div>
  );
}
