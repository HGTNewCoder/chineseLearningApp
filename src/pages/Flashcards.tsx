import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { WordWriter } from '../components/WordWriter';
import { liveDecks } from '../lib/decks';
import {
  answer,
  currentCard,
  isFinished,
  remainingCount,
  startSession,
  type FlashcardFront,
  type FlashcardSession,
} from '../lib/flashcards';
import type { Word } from '../lib/types';
import { levelOf } from '../lib/vocab';
import { useProgress } from '../state/ProgressContext';
import { useWords } from '../state/useWords';

interface Run {
  /** Changes for every new deck, so each one starts fresh. */
  id: number;
  title: string;
  session: FlashcardSession;
}

const FRONT_LABELS: Record<FlashcardFront, string> = {
  hanzi: 'Characters → meaning',
  english: 'Meaning → characters',
};

export function FlashcardsPage() {
  const { state, updateSettings } = useProgress();
  const [params] = useSearchParams();
  const front = state.settings.flashcardFront;
  const decks = liveDecks(state.decks);

  const [deckId, setDeckId] = useState(() => params.get('deck') ?? '');
  const [shuffled, setShuffled] = useState(true);
  const [run, setRun] = useState<Run | null>(null);

  // Fall back to the first deck if none is chosen or the chosen one was deleted (e.g. on another device).
  const [selectedId, selected] = decks.find(([id]) => id === deckId) ?? decks[0] ?? [];
  const ids = selected?.wordIds.filter((id) => levelOf(id) !== undefined) ?? [];
  const begin = (title: string, wordIds: string[]) =>
    setRun((prev) => ({ id: (prev?.id ?? 0) + 1, title, session: startSession(wordIds, { shuffle: shuffled }) }));

  if (run) {
    return (
      <FlashcardRun
        key={run.id}
        run={run}
        front={front}
        onChange={(session) => setRun({ ...run, session })}
        onRestart={(title, wordIds) => begin(title, wordIds)}
        onExit={() => setRun(null)}
      />
    );
  }

  return (
    <section className="page flashcards">
      <h1>Flashcards</h1>

      <fieldset className="field">
        <legend>Your decks</legend>
        {decks.length > 0 ? (
          <ul className="deck-list">
            {decks.map(([id, d]) => (
              <li key={id} className="deck-list__item">
                <label className="checkbox">
                  <input type="radio" name="deck" checked={id === selectedId} onChange={() => setDeckId(id)} />
                  {d.name}
                  <span className="muted">
                    ({d.wordIds.length} word{d.wordIds.length === 1 ? '' : 's'})
                  </span>
                </label>
                <Link to={`/flashcards/decks/${id}`} className="btn btn-ghost" aria-label={`Edit ${d.name}`}>
                  Edit
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">No decks yet. Make one by picking any words from HSK 1–6.</p>
        )}
        <Link to="/flashcards/decks/new" className={`btn${decks.length ? '' : ' btn-primary'}`}>
          + New deck
        </Link>
      </fieldset>

      {selected && (
        <>
          <fieldset className="field">
            <legend>Show first</legend>
            <div className="segmented" role="radiogroup" aria-label="Side shown first">
              {(Object.keys(FRONT_LABELS) as FlashcardFront[]).map((value) => (
                <button
                  key={value}
                  role="radio"
                  aria-checked={front === value}
                  className={front === value ? 'is-active' : ''}
                  onClick={() => updateSettings({ flashcardFront: value })}
                >
                  {FRONT_LABELS[value]}
                </button>
              ))}
            </div>
            <label className="checkbox flashcards__shuffle">
              <input type="checkbox" checked={shuffled} onChange={(e) => setShuffled(e.target.checked)} />
              Shuffle cards
            </label>
          </fieldset>

          <div className="button-row">
            <button className="btn btn-primary" onClick={() => begin(selected.name, ids)} disabled={ids.length === 0}>
              Start · {ids.length} cards
            </button>
          </div>
        </>
      )}
    </section>
  );
}

interface RunProps {
  run: Run;
  front: FlashcardFront;
  onChange: (session: FlashcardSession) => void;
  onRestart: (title: string, ids: string[]) => void;
  onExit: () => void;
}

function FlashcardRun({ run, front, onChange, onRestart, onExit }: RunProps) {
  const { title, session } = run;
  const { words, error } = useWords(session.deck);
  const wordId = currentCard(session);
  const word = wordId ? words?.[wordId] : undefined;
  const known = session.deck.length - remainingCount(session);

  if (isFinished(session)) {
    const firstTry = session.deck.length - session.missed.length;
    return (
      <section className="page empty-state">
        <h1>Deck complete</h1>
        <p className="muted">
          {firstTry} of {session.deck.length} known on the first try
        </p>
        {session.missed.length > 0 && (
          <div className="word-chips" aria-label="Words to work on">
            {session.missed.map((id) => (
              <span key={id} className="chip" lang="zh-Hans">
                {id}
              </span>
            ))}
          </div>
        )}
        <div className="button-row">
          {session.missed.length > 0 && (
            <button className="btn btn-primary" onClick={() => onRestart(`${title} · missed`, session.missed)}>
              Review {session.missed.length} missed
            </button>
          )}
          <button
            className={`btn${session.missed.length ? '' : ' btn-primary'}`}
            onClick={() => onRestart(title, session.deck)}
          >
            Go again
          </button>
          <button className="btn btn-ghost" onClick={onExit}>
            Choose another deck
          </button>
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
    <section className="page flashcards">
      <header className="practice__header">
        <h1>{title}</h1>
        <p className="muted" aria-live="polite">
          {known} / {session.deck.length} known
        </p>
      </header>
      <div className="progress" aria-hidden="true">
        <div className="progress__bar" style={{ width: `${(known / session.deck.length) * 100}%` }} />
      </div>

      {/* Remount per turn so the next card never flashes its answer side. */}
      <FlashcardTurn key={session.index} word={word} front={front} onAnswer={(knew) => onChange(answer(session, knew))} />

      <div className="button-row">
        <button className="btn btn-ghost" onClick={onExit}>
          End session
        </button>
      </div>
    </section>
  );
}

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

function speak(text: string) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function FlashcardTurn({ word, front, onAnswer }: { word: Word; front: FlashcardFront; onAnswer: (knew: boolean) => void }) {
  const { state } = useProgress();
  const [flipped, setFlipped] = useState(false);
  const [showStrokes, setShowStrokes] = useState(false);
  // The answer side is only rendered once revealed, so it can't be read early.
  const [revealed, setRevealed] = useState(false);

  const flip = () => {
    setFlipped((f) => !f);
    setRevealed(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement;
      if (target.closest('input, select, textarea')) return;
      // Space/Enter on a focused button or link already clicks it.
      if ((e.key === ' ' || e.key === 'Enter') && !target.closest('button, a')) {
        e.preventDefault();
        setFlipped((f) => !f);
        setRevealed(true);
      } else if (revealed && (e.key === 'ArrowLeft' || e.key === '1')) {
        onAnswer(false);
      } else if (revealed && (e.key === 'ArrowRight' || e.key === '2')) {
        onAnswer(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, onAnswer]);

  return (
    <>
      <button type="button" className={`flashcard${flipped ? ' is-flipped' : ''}`} onClick={flip}>
        <span className="flashcard__inner">
          <span className="flashcard__face" aria-hidden={flipped}>
            {front === 'hanzi' ? (
              <span className="flashcard__hanzi" lang="zh-Hans">
                {word.hanzi}
              </span>
            ) : (
              <>
                <span className="flashcard__english">{word.english}</span>
                <span className="flashcard__pinyin" lang="zh-Latn-pinyin">
                  {word.pinyin}
                </span>
              </>
            )}
            <span className="flashcard__tap">Tap or press Space to flip</span>
          </span>
          <span className="flashcard__face flashcard__face--back" aria-hidden={!flipped}>
            {revealed && (
              <>
                <span className="flashcard__hanzi" lang="zh-Hans">
                  {word.hanzi}
                </span>
                <span className="flashcard__pinyin" lang="zh-Latn-pinyin">
                  {word.pinyin}
                </span>
                <span className="flashcard__english">{word.english}</span>
              </>
            )}
          </span>
        </span>
      </button>

      {revealed ? (
        <>
          <div className="button-row">
            <button className="btn flashcard__again" onClick={() => onAnswer(false)}>
              ✗ Again
            </button>
            <button className="btn btn-primary" onClick={() => onAnswer(true)}>
              ✓ Got it
            </button>
          </div>
          <div className="button-row">
            <button className="btn btn-ghost" onClick={() => setShowStrokes((s) => !s)} aria-expanded={showStrokes}>
              {showStrokes ? 'Hide strokes' : '▶ Stroke order'}
            </button>
            {canSpeak && (
              <button className="btn btn-ghost" onClick={() => speak(word.hanzi)}>
                🔊 Listen
              </button>
            )}
          </div>
          {showStrokes && <WordWriter hanzi={word.hanzi} mode="animate" showGrid={state.settings.showGrid} />}
        </>
      ) : (
        <div className="button-row">
          <button className="btn btn-primary" onClick={flip}>
            Show answer
          </button>
        </div>
      )}
    </>
  );
}
