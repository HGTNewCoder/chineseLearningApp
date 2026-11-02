import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PromptCard } from '../components/PromptCard';
import { ResultBanner } from '../components/ResultBanner';
import { WordWriter, type WordWriterHandle } from '../components/WordWriter';
import { buildQueue, isPass, type Card } from '../lib/srs';
import type { LessonProgress } from '../lib/storage';
import { LESSONS, levelOf } from '../lib/vocab';
import { useProgress } from '../state/ProgressContext';
import { useWords } from '../state/useWords';

export const SESSION_SIZE = 10;

interface Result {
  mistakes: number;
  passed: boolean;
  gaveUp: boolean;
}

/** Words from lessons the user has started that aren't in the deck yet. */
function startedLessonWordIds(lessons: Record<string, LessonProgress>): string[] {
  return LESSONS.filter((l) => (lessons[l.id]?.completedWordIds.length ?? 0) > 0).flatMap((l) => l.wordIds);
}

function makeQueue(srs: Record<string, Card>, lessons: Record<string, LessonProgress>, includeNotDue = false) {
  // Skip cards for words no longer in the vocabulary.
  const known = Object.fromEntries(Object.entries(srs).filter(([id]) => levelOf(id) !== undefined));
  return buildQueue(known, Date.now(), {
    size: SESSION_SIZE,
    newWordIds: startedLessonWordIds(lessons),
    includeNotDue,
  });
}

export function PracticePage() {
  const { state, recordReview } = useProgress();
  const { settings } = state;
  const [queue, setQueue] = useState<string[]>(() => makeQueue(state.srs, state.lessons));
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [tally, setTally] = useState({ passed: 0, failed: 0 });
  const requeued = useRef(new Set<string>());
  const writerRef = useRef<WordWriterHandle>(null);

  const { words, error } = useWords(queue);
  const wordId = queue[index];
  const word = wordId ? words?.[wordId] : undefined;

  // Cloud sync can bring in due words after the page opened; pick them up while idle.
  useEffect(() => {
    if (queue.length === 0) setQueue(makeQueue(state.srs, state.lessons));
  }, [state.srs, state.lessons, queue.length]);

  const finish = (mistakes: number, passed: boolean, gaveUp: boolean) => {
    if (!word || result) return;
    recordReview(word.id, passed);
    setTally((t) => (passed ? { ...t, passed: t.passed + 1 } : { ...t, failed: t.failed + 1 }));
    // Missed words come back once at the end of the session.
    if (!passed && !requeued.current.has(word.id)) {
      requeued.current.add(word.id);
      setQueue((q) => [...q, word.id]);
    }
    setResult({ mistakes, passed, gaveUp });
  };

  const next = () => {
    setResult(null);
    setIndex((i) => i + 1);
  };

  const restart = (includeNotDue: boolean) => {
    requeued.current.clear();
    setQueue(makeQueue(state.srs, state.lessons, includeNotDue));
    setIndex(0);
    setResult(null);
    setTally({ passed: 0, failed: 0 });
  };

  const hasCards = Object.keys(state.srs).length > 0;

  if (queue.length === 0) {
    return (
      <section className="page empty-state">
        <h1>Nothing to review right now</h1>
        {hasCards ? (
          <>
            <p className="muted">You’re all caught up. Come back later, or practice ahead of schedule.</p>
            <div className="button-row">
              <button className="btn btn-primary" onClick={() => restart(true)}>
                Practice ahead
              </button>
              <Link to="/lessons" className="btn">
                Learn new words
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="muted">Start a lesson to add words to your review deck.</p>
            <Link to="/lessons" className="btn btn-primary">
              Go to lessons
            </Link>
          </>
        )}
      </section>
    );
  }

  if (index >= queue.length) {
    return (
      <section className="page empty-state">
        <h1>Session complete</h1>
        <p className="muted">
          {tally.passed} correct · {tally.failed} to work on
        </p>
        <div className="button-row">
          <button className="btn btn-primary" onClick={() => restart(false)}>
            Practice more
          </button>
          <Link to="/" className="btn">
            Home
          </Link>
        </div>
      </section>
    );
  }

  if (!word) {
    return (
      <section className="page empty-state">
        {error ? (
          <>
            <h1>Couldn’t load words</h1>
            <p className="muted">Check your connection and try again.</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Retry
            </button>
          </>
        ) : (
          <p className="muted">Loading…</p>
        )}
      </section>
    );
  }

  return (
    <section className="page practice">
      <header className="practice__header">
        <h1>Practice</h1>
        <p className="muted" aria-live="polite">
          {Math.min(index + 1, queue.length)} / {queue.length}
        </p>
      </header>
      <div className="progress" aria-hidden="true">
        <div className="progress__bar" style={{ width: `${(index / queue.length) * 100}%` }} />
      </div>

      <PromptCard word={word} showHanzi={result !== null} />

      <WordWriter
        key={`${word.id}-${index}`}
        ref={writerRef}
        hanzi={word.hanzi}
        mode="quiz"
        showGrid={settings.showGrid}
        leniency={settings.leniency}
        hintAfterMisses={settings.hintAfterMisses}
        onComplete={(mistakes) => finish(mistakes, isPass(mistakes, [...word.hanzi].length), false)}
      />

      {result ? (
        <ResultBanner passed={result.passed} mistakes={result.mistakes} gaveUp={result.gaveUp}>
          {result.gaveUp && (
            <button className="btn" onClick={() => writerRef.current?.replay()}>
              ↻ Replay
            </button>
          )}
          <button className="btn btn-primary" onClick={next} autoFocus>
            Next →
          </button>
        </ResultBanner>
      ) : (
        <>
          <p className="hint">Draw the characters for this word, one stroke at a time.</p>
          <div className="button-row">
            <button
              className="btn btn-ghost"
              onClick={() => {
                writerRef.current?.reveal();
                finish(0, false, true);
              }}
            >
              Show answer
            </button>
          </div>
        </>
      )}
    </section>
  );
}
