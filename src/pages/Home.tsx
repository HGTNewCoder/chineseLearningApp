import { Link } from 'react-router-dom';
import { isDue, MAX_BOX } from '../lib/srs';
import { currentStreak, dayKey } from '../lib/streak';
import { LESSONS, TOTAL_WORDS } from '../lib/vocab';
import { useProgress } from '../state/ProgressContext';
import { useSync } from '../sync/SyncProvider';

export function HomePage() {
  const { state } = useProgress();
  const sync = useSync();
  const now = new Date();
  const cards = Object.values(state.srs);
  const due = cards.filter((c) => isDue(c, now.getTime())).length;
  const mastered = cards.filter((c) => c.box >= MAX_BOX).length;
  const isDone = (id: string, size: number) => (state.lessons[id]?.completedWordIds.length ?? 0) >= size;
  const lessonsDone = LESSONS.filter((l) => isDone(l.id, l.wordIds.length)).length;
  const nextLesson = LESSONS.find((l) => !isDone(l.id, l.wordIds.length));
  const today = state.activity[dayKey(now)] ?? 0;
  const goal = state.settings.dailyGoal;
  const streak = currentStreak(state.activity, now);

  return (
    <section className="page home">
      <div className="hero">
        <p className="hero__glyph" lang="zh-Hans" aria-hidden="true">
          写字
        </p>
        <h1>Learn to write Chinese, stroke by stroke</h1>
        <p className="muted">
          See the English and pinyin, then draw the characters with your mouse or finger. Every stroke is checked against
          the real stroke order.
        </p>
      </div>

      <div className="goal">
        <div className="goal__text">
          <span className="goal__title">
            {today >= goal ? 'Daily goal reached 🎉' : `Today: ${today} / ${goal} words`}
          </span>
          <span className="muted">
            {streak > 0 ? `🔥 ${streak}-day streak` : 'Practice today to start a streak'}
          </span>
        </div>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(today, goal)} aria-label="Daily goal">
          <div className="progress__bar" style={{ width: `${Math.min(100, (today / goal) * 100)}%` }} />
        </div>
      </div>

      <div className="stats">
        <Stat label="Due now" value={due} />
        <Stat label="Words learned" value={`${cards.length} / ${TOTAL_WORDS}`} />
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
              {nextLesson.title} · <span lang="zh-Hans">{nextLesson.wordIds.slice(0, 4).join(' ')}</span>…
            </span>
          </Link>
        )}
      </div>

      {sync.enabled && sync.status === 'signed-out' && cards.length > 0 && (
        <p className="hint">
          Your progress is saved in this browser only. <Link to="/account">Sign in</Link> to keep it safe and use it on
          other devices.
        </p>
      )}
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
