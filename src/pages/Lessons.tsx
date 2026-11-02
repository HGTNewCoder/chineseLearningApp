import { Link, useSearchParams } from 'react-router-dom';
import { LEVELS, lessonsForLevel } from '../lib/vocab';
import { useProgress } from '../state/ProgressContext';

export function LessonsPage() {
  const { state } = useProgress();
  const [params, setParams] = useSearchParams();
  const requested = Number(params.get('hsk'));
  const hsk = LEVELS.includes(requested) ? requested : LEVELS[0];
  const lessons = lessonsForLevel(hsk);

  const levelProgress = (level: number) => {
    const all = lessonsForLevel(level);
    const total = all.reduce((n, l) => n + l.wordIds.length, 0);
    const done = all.reduce((n, l) => n + (state.lessons[l.id]?.completedWordIds.length ?? 0), 0);
    return { total, done };
  };

  return (
    <section className="page">
      <h1>Lessons</h1>
      <p className="muted">Each lesson teaches 10 words: watch, step through the strokes, trace, then write from memory.</p>

      <div className="level-tabs" role="tablist" aria-label="HSK level">
        {LEVELS.map((level) => {
          const { total, done } = levelProgress(level);
          return (
            <button
              key={level}
              role="tab"
              aria-selected={level === hsk}
              className={`level-tab${level === hsk ? ' is-active' : ''}`}
              onClick={() => setParams({ hsk: String(level) }, { replace: true })}
            >
              HSK {level}
              <span className="level-tab__meta">
                {done ? `${done}/` : ''}
                {total} words
              </span>
            </button>
          );
        })}
      </div>

      <ul className="lesson-grid" role="tabpanel">
        {lessons.map((lesson) => {
          const done = state.lessons[lesson.id]?.completedWordIds.length ?? 0;
          const pct = Math.round((done / lesson.wordIds.length) * 100);
          return (
            <li key={lesson.id}>
              <Link to={`/lessons/${lesson.id}`} className={`lesson-card${pct === 100 ? ' is-complete' : ''}`}>
                <span className="lesson-card__title">Lesson {lesson.number}</span>
                <span className="lesson-card__words" lang="zh-Hans">
                  {lesson.wordIds.join(' ')}
                </span>
                <span className="progress" aria-label={`${pct}% complete`}>
                  <span className="progress__bar" style={{ width: `${pct}%` }} />
                </span>
                <span className="lesson-card__meta">
                  {done} / {lesson.wordIds.length} words
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
