// Generates the app icons from the stroke data of 字, so they don't depend on
// installed fonts. Run once (output is committed): npm run icons
// Renders PNGs with Playwright using the locally installed Chrome.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { strokes } = JSON.parse(readFileSync(require.resolve('hanzi-writer-data/字.json'), 'utf8'));

const RED = '#c8323a';

/** Character data spans x 0–1024 and y -124–900 with y pointing up. */
function iconSvg(size, { padding, radius }) {
  const scale = (size - 2 * padding) / 1024;
  const transform = `translate(${padding} ${size - padding - 124 * scale}) scale(${scale} ${-scale})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<rect width="${size}" height="${size}" rx="${radius}" fill="${RED}"/>
<g transform="${transform}" fill="#fff">${strokes.map((d) => `<path d="${d}"/>`).join('')}</g>
</svg>
`;
}

const icons = [
  { file: 'icon-192.png', size: 192, padding: 28, radius: 40 },
  { file: 'icon-512.png', size: 512, padding: 72, radius: 108 },
  // Maskable icons are cropped to a circle by some launchers: full bleed, wide safe zone.
  { file: 'icon-maskable-512.png', size: 512, padding: 120, radius: 0 },
  { file: 'apple-touch-icon.png', size: 180, padding: 26, radius: 0 },
];

writeFileSync(join(root, 'public/icon.svg'), iconSvg(64, { padding: 6, radius: 14 }));

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
for (const { file, size, ...opts } of icons) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0;background:transparent">${iconSvg(size, opts)}</body>`);
  await page.locator('svg').screenshot({ path: join(root, 'public', file), omitBackground: true });
  console.log(`Wrote public/${file}`);
}
await browser.close();
