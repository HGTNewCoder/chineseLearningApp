import { Link } from 'react-router-dom';
import { ChartCard, ColumnChart, DonutChart, Heatmap, ProgressBars, useContainerWidth } from '../components/Charts';
import { bestStreak, heatmapWeeks, lastDays, levelProgress, STAGES, stageCounts } from '../lib/dashboard';
import { isDue } from '../lib/srs';
import { currentStreak, dayKey } from '../lib/streak';
import { LESSONS } from '../lib/vocab';
import { useProgress } from '../state/ProgressContext';
import { useSync } from '../sync/SyncProvider';

const STAGE_COLORS = STAGES.map((_, i) => `var(--chart-stage-${i + 1})`);
const STAGE_NOTES = ['Just learned or missed', 'Next review in 1 day', 'In 3 days', 'In 7 days', 'In 14 days'];

const shortDate = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const longDate = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const weekday = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'short' });

export function HomePage() {
  const { state } = useProgress();
  const sync = useSync();
  const now = new Date();
  const cards = Object.values(state.srs);
  const due = cards.filter((c) => isDue(c, now.getTime())).length;
  const isDone = (id: string, size: number) => (state.lessons[id]?.completedWordIds.length ?? 0) >= size;
  const nextLesson = LESSONS.find((l) => !isDone(l.id, l.wordIds.length));
  const today = state.activity[dayKey(now)] ?? 0;
  const goal = state.settings.dailyGoal;
  const streak = currentStreak(state.activity, now);
  const isNew = cards.length === 0 && Object.keys(state.activity).length === 0;

  return (
    <section className="page home">
      {isNew ? (
        <div className="hero">
          <p className="hero__glyph" lang="zh-Hans" aria-hidden="true">
            写字
          </p>
          <h1>Learn to write Chinese, stroke by stroke</h1>
          <p className="muted">
            See the English and pinyin, then draw the characters with your mouse or finger. Every stroke is checked
            against the real stroke order.
          </p>
        </div>
      ) : (
        <header className="dash-header">
          <h1>Your progress</h1>
          <p className="muted">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </header>
      )}

      <TodayCard
        today={today}
        goal={goal}
        streak={streak}
        best={bestStreak(state.activity)}
        activity={state.activity}
        now={now}
      />

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
        <Link to="/flashcards" className="cta">
          <span className="cta__title">Flashcards</span>
          <span className="cta__body">Study your own word decks</span>
        </Link>
      </div>

      {sync.enabled && sync.status === 'signed-out' && cards.length > 0 && (
        <p className="hint">
          Your progress is saved in this browser only. <Link to="/account">Log in or create an account</Link> to keep it
          safe and use it on other devices.
        </p>
      )}

      {isNew ? (
        <p className="dash-empty">Finish your first lesson to see your progress charts here.</p>
      ) : (
        <Dashboard />
      )}
    </section>
  );
}

