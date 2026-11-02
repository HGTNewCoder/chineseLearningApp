// Generates the vocabulary from HSK 2.0 levels 1–6 (run once; output is committed):
//   src/data/lessons.json     lesson index (ids, titles, word ids), bundled with the app
//   public/vocab/hsk<N>.json  full word details per level, fetched on demand
// Source: https://github.com/drkameleon/complete-hsk-vocabulary (MIT; meanings from CC-CEDICT, CC BY-SA 4.0).
// Usage: npm run vocab
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const charDataDir = dirname(require.resolve('hanzi-writer-data/package.json'));
const SOURCE = 'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/wordlists/exclusive/old';
const LEVELS = [1, 2, 3, 4, 5, 6];
const LESSON_SIZE = 10;

const UNUSABLE = /^(surname|(old )?variant of|see |used in|also pr\.|\(old\)|\((slang|Tw|dialect|literary|onom\.|coll\.|military)\))|\(archaic\)|\bsurname\b/i;

// Hand-picked prompts where the source's first sense isn't the HSK meaning.
const OVERRIDES = {
  看: { pinyin: 'kàn', english: 'to see; to look at' },
  听: { pinyin: 'tīng', english: 'to listen; to hear' },
  几: { pinyin: 'jǐ', english: 'how many; a few' },
  回: { pinyin: 'huí', english: 'to return; to go back' },
  本: { pinyin: 'běn', english: '(measure word for books)' },
  太: { pinyin: 'tài', english: 'too (much); very' },
  在: { pinyin: 'zài', english: 'at; in; (located) at' },
  和: { pinyin: 'hé', english: 'and; with' },
  个: { pinyin: 'gè', english: '(general measure word)' },
  家: { pinyin: 'jiā', english: 'home; family' },
  里: { pinyin: 'lǐ', english: 'inside; in' },
  上: { pinyin: 'shàng', english: 'on top; up; above' },
  的: { english: "of; 's (possessive particle)" },
  了: { english: '(completed action marker)' },
  是: { english: 'to be; yes; correct' },
  你: { english: 'you' },
  他: { english: 'he; him' },
  这: { english: 'this; these' },
  那: { english: 'that; those' },
  来: { english: 'to come' },
  没: { pinyin: 'méi', english: "not; haven't" },
  年: { english: 'year' },
  吗: { pinyin: 'ma', english: '(yes/no question particle)' },
  呢: { english: '(particle: "what about...?")' },
  着: { pinyin: 'zhe', english: '(particle: ongoing action, -ing)' },
  吧: { pinyin: 'ba', english: `(particle: suggestion, "let's...")` },
  得: { pinyin: 'de', english: '(particle linking verb and complement)' },
  为: { pinyin: 'wèi', english: 'for; because of' },
  长: { pinyin: 'cháng', english: 'long' },
  别: { english: "don't; other" },
  次: { english: '(measure word: times)' },
  张: { english: '(measure word for flat things); sheet' },
  也: { english: 'also; too' },
  就: { english: 'then; just; at once' },
  些: { english: 'some; a few' },
  二: { english: 'two; 2' },
  号: { english: 'number; day of the month' },
  妻子: { pinyin: 'qī zi', english: 'wife' },
  一起: { english: 'together' },
  大家: { english: 'everyone' },
};

// Choose the reading with the most usable senses (the main one in practice),
// then keep its first few senses so the prompt stays short.
function pickForm(forms) {
  let best = null;
  for (const form of forms) {
    const senses = form.meanings.flatMap((m) => m.split('; ')).filter((m) => !UNUSABLE.test(m));
    if (!best || senses.length > best.senses.length) best = { form, senses };
  }
  const senses = best.senses.length ? best.senses : best.form.meanings;
  return { pinyin: best.form.transcriptions.pinyin, english: senses.slice(0, 3).join('; ') };
}

const seen = new Set();
const skipped = [];
const lessons = [];
mkdirSync(join(root, 'public/vocab'), { recursive: true });

for (const level of LEVELS) {
  const res = await fetch(`${SOURCE}/${level}.json`);
  if (!res.ok) throw new Error(`Failed to fetch HSK ${level}: ${res.status}`);
  const entries = (await res.json()).sort((a, b) => (a.frequency ?? 1e9) - (b.frequency ?? 1e9));

  const words = [];
  for (const entry of entries) {
    const hanzi = entry.simplified.trim();
    if (seen.has(hanzi) || !/^\p{Script=Han}+$/u.test(hanzi)) continue;
    if (![...hanzi].every((c) => existsSync(join(charDataDir, `${c}.json`)))) {
      skipped.push(hanzi);
      continue;
    }
    seen.add(hanzi);
    words.push({ id: hanzi, hanzi, ...pickForm(entry.forms), ...OVERRIDES[hanzi], hsk: level });
  }

  for (let i = 0; i < words.length; i += LESSON_SIZE) {
    const number = i / LESSON_SIZE + 1;
    lessons.push({
      id: `hsk${level}-${number}`,
      title: `HSK ${level} · Lesson ${number}`,
      hsk: level,
      number,
      wordIds: words.slice(i, i + LESSON_SIZE).map((w) => w.id),
    });
  }
  writeFileSync(join(root, `public/vocab/hsk${level}.json`), JSON.stringify(words) + '\n');
  console.log(`HSK ${level}: ${words.length} words`);
}

writeFileSync(join(root, 'src/data/lessons.json'), JSON.stringify(lessons) + '\n');
console.log(`Wrote ${lessons.length} lessons (${seen.size} words)`);
if (skipped.length) console.log(`Skipped (no stroke data): ${skipped.join(' ')}`);
