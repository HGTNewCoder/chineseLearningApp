import { Link } from 'react-router-dom';
import { isDue, MAX_BOX } from '../lib/srs';
import { LESSONS, WORDS } from '../lib/vocab';
import { useProgress } from '../state/ProgressContext';

export function HomePage() {
  const { state } = useProgress();
  const now = Date.now();
  const cards = Object.values(state.srs);
  const due = cards.filter((c) => isDue(c, now)).length;
  const mastered = cards.filter((c) => c.box >= MAX_BOX).length;
  const lessonsDone = LESSONS.filter((l) => (state.lessons[l.id]?.completedWordIds.length ?? 0) >= l.words.length).length;
  const nextLesson = LESSONS.find((l) => (state.lessons[l.id]?.completedWordIds.length ?? 0) < l.words.length);

  return (
    <section className="page home">
      <div className="hero">
        <p className="hero__glyph" lang="zh-Hans" aria-hidden="true">
          写字
        </p>
        <h1>Learn to write Chinese, stroke by stroke</h1>
        <p className="muted">
          See the English and pinyin, then draw the characters with your mouse. Every stroke is checked against the
          real stroke order.
        </p>
      </div>

      <div className="stats">
        <Stat label="Due now" value={due} />
        <Stat label="Words learned" value={`${cards.length} / ${WORDS.length}`} />
        <Stat label="Mastered" value={mastered} />
        <Stat label="Lessons done" value={`${lessonsDone} / ${LESSONS.length}`} />
      </div>

      <div className="cta-grid">
        <Link to="/practice" className="cta">
          <span className="cta__title">Review</span>
          <span className="cta__body">{due > 0 ? `${due} word${due === 1 ? '' : 's'} waiting` : 'You’re caught up'}</span>
        </Link>
        {nextLesson && (
          <Link to={`/lessons/${nextLesson.id}`} className="cta">
            <span className="cta__title">{cards.length ? 'Continue learning' : 'Start learning'}</span>
            <span className="cta__body">
              {nextLesson.title} ·{' '}
              <span lang="zh-Hans">
                {nextLesson.words
                  .slice(0, 4)
                  .map((w) => w.hanzi)
                  .join(' ')}
              </span>
              …
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stat">
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}
