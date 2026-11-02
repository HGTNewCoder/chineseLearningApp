import HanziWriter, { type CharacterJson } from 'hanzi-writer';
import { useEffect, useId, useState } from 'react';
import { loadCharData, medianLength, medianToPath, toScreen } from '../lib/hanzi';
import { GridLines } from './CharacterCanvas';

interface Props {
  hanzi: string;
  size?: number;
  showGrid?: boolean;
  /** Called when the user has stepped through every stroke of every character. */
  onFinished?: () => void;
}

interface Step {
  charIndex: number;
  strokeIndex: number;
}

/**
 * Walks through a word one stroke at a time: finished strokes are solid, the
 * current stroke is highlighted and drawn along its direction, with a dot
 * marking where to start.
 */
export function StrokeStepper({ hanzi, size = 280, showGrid = true, onFinished }: Props) {
  const chars = [...hanzi];
  const [data, setData] = useState<CharacterJson[] | null>(null);
  const [error, setError] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [replay, setReplay] = useState(0);
  const clipId = `clip-${useId().replace(/[^\w-]/g, '')}`;

  useEffect(() => {
    let active = true;
    setData(null);
    setError(false);
    setStepIndex(0);
    Promise.all([...hanzi].map(loadCharData))
      .then((loaded) => active && setData(loaded))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [hanzi]);

  if (error) return <p className="error">Couldn’t load stroke data for {hanzi}.</p>;
  if (!data) return <div className="char-canvas is-loading" style={{ width: size, height: size }} />;

  const steps: Step[] = data.flatMap((d, charIndex) => d.strokes.map((_, strokeIndex) => ({ charIndex, strokeIndex })));
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const char = data[step.charIndex];
  const median = char.medians[step.strokeIndex];
  const t = HanziWriter.getScalingTransform(size, size, Math.round(size * 0.05));
  const length = medianLength(median) + 120;
  const [startX, startY] = toScreen(t, size, median[0]);
  const isLast = stepIndex >= steps.length - 1;

  const goTo = (i: number) => {
    setStepIndex(Math.max(0, Math.min(steps.length - 1, i)));
    setReplay((r) => r + 1);
  };

  return (
    <div className="stroke-stepper">
      {chars.length > 1 && (
        <div className="stroke-stepper__chars" role="tablist" aria-label="Characters">
          {chars.map((c, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === step.charIndex}
              className={`chip${i === step.charIndex ? ' is-active' : ''}`}
              onClick={() => goTo(steps.findIndex((s) => s.charIndex === i))}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="char-canvas" style={{ width: size, height: size }}>
        {showGrid && <GridLines size={size} />}
        <svg width={size} height={size} className="stroke-stepper__svg" aria-label={`Stroke ${step.strokeIndex + 1} of ${chars[step.charIndex]}`} role="img">
          <defs>
            <clipPath id={clipId}>
              <path d={char.strokes[step.strokeIndex]} transform={t.transform} />
            </clipPath>
          </defs>
          <g transform={t.transform}>
            {char.strokes.map((d, i) => (
              <path
                key={i}
                d={d}
                className={i < step.strokeIndex ? 'stroke-done' : i === step.strokeIndex ? 'stroke-current-bg' : 'stroke-todo'}
              />
            ))}
          </g>
          <g clipPath={`url(#${clipId})`}>
            <path
              key={`${stepIndex}-${replay}`}
              d={medianToPath(median)}
              transform={t.transform}
              className="stroke-current"
              style={{ strokeDasharray: length, strokeDashoffset: length, ['--len' as string]: length }}
            />
          </g>
          <circle cx={startX} cy={startY} r={Math.max(6, size / 32)} className="stroke-start" />
        </svg>
      </div>

      <p className="stroke-stepper__label" aria-live="polite">
        {chars.length > 1 && <>Character {step.charIndex + 1} of {chars.length} · </>}
        Stroke {step.strokeIndex + 1} of {char.strokes.length}
      </p>

      <div className="button-row">
        <button className="btn" onClick={() => goTo(stepIndex - 1)} disabled={stepIndex === 0}>
          ← Previous
        </button>
        <button className="btn" onClick={() => setReplay((r) => r + 1)}>
          ↻ Replay
        </button>
        {isLast ? (
          <button className="btn btn-primary" onClick={onFinished}>
            Start tracing →
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => goTo(stepIndex + 1)}>
            Next stroke →
          </button>
        )}
      </div>
    </div>
  );
}
