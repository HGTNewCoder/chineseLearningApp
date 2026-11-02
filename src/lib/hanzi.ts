import type { CharacterJson } from 'hanzi-writer';

const cache = new Map<string, Promise<CharacterJson>>();

/** Loads stroke data bundled into public/char-data/ by scripts/build-char-data.mjs. */
export function loadCharData(char: string): Promise<CharacterJson> {
  let pending = cache.get(char);
  if (!pending) {
    pending = fetch(`${import.meta.env.BASE_URL}char-data/${encodeURIComponent(char)}.json`).then((res) => {
      if (!res.ok) throw new Error(`No stroke data for "${char}"`);
      return res.json() as Promise<CharacterJson>;
    });
    pending.catch(() => cache.delete(char));
    cache.set(char, pending);
  }
  return pending;
}

/** `charDataLoader` option for HanziWriter. */
export const charDataLoader = (char: string) => loadCharData(char);

export interface Transform {
  x: number;
  y: number;
  scale: number;
  transform: string;
}

/** Converts a point in character data coordinates to SVG pixel coordinates. */
export function toScreen(t: Transform, size: number, [x, y]: number[]): [number, number] {
  return [t.x + x * t.scale, size - t.y - y * t.scale];
}

export function medianToPath(median: number[][]): string {
  return median.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ');
}

export function medianLength(median: number[][]): number {
  let length = 0;
  for (let i = 1; i < median.length; i++) {
    length += Math.hypot(median[i][0] - median[i - 1][0], median[i][1] - median[i - 1][1]);
  }
  return length;
}
