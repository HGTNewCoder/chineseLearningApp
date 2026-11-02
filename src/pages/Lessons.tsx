import { Link } from 'react-router-dom';
import { LESSONS } from '../lib/vocab';
import { useProgress } from '../state/ProgressContext';

export function LessonsPage() {
  const { state } = useProgress();
  const levels = [...new Set(LESSONS.map((l) => l.hsk))];

  return (
    <section className="page">
      <h1>Lessons</h1>
      <p className="muted">Each lesson teaches 10 words: watch, step through the strokes, trace, then write from memory.</p>

      {levels.map((hsk) => (
        <div key={hsk} className="level">
          <h2>HSK {hsk}</h2>
          <ul className="lesson-grid">
            {LESSONS.filter((l) => l.hsk === hsk).map((lesson) => {
              const done = state.lessons[lesson.id]?.completedWordIds.length ?? 0;
              const pct = Math.round((done / lesson.words.length) * 100);
              return (
                <li key={lesson.id}>
                  <Link to={`/lessons/${lesson.id}`} className={`lesson-card${pct === 100 ? ' is-complete' : ''}`}>
                    <span className="lesson-card__title">Lesson {lesson.number}</span>
                    <span className="lesson-card__words" lang="zh-Hans">
                      {lesson.words.map((w) => w.hanzi).join(' ')}
                    </span>
                    <span className="progress" aria-label={`${pct}% complete`}>
                      <span className="progress__bar" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="lesson-card__meta">
                      {done} / {lesson.words.length} words
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