function TodayCard({
  today,
  goal,
  streak,
  best,
  activity,
  now,
}: {
  today: number;
  goal: number;
  streak: number;
  best: number;
  activity: Record<string, number>;
  now: Date;
}) {
  const week = lastDays(activity, 7, now);
  return (
    <div className="goal">
      <div className="goal__text">
        <span className="goal__title">{today >= goal ? 'Daily goal reached 🎉' : `Today: ${today} / ${goal} words`}</span>
        <span className="muted">
          {streak > 0 ? `🔥 ${streak}-day streak` : 'Practice today to start a streak'}
          {best > streak && <span className="goal__best"> · Best {best} days</span>}
        </span>
      </div>
      <div
        className="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(today, goal)}
        aria-label="Daily goal"
      >
        <div className="progress__bar" style={{ width: `${Math.min(100, (today / goal) * 100)}%` }} />
      </div>
      <ol className="week-strip" aria-label="Last 7 days">
        {week.map((d, i) => {
          const state = d.count >= goal ? 'goal' : d.count > 0 ? 'active' : 'none';
          const status = state === 'goal' ? 'goal reached' : state === 'active' ? `${d.count} words` : 'no practice';
          return (
            <li key={d.day} className={`week-strip__day is-${state}${i === 6 ? ' is-today' : ''}`}>
              <span className="week-strip__dot" aria-hidden="true">
                {state === 'goal' ? '✓' : ''}
              </span>
              <span className="week-strip__name">
                {i === 6 ? 'Today' : weekday(d.date)}
                <span className="visually-hidden">: {status}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Dashboard() {
  const { state } = useProgress();
  const now = new Date();
  const goal = state.settings.dailyGoal;

  const days = lastDays(state.activity, 30, now);
  const total30 = days.reduce((n, d) => n + d.count, 0);
  const activeDays = days.filter((d) => d.count > 0).length;
  const activity = days.map((d, i) => ({
    key: d.day,
    label: longDate(d.date),
    value: d.count,
    axisLabel: i === days.length - 1 ? 'Today' : (days.length - 1 - i) % 7 === 0 ? shortDate(d.date) : undefined,
  }));

  const stages = stageCounts(state.srs);
  const segments = STAGES.map((label, i) => ({
    label,
    value: stages[i],
    color: STAGE_COLORS[i],
    note: STAGE_NOTES[i],
  }));

  const levels = levelProgress(state.srs);
  const levelRows = levels.map((l) => ({
    label: `HSK ${l.hsk}`,
    total: l.total,
    parts: [
      { label: 'Mastered', value: l.mastered, color: 'var(--chart-stage-5)' },
      { label: 'Learning', value: l.learned - l.mastered, color: 'var(--chart-stage-2)' },
    ],
  }));

  return (
    <div className="dash-grid">
      <ChartCard
        className="span-2"
        title="Daily activity"
        subtitle={`${total30.toLocaleString()} words practiced on ${activeDays} of the last 30 days`}
        table={{ columns: ['Day', 'Words'], rows: days.map((d) => [longDate(d.date), d.count]) }}
      >
        <ColumnChart
          data={activity}
          unit="words"
          goal={{ value: goal, label: `Goal ${goal}` }}
          ariaLabel="Words practiced per day, last 30 days"
        />
      </ChartCard>

      <ChartCard
        className="span-2"
        title="Memory strength"
        subtitle="Your words by review stage"
        table={{ columns: ['Stage', 'Words'], rows: segments.map((s) => [s.label, s.value]) }}
      >
        <DonutChart segments={segments} centerLabel="words learned" />
      </ChartCard>

      <ChartCard
        className="span-2"
        title="HSK levels"
        subtitle="Words learned in each level"
        table={{
          columns: ['Level', 'Mastered', 'Learning', 'Total words'],
          rows: levels.map((l) => [`HSK ${l.hsk}`, l.mastered, l.learned - l.mastered, l.total]),
        }}
      >
        <ProgressBars rows={levelRows} />
      </ChartCard>

      <StudyCalendar activity={state.activity} goal={goal} now={now} />
    </div>
  );
}

const LEVEL_NAMES = ['No practice', 'Under half your goal', 'Under your goal', 'Goal reached', 'Twice your goal'];

function heatLevel(count: number, goal: number): number {
  if (count <= 0) return 0;
  if (count < goal / 2) return 1;
  if (count < goal) return 2;
  if (count < goal * 2) return 3;
  return 4;
}

function StudyCalendar({ activity, goal, now }: { activity: Record<string, number>; goal: number; now: Date }) {
  const [ref, width] = useContainerWidth<HTMLDivElement>();
  // As many ~12px weeks as fit, up to a year; cells then grow to fill the row.
  const count = Math.min(52, Math.max(8, Math.floor((width - 28) / 15)));
  const cell = Math.min(18, Math.floor((width - 28) / count) - 3);
  const grid = heatmapWeeks(activity, count, now);
  const weeks = grid.map((week) =>
    week.map((d) =>
      d ? { key: d.day, label: longDate(d.date), value: d.count, level: heatLevel(d.count, goal) } : null,
    ),
  );
  const monthLabel = (w: number) => {
    const first = grid[w][0]!;
    const prev = grid[w - 1]?.[0];
    return !prev || prev.date.getMonth() !== first.date.getMonth()
      ? first.date.toLocaleDateString(undefined, { month: 'short' })
      : undefined;
  };
  const days = grid.flat().filter((d) => d !== null);
  const goalDays = days.filter((d) => d.count >= goal).length;

  return (
    <ChartCard
      className="span-2"
      title="Study calendar"
      subtitle={`Daily goal reached on ${goalDays} of the last ${days.length} days`}
      table={{
        columns: ['Day', 'Words'],
        rows: days.filter((d) => d.count > 0).map((d) => [longDate(d.date), d.count]),
      }}
    >
      <div ref={ref}>
        <Heatmap weeks={weeks} monthLabel={monthLabel} unit="words" cell={cell} />
      </div>
      <div className="heat-legend" aria-hidden="true">
        <span>Less</span>
        {LEVEL_NAMES.map((name, i) => (
          <span key={name} className={`heat-legend__cell heat-${i}`} title={name} />
        ))}
        <span>More</span>
        <span className="heat-legend__note">Last shade = twice your daily goal</span>
      </div>
    </ChartCard>
  );
}
