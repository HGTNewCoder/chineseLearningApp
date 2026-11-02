import type { Word } from '../lib/types';

interface Props {
  word: Word;
  /** Show the characters too (after answering, or while learning). */
  showHanzi?: boolean;
}

export function PromptCard({ word, showHanzi = false }: Props) {
  return (
    <div className="prompt-card">
      <p className="prompt-card__english">{word.english}</p>
      <p className="prompt-card__pinyin" lang="zh-Latn-pinyin">
        {word.pinyin}
      </p>
      {showHanzi && (
        <p className="prompt-card__hanzi" lang="zh-Hans">
          {word.hanzi}
        </p>
      )}
    </div>
  );
}
