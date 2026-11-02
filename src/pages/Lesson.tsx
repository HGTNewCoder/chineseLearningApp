import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PromptCard } from '../components/PromptCard';
import { ResultBanner } from '../components/ResultBanner';
import { StrokeStepper } from '../components/StrokeStepper';
import { WordWriter, type WordWriterHandle } from '../components/WordWriter';
import { isPass } from '../lib/srs';
import type { Lesson } from '../lib/types';
import { getLesson, getNextLesson } from '../lib/vocab';
import { useProgress } from '../state/ProgressContext';
import { useWords } from '../state/useWords';

type Step = 'intro' | 'strokes' | 'trace' | 'recall';

const STEPS: { key: Step; label: string }[] = [
  { key: 'intro', label: 'Watch' },
  { key: 'strokes', label: 'Stroke by stroke' },
  { key: 'trace', label: 'Trace' },
  { key: 'recall', label: 'From memory' },
];

export function LessonPage() {
  const { lessonId = '' } = useParams();
  const lesson = getLesson(lessonId);
  if (!lesson) {
    return (
      <section className="page">
        <h1>Lesson not found</h1>
        <Link to="/lessons" className="btn">
          Back to lessons
        </Link>
      </section>
    );
  }
  // Remount when navigating between lessons so all step state resets.
  return <LessonFlow key={lesson.id} lesson={lesson} />;
}

