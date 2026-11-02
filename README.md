# Hanzi Trainer

A web app for learning to write Chinese characters. It shows you the English meaning and pinyin, you draw the characters with your mouse (or finger), and it checks every stroke's shape, direction and order.

- **Lessons:** 500 lessons covering HSK 1–6 (4,991 words, 10 per lesson). Each word goes through four steps: watch the animation, step through it stroke by stroke, trace it, then write it from memory.
- **Practice:** spaced-repetition review (Leitner boxes, 0/1/3/7/14 days). A word passes with at most one mistake per character, and missed words come back at the end of the session.
- **Daily goal and streaks:** track words per day and consecutive days practiced.
- **Accounts and sync (optional):** sign in by email link to back up progress and use it on any device. Progress is local-first, so the app works fully without an account and offline.
- **Installable and offline:** a Progressive Web App that works offline after the first visit.

## Develop

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (Vitest)
npm run e2e        # production build + browser tests (Playwright, uses your installed Chrome)
npm run build      # production build in dist/
```

`npm run dev` and `npm run build` first run `scripts/build-char-data.mjs`, which copies stroke data for the vocabulary into `public/char-data/`.

## Deploy

The app is a static site, so any static host works and it scales with the host's CDN.

1. Push this repository to GitHub.
2. Import it in **Vercel** (recommended; `vercel.json` is included) or **Netlify** (`public/_redirects` and `public/_headers` are included). Use build command `npm run build` and output directory `dist`. **Cloudflare Pages** also works with the same settings.
3. Optional: add the environment variables below in the host's dashboard, then redeploy.

CI (`.github/workflows/ci.yml`) runs type-checking, unit tests, the build and the browser tests on every push and pull request.

### Environment variables

All are optional; see `.env.example`. Without them the app runs local-only with no tracking.

| Variable | Enables |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Accounts and cloud sync |
| `VITE_SENTRY_DSN` | Error reporting |
| `VITE_PLAUSIBLE_DOMAIN` | Cookie-free page analytics |

### Setting up accounts and sync (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run `supabase/migrations/20261101000000_progress.sql`. It creates the tables and row-level security so each user can only access their own progress.
3. In **Authentication → URL Configuration**, set **Site URL** to your deployed URL and add `https://<your-domain>/account` (and `http://localhost:5173/account` for local testing) to **Redirect URLs**.
4. Email sign-in links are on by default. Supabase's built-in email sender has a low hourly limit, so for real traffic connect your own SMTP provider under **Authentication → Emails**.
5. Copy **Project URL** and the **anon public key** (Project Settings → API) into `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

The anon key is designed to be public; row-level security is what protects the data. Never put the `service_role` key in the app.

## How sync works

Progress always saves to the browser first. When signed in, the app merges with the cloud copy on sign-in, when the tab regains focus and when the connection returns, and uploads changes about a second after they happen (`src/sync/`):

- each word keeps its most recent review, and a word learned fresh never overwrites review history from another device
- lesson progress is combined from all devices
- the latest settings win
- resetting progress erases it on every device

Signing out clears the device's copy. A different account signing in on the same browser never inherits the previous user's progress.

## Data and licenses

- Stroke checking and animation: [Hanzi Writer](https://hanziwriter.org) (MIT).
- Stroke data: [`hanzi-writer-data`](https://github.com/chanind/hanzi-writer-data), from Make Me a Hanzi, under the Arphic Public License (its text is shipped at `/char-data/ARPHICPL.TXT`).
- Vocabulary: HSK 2.0 levels 1–6 from [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) (MIT), with English definitions from CC-CEDICT (CC BY-SA 4.0). `npm run vocab` regenerates `src/data/lessons.json` and `public/vocab/`. Hand-written prompts for ambiguous words are in `OVERRIDES` in `scripts/build-vocab.mjs`.
- App icons are drawn from the stroke data of 字 (`npm run icons`).

Credits are shown in the app on the About page.
