import { useSyncExternalStore } from 'react';

/**
 * "Pencil only" mode: the writing box ignores fingers and resting palms and only
 * accepts a stylus (Apple Pencil) or mouse. It's a per-device preference, so it
 * lives in its own key and is never synced to other devices.
 *
 * Until the user picks a value, it turns on by itself the first time a stylus
 * touches the writing box.
 */
const KEY = 'hanzi-trainer:pen-only';

function read(): boolean | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw === null ? null : raw === '1';
  } catch {
    return null;
  }
}

let value: boolean | null = read();
const listeners = new Set<() => void>();

export const isPenOnly = (): boolean => value === true;

export function setPenOnly(next: boolean): void {
  value = next;
  try {
    localStorage.setItem(KEY, next ? '1' : '0');
  } catch {
    // Storage blocked: keep the choice for this visit only.
  }
  listeners.forEach((listener) => listener());
}

/** Call when a stylus is used; turns Pencil-only on unless the user chose otherwise. */
export function notePenUsed(): void {
  if (value === null) setPenOnly(true);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePenOnly(): boolean {
  return useSyncExternalStore(subscribe, isPenOnly, () => false);
}

/** For tests: forget the stored choice. */
export function resetPenOnlyForTests(): void {
  value = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