function LessonFlow({ lesson }: { lesson: Lesson }) {
  const { state, completeLessonWord } = useProgress();
  const completed = state.lessons[lesson.id]?.completedWordIds ?? [];

  const [wordIndex, setWordIndex] = useState(() => {
    const firstOpen = lesson.wordIds.findIndex((id) => !completed.includes(id));
    return firstOpen === -1 ? 0 : firstOpen;
  });
  const [step, setStep] = useState<Step>('intro');
  const [attempt, setAttempt] = useState(0);
  const [traced, setTraced] = useState(false);
  const [recallMistakes, setRecallMistakes] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const writerRef = useRef<WordWriterHandle>(null);
  const { words, error } = useWords(lesson.wordIds);

  const wordId = lesson.wordIds[wordIndex];
  const word = words?.[wordId];
  const { settings } = state;
  const nextLesson = getNextLesson(lesson.id);

  const goToStep = (next: Step) => {
    setStep(next);
    setAttempt((a) => a + 1);
    setTraced(false);
    setRecallMistakes(null);
  };

  const goToWord = (index: number) => {
    setWordIndex(index);
    setFinished(false);
    goToStep('intro');
  };

  const nextWord = () => {
    if (wordIndex + 1 < lesson.wordIds.length) goToWord(wordIndex + 1);
    else setFinished(true);
  };

  const handleRecallComplete = (mistakes: number) => {
    setRecallMistakes(mistakes);
    completeLessonWord(lesson.id, wordId);
  };

  if (finished) {
    return (
      <section className="page lesson-done">
        <h1>Lesson complete 🎉</h1>
        <p className="muted">
          You learned {lesson.wordIds.length} words. They’re now in your review deck, so practice them over the next few
          days to make them stick.
        </p>
        <div className="word-chips">
          {lesson.wordIds.map((id) => (
            <span key={id} className="chip" lang="zh-Hans">
              {id}
            </span>
          ))}
        </div>
        <div className="button-row">
          <Link to="/practice" className="btn btn-primary">
            Practice now
          </Link>
          {nextLesson && (
            <Link to={`/lessons/${nextLesson.id}`} className="btn">
              Next lesson →
            </Link>
          )}
          <Link to="/lessons" className="btn btn-ghost">
            All lessons
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
            <h1>Couldn’t load this lesson</h1>
            <p className="muted">Check your connection and try again.</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Retry
            </button>
          </>
        ) : (
          <p className="muted">Loading lesson…</p>
        )}
      </section>
    );
  }

  const writerKey = `${wordId}-${step}-${attempt}`;

  return (
    <section className="page lesson">
      <header className="lesson__header">
        <Link to="/lessons" className="back-link">
          ← Lessons
        </Link>
        <h1>{lesson.title}</h1>
        <p className="muted">
          Word {wordIndex + 1} of {lesson.wordIds.length}
        </p>
      </header>

      <nav className="word-chips" aria-label="Words in this lesson">
        {lesson.wordIds.map((id, i) => (
          <button
            key={id}
            className={`chip${i === wordIndex ? ' is-active' : ''}${completed.includes(id) ? ' is-done' : ''}`}
            onClick={() => goToWord(i)}
            aria-current={i === wordIndex ? 'true' : undefined}
            lang="zh-Hans"
            title={words?.[id] ? `${words[id].pinyin}: ${words[id].english}` : undefined}
          >
            {id}
          </button>
        ))}
      </nav>

      <ol className="steps" aria-label="Learning steps">
        {STEPS.map((s, i) => (
          <li key={s.key}>
            <button
              className={`step${s.key === step ? ' is-active' : ''}`}
              onClick={() => goToStep(s.key)}
              aria-current={s.key === step ? 'step' : undefined}
            >
              <span className="step__num">{i + 1}</span> {s.label}
            </button>
          </li>
        ))}
      </ol>

      <div className="lesson__body">
        <PromptCard word={word} showHanzi={step !== 'recall' || recallMistakes !== null} />

        {step === 'intro' && (
          <>
            <WordWriter key={writerKey} ref={writerRef} hanzi={word.hanzi} mode="animate" showGrid={settings.showGrid} />
            <p className="hint">Watch the stroke order. Each stroke is drawn in the order you should write it.</p>
            <div className="button-row">
              <button className="btn" onClick={() => writerRef.current?.replay()}>
                ↻ Replay
              </button>
              <button className="btn btn-primary" onClick={() => goToStep('strokes')}>
                Stroke by stroke →
              </button>
            </div>
          </>
        )}

        {step === 'strokes' && (
          <StrokeStepper key={writerKey} hanzi={word.hanzi} showGrid={settings.showGrid} onFinished={() => goToStep('trace')} />
        )}

        {step === 'trace' && (
          <>
            <WordWriter
              key={writerKey}
              hanzi={word.hanzi}
              mode="trace"
              showGrid={settings.showGrid}
              leniency={settings.leniency}
              onComplete={() => setTraced(true)}
            />
            <p className="hint">Trace over the outline with your mouse. The next stroke lights up if you miss.</p>
            <div className="button-row">
              <button className="btn" onClick={() => goToStep('trace')}>
                ↻ Again
              </button>
              <button className={`btn${traced ? ' btn-primary' : ''}`} onClick={() => goToStep('recall')}>
                Write from memory →
              </button>
            </div>
          </>
        )}

        {step === 'recall' && (
          <>
            <WordWriter
              key={writerKey}
              ref={writerRef}
              hanzi={word.hanzi}
              mode="quiz"
              showGrid={settings.showGrid}
              leniency={settings.leniency}
              hintAfterMisses={settings.hintAfterMisses}
              onComplete={handleRecallComplete}
            />
            {recallMistakes === null ? (
              <>
                <p className="hint">Now write it without the outline.</p>
                <div className="button-row">
                  <button className="btn btn-ghost" onClick={() => goToStep('strokes')}>
                    I need another look
                  </button>
                </div>
              </>
            ) : (
              <ResultBanner passed={isPass(recallMistakes, [...word.hanzi].length)} mistakes={recallMistakes}>
                <button className="btn" onClick={() => goToStep('recall')}>
                  Try again
                </button>
                <button className="btn btn-primary" onClick={nextWord} autoFocus>
                  {wordIndex + 1 < lesson.wordIds.length ? 'Next word →' : 'Finish lesson'}
                </button>
              </ResultBanner>
            )}
          </>
        )}
      </div>
    </section>
  );
}
