import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { searchWords } from '../lib/decks';
import type { Word } from '../lib/types';
import { getLesson, LEVELS, lessonsForLevel, levelOf, loadLevel } from '../lib/vocab';
import { useProgress } from '../state/ProgressContext';

const MAX_SHOWN = 100;

/** Loads every word of the given HSK levels, in HSK order. */
function useLevelWords(levels: number[]): { words: Word[] | null; error: boolean } {
  const key = levels.join(',');
  const [loaded, setLoaded] = useState<{ key: string; words: Word[] } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setError(false);
    Promise.all(key.split(',').filter(Boolean).map((l) => loadLevel(Number(l))))
      .then((maps) => active && setLoaded({ key, words: maps.flatMap((m) => [...m.values()]) }))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [key]);

  return { words: loaded?.key === key ? loaded.words : null, error };
}

export function DeckEditorPage() {
  const { deckId } = useParams();
  const { state } = useProgress();
  const existing = deckId ? state.decks[deckId] : undefined;

  if (deckId && (!existing || existing.deleted)) {
    return (
      <section className="page">
        <h1>Deck not found</h1>
        <Link to="/flashcards" className="btn">
          Back to flashcards
        </Link>
      </section>
    );
  }
  return <DeckForm key={deckId ?? 'new'} deckId={deckId} initialName={existing?.name ?? ''} initialWords={existing?.wordIds ?? []} />;
}

interface FormProps {
  deckId?: string;
  initialName: string;
  initialWords: string[];
}

function DeckForm({ deckId, initialName, initialWords }: FormProps) {
  const { saveDeck, deleteDeck } = useProgress();
  const navigate = useNavigate();
  const [name, setName] = useState(initialName);
  const [selected, setSelected] = useState(() => initialWords.filter((id) => levelOf(id) !== undefined));
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState(0); // 0 = all levels
  const [lessonId, setLessonId] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const browsing = level > 0 || query.trim() !== '';
  const { words, error } = useLevelWords(browsing ? (level ? [level] : LEVELS) : []);
  const lesson = getLesson(lessonId);

  const results = useMemo(() => {
    if (!words || !browsing) return [];
    const pool = lesson ? words.filter((w) => lesson.wordIds.includes(w.id)) : words;
    return searchWords(pool, query);
  }, [words, browsing, lesson, query]);

  const selectedSet = new Set(selected);
  const allSelected = results.length > 0 && results.every((w) => selectedSet.has(w.id));

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const toggleAll = () => {
    const ids = results.map((w) => w.id);
    setSelected((s) => (allSelected ? s.filter((id) => !ids.includes(id)) : [...s, ...ids.filter((id) => !s.includes(id))]));
  };

  const trimmedName = name.trim();
  const save = () => {
    const id = saveDeck({ name: trimmedName, wordIds: selected }, deckId);
    navigate(`/flashcards?deck=${id}`);
  };

  return (
    <section className="page deck-editor">
      <Link to="/flashcards" className="back-link">
        ← Flashcards
      </Link>
      <h1>{deckId ? 'Edit deck' : 'New deck'}</h1>

      <label className="deck-editor__name">
        <span>Deck name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Food words" maxLength={60} />
      </label>

      <fieldset className="field">
        <legend>
          {selected.length} word{selected.length === 1 ? '' : 's'} selected
        </legend>
        {selected.length ? (
          <div className="word-chips">
            {selected.map((id) => (
              <button key={id} className="chip chip--removable" onClick={() => toggle(id)} aria-label={`Remove ${id}`}>
                <span lang="zh-Hans">{id}</span> ×
              </button>
            ))}
          </div>
        ) : (
          <p className="hint">Find words below and tick them to add them to this deck.</p>
        )}
      </fieldset>

      <fieldset className="field">
        <legend>Find words</legend>
        <input
          type="search"
          className="deck-editor__search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search characters, pinyin or English"
          aria-label="Search words"
        />
        <div className="flashcards__pickers">
          <select
            aria-label="HSK level"
            value={level}
            onChange={(e) => {
              setLevel(Number(e.target.value));
              setLessonId('');
            }}
          >
            <option value={0}>All levels</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                HSK {l}
              </option>
            ))}
          </select>
          {level > 0 && (
            <select aria-label="Lesson" value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
              <option value="">All lessons</option>
              {lessonsForLevel(level).map((l) => (
                <option key={l.id} value={l.id}>
                  Lesson {l.number}: {l.wordIds.slice(0, 3).join(' ')}…
                </option>
              ))}
            </select>
          )}
        </div>

        {!browsing ? (
          <p className="hint">Type to search all 6 HSK levels, or pick a level or lesson to browse.</p>
        ) : error ? (
          <p className="error">Couldn’t load words. Check your connection and try again.</p>
        ) : !words ? (
          <p className="hint">Loading words…</p>
        ) : results.length === 0 ? (
          <p className="hint">No words match “{query.trim()}”.</p>
        ) : (
          <>
            <div className="deck-editor__results-bar">
              <span className="muted">
                {results.length > MAX_SHOWN ? `Showing ${MAX_SHOWN} of ${results.length}` : `${results.length} words`}
              </span>
              <button className="btn btn-ghost" onClick={toggleAll}>
                {allSelected ? 'Deselect all' : `Select all ${results.length}`}
              </button>
            </div>
            <ul className="word-list">
              {results.slice(0, MAX_SHOWN).map((w) => (
                <li key={w.id}>
                  <label className={`word-row${selectedSet.has(w.id) ? ' is-selected' : ''}`}>
                    <input type="checkbox" checked={selectedSet.has(w.id)} onChange={() => toggle(w.id)} />
                    <span className="word-row__hanzi" lang="zh-Hans">
                      {w.hanzi}
                    </span>
                    <span className="word-row__text">
                      <span className="word-row__pinyin" lang="zh-Latn-pinyin">
                        {w.pinyin}
                      </span>
                      <span className="word-row__english">{w.english}</span>
                    </span>
                    <span className="word-row__level">HSK {w.hsk}</span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
      </fieldset>

      <div className="deck-editor__actions">
        <button className="btn btn-primary" onClick={save} disabled={!trimmedName || selected.length === 0}>
          Save deck
        </button>
        <Link to="/flashcards" className="btn">
          Cancel
        </Link>
        {deckId &&
          (confirmingDelete ? (
            <>
              <button
                className="btn btn-danger"
                onClick={() => {
                  deleteDeck(deckId);
                  navigate('/flashcards');
                }}
              >
                Yes, delete deck
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirmingDelete(false)}>
                Keep it
              </button>
            </>
          ) : (
            <button className="btn btn-ghost" onClick={() => setConfirmingDelete(true)}>
              Delete deck
            </button>
          ))}
      </div>
      {(!trimmedName || selected.length === 0) && (
        <p className="hint">{!trimmedName ? 'Give the deck a name to save it.' : 'Add at least one word to save the deck.'}</p>
      )}
    </section>
  );
}
