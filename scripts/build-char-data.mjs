// Copies stroke data for every character in public/vocab/*.json from
// hanzi-writer-data into public/char-data/ (plus its license) so the app
// works offline. Runs automatically before `npm run dev` and `npm run build`.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const charDataDir = dirname(require.resolve('hanzi-writer-data/package.json'));
const vocabDir = join(root, 'public/vocab');
const outDir = join(root, 'public/char-data');

const words = readdirSync(vocabDir)
  .filter((f) => /^hsk\d+\.json$/.test(f))
  .flatMap((f) => JSON.parse(readFileSync(join(vocabDir, f), 'utf8')));
const chars = new Set(words.flatMap((w) => [...w.hanzi]));

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

// The Arphic Public License requires the license text to travel with the data.
copyFileSync(join(charDataDir, 'ARPHICPL.TXT'), join(outDir, 'ARPHICPL.TXT'));

if (missing.length) {
  console.error(`Missing stroke data for: ${missing.join(' ')}`);
  process.exit(1);
}
console.log(`Copied stroke data for ${chars.size} characters to public/char-data/`);
