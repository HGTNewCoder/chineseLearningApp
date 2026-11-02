import type { ReactNode } from 'react';

interface Props {
  passed: boolean;
  mistakes: number;
  /** True when the user gave up and the answer was shown. */
  gaveUp?: boolean;
  children?: ReactNode;
}

export function ResultBanner({ passed, mistakes, gaveUp = false, children }: Props) {
  const title = gaveUp ? 'Here’s how it’s written' : passed ? (mistakes === 0 ? 'Perfect!' : 'Correct!') : 'Keep practicing';
  const detail = gaveUp
    ? 'Watch the strokes. This word will come back soon.'
    : `${mistakes} ${mistakes === 1 ? 'mistake' : 'mistakes'}${passed ? '' : ' · this word will come back soon'}`;

  return (
    <div className={`result-banner ${passed ? 'is-pass' : 'is-fail'}`} role="status">
      <div>
        <p className="result-banner__title">{title}</p>
        <p className="result-banner__detail">{detail}</p>
      </div>
      <div className="button-row">{children}</div>
    </div>
  );
}
