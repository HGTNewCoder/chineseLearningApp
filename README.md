# Hanzi Trainer

A web app for learning to write Chinese characters. It shows you the English meaning and pinyin, you draw the characters with your mouse (or finger), and it checks every stroke's shape, direction and order.

- **Lessons:** 30 lessons covering the HSK 1–2 vocabulary (297 words, 10 per lesson). Each word goes through four steps: watch the animation, step through it stroke by stroke, trace it, then write it from memory.
- **Practice:** spaced-repetition review (Leitner boxes, 0/1/3/7/14 days). A word passes when you make at most one mistake per character. Missed words come back at the end of the session.
- Progress is saved in your browser (localStorage). No account or server is needed.

## Run

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests
npm run build    # production build in dist/
```

`npm run dev` and `npm run build` first run `scripts/build-char-data.mjs`, which copies stroke data for the vocabulary into `public/char-data/`.

## Data

- Stroke checking and animation: [Hanzi Writer](https://hanziwriter.org) (MIT).
- Stroke data: [`hanzi-writer-data`](https://github.com/chanind/hanzi-writer-data), from Make Me a Hanzi (Arphic Public License).
- Vocabulary: HSK 2.0 levels 1–2 from [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) (MIT). Run `npm run vocab` to regenerate `src/data/vocab.json`. Hand-written English prompts for ambiguous words are in `OVERRIDES` in `scripts/build-vocab.mjs`.
