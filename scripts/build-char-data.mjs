// Copies stroke data for every character in src/data/vocab.json from
// hanzi-writer-data into public/char-data/ so the app works offline.
// Runs automatically before `npm run dev` and `npm run build`.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const charDataDir = dirname(require.resolve('hanzi-writer-data/package.json'));
const outDir = join(root, 'public/char-data');

const vocab = JSON.parse(readFileSync(join(root, 'src/data/vocab.json'), 'utf8'));
const chars = new Set(vocab.flatMap((w) => [...w.hanzi]));

mkdirSync(outDir, { recursive: true });
const missing = [];
for (const char of chars) {
  const src = join(charDataDir, `${char}.json`);
  if (!existsSync(src)) {
    missing.push(char);
    continue;
  }
  copyFileSync(src, join(outDir, `${char}.json`));
}

if (missing.length) {
  console.error(`Missing stroke data for: ${missing.join(' ')}`);
  process.exit(1);
}
console.log(`Copied stroke data for ${chars.size} characters to public/char-data/`);
