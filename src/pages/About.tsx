export function AboutPage() {
  const base = import.meta.env.BASE_URL;
  return (
    <section className="page about">
      <h1>About</h1>
      <p>
        Hanzi Trainer helps you memorize how to write Chinese characters. Each word is taught stroke by stroke, then
        practiced from memory on a spaced-repetition schedule: words you miss come back sooner, words you know come
        back less often.
      </p>

      <h2>Credits</h2>
      <ul>
        <li>
          Stroke checking and animation: <a href="https://hanziwriter.org">Hanzi Writer</a> (MIT License).
        </li>
        <li>
          Stroke order data: <a href="https://github.com/chanind/hanzi-writer-data">hanzi-writer-data</a>, derived from{' '}
          <a href="https://github.com/skishore/makemeahanzi">Make Me a Hanzi</a> and the Arphic PL KaitiM GB and UKai
          fonts, under the <a href={`${base}char-data/ARPHICPL.TXT`}>Arphic Public License</a>.
        </li>
        <li>
          Vocabulary lists: <a href="https://github.com/drkameleon/complete-hsk-vocabulary">complete-hsk-vocabulary</a>{' '}
          (MIT License), using HSK 2.0 levels 1–6.
        </li>
        <li>
          English definitions: <a href="https://www.mdbg.net/chinese/dictionary?page=cc-cedict">CC-CEDICT</a>, licensed{' '}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. Definitions have been shortened
          and some were rewritten for use as prompts.
        </li>
      </ul>

      <h2>Privacy</h2>
      <p>
        Your progress is stored in your browser. If you sign in, it is also stored in your account so it can sync
        between devices. The account holds only your email address and learning progress. If anonymous page analytics or
        error reporting are switched on for this site, they don’t use cookies or collect your progress.
      </p>
    </section>
  );
}
