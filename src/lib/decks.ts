import type { Word } from './types';

/** A word list the user put together for flashcards. */
export interface CustomDeck {
  name: string;
  wordIds: string[];
  createdAt: number;
  /** Last change (ms); the newest copy wins when syncing. */
  updatedAt: number;
  /** Deleted decks are kept as markers so the deletion reaches other devices. */
  deleted?: boolean;
}

export function newDeckId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Decks that haven't been deleted, oldest first. */
export function liveDecks(decks: Record<string, CustomDeck>): [string, CustomDeck][] {
  return Object.entries(decks)
    .filter(([, d]) => !d.deleted)
    .sort(([, a], [, b]) => a.createdAt - b.createdAt);
}

/** Lowercase, without tone marks, spaces, apostrophes or tone numbers ("Nǐ hǎo", "ni3 hao3" → "nihao"). */
export function normalizePinyin(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/v/g, 'u')
    .replace(/[\s'’·0-9-]/g, '');
}

/**
 * Words matching `query` by characters, pinyin (tones optional) or English words,
 * best matches first: exact, then starts-with, then contains.
 */
export function searchWords(words: Word[], query: string): Word[] {
  const q = query.trim().toLowerCase();
  if (!q) return words;
  const qPinyin = normalizePinyin(q);
  // English matches must start at a word, so "eat" finds "to eat" but not "great".
  const qEnglish = new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  const scored: { word: Word; score: number }[] = [];
  for (const word of words) {
    const pinyin = normalizePinyin(word.pinyin);
    const english = word.english.toLowerCase();
    const senses = english.split(/[;,]\s*/).map((s) => s.replace(/^to /, ''));
    let score = Infinity;
    if (word.hanzi === q || (qPinyin && pinyin === qPinyin) || senses.includes(q.replace(/^to /, ''))) score = 0;
    else if (word.hanzi.startsWith(q) || (qPinyin && pinyin.startsWith(qPinyin))) score = 1;
    else if (word.hanzi.includes(q) || qEnglish.test(english) || (qPinyin && pinyin.includes(qPinyin))) score = 2;
    if (score < Infinity) scored.push({ word, score });
  }
  // Array sort is stable, so words keep their HSK order within each tier.
  return scored.sort((a, b) => a.score - b.score).map((s) => s.word);
}
