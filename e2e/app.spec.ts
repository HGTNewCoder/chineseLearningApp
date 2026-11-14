import { expect, test, type Page } from '@playwright/test';

/** The active drawing canvas, once its stroke data has loaded. */
async function drawingCanvas(page: Page) {
  const canvas = page.locator('.char-canvas.is-interactive');
  await expect(canvas.locator('.char-canvas__target svg path').first()).toBeAttached();
  return canvas;
}

/** Drags across the canvas like a mouse stroke; fractions are of the canvas size. */
async function stroke(page: Page, from: [number, number], to: [number, number]) {
  const box = (await (await drawingCanvas(page)).boundingBox())!;
  const at = ([fx, fy]: [number, number]) => [box.x + box.width * fx, box.y + box.height * fy] as const;
  await page.mouse.move(...at(from));
  await page.mouse.down();
  await page.mouse.move(...at(to), { steps: 20 });
  await page.mouse.up();
}

/** 一 is a single left-to-right horizontal stroke through the middle. */
const writeYi = (page: Page) => stroke(page, [0.12, 0.5], [0.88, 0.49]);

async function openYiFromMemory(page: Page) {
  await page.goto('/lessons/hsk1-2');
  await page.getByRole('button', { name: '一', exact: true }).click();
  await page.getByRole('button', { name: /From memory/ }).click();
  await expect(page.getByText('one; single')).toBeVisible();
}

test('learns a word in a lesson, then reviews it in practice', async ({ page }) => {
  await openYiFromMemory(page);
  await writeYi(page);
  await expect(page.getByRole('status')).toContainText('Perfect!');

  // The learned word is now due for review.
  await page.getByRole('link', { name: /Practice/ }).click();
  await expect(page.getByText('one; single')).toBeVisible();
  await writeYi(page);
  await expect(page.getByRole('status')).toContainText('Perfect!');

  // Progress survives a reload: one word learned, two activities today (learn + review).
  await page.goto('/');
  await expect(page.locator('.donut__center')).toHaveText(/^1\s*words learned$/);
  await expect(page.getByText(/Today: 2 \/ 10 words/)).toBeVisible();
  await expect(page.getByText('🔥 1-day streak')).toBeVisible();
});

test('counts a wrong stroke as a mistake', async ({ page }) => {
  await openYiFromMemory(page);
  await stroke(page, [0.5, 0.12], [0.5, 0.88]); // vertical: wrong
  await writeYi(page);
  await expect(page.getByRole('status')).toContainText('Correct!');
  await expect(page.getByRole('status')).toContainText('1 mistake');
});

test('writes with Apple Pencil while a palm rests on the screen', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'needs a touch screen');
  const cdp = await page.context().newCDPSession(page);
  const pen = (type: 'mousePressed' | 'mouseMoved' | 'mouseReleased', x: number, y: number) =>
    cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1, pointerType: 'pen' });
  const palm = (type: 'touchStart' | 'touchEnd', x = 0, y = 0) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 9 }] });

  /** A Pencil stroke across 一; `during` runs between samples (e.g. to put a palm down). */
  const penStroke = async (during?: (i: number, box: { x: number; y: number; width: number; height: number }) => unknown) => {
    const box = (await (await drawingCanvas(page)).boundingBox())!;
    const y = box.y + box.height * 0.5;
    const x0 = box.x + box.width * 0.12;
    const x1 = box.x + box.width * 0.88;
    await pen('mousePressed', x0, y);
    for (let i = 1; i <= 20; i++) {
      await during?.(i, box);
      await pen('mouseMoved', x0 + ((x1 - x0) * i) / 20, y);
    }
    await pen('mouseReleased', x1, y);
  };

  await openYiFromMemory(page);

  // The palm lands below the box mid-stroke and lifts again before the Pencil does.
  await penStroke(async (i, box) => {
    if (i === 2) await palm('touchStart', box.x + box.width * 0.5, box.y + box.height + 40);
    if (i === 12) await palm('touchEnd');
  });
  await expect(page.getByRole('status')).toContainText('Perfect!');

  // Having used a Pencil, the box now ignores touches: a palm resting on it first changes nothing.
  await page.getByRole('button', { name: 'Try again' }).click();
  const box = (await (await drawingCanvas(page)).boundingBox())!;
  await palm('touchStart', box.x + box.width * 0.8, box.y + box.height * 0.85);
  await penStroke();
  await palm('touchEnd');
  await expect(page.getByRole('status')).toContainText('Perfect!');

  await page.goto('/settings');
  await expect(page.getByRole('checkbox', { name: 'Write with Apple Pencil only' })).toBeChecked();
});

test('walks through a word stroke by stroke', async ({ page }) => {
  await page.goto('/lessons/hsk1-2');
  await page.getByRole('button', { name: '我们', exact: true }).click();
  await page.getByRole('button', { name: /^2\s*Stroke by stroke$/ }).click();
  await expect(page.getByText('Character 1 of 2 · Stroke 1 of 7')).toBeVisible();
  await page.getByRole('button', { name: 'Next stroke →' }).click();
  await expect(page.getByText('Character 1 of 2 · Stroke 2 of 7')).toBeVisible();
  await page.getByRole('tab', { name: '们' }).click();
  await expect(page.getByText('Character 2 of 2 · Stroke 1 of 5')).toBeVisible();
});

test('browses higher HSK levels', async ({ page }) => {
  await page.goto('/lessons');
  await page.getByRole('tab', { name: /HSK 6/ }).click();
  await expect(page).toHaveURL(/hsk=6/);
  await page.getByRole('link', { name: /Lesson 1\b/ }).first().click();
  await expect(page.getByRole('heading', { name: 'HSK 6 · Lesson 1' })).toBeVisible();
  await expect(page.locator('.prompt-card__pinyin')).not.toBeEmpty();
});

test('works offline after the first visit', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // now controlled by the service worker, which caches the app
  await expect(page.getByRole('heading', { name: /Learn to write Chinese/ })).toBeVisible();

  await context.setOffline(true);
  await page.goto('/lessons');
  await expect(page.getByRole('heading', { name: 'Lessons' })).toBeVisible();
});

test('explains that sync is off when no backend is configured', async ({ page }) => {
  await page.goto('/account');
  await expect(page.getByText(/Accounts aren’t set up/)).toBeVisible();
  await page.getByRole('link', { name: 'About & credits' }).click();
  await expect(page.getByRole('link', { name: 'Arphic Public License' })).toHaveAttribute('href', '/char-data/ARPHICPL.TXT');
});

test('flips through a deck with flashcards', async ({ page }) => {
  await page.goto('/flashcards');
  await expect(page.getByText('No decks yet.')).toBeVisible();
  await page.getByRole('link', { name: '+ New deck' }).click();
  await page.getByLabel('Deck name').fill('Lesson 2');
  await page.getByRole('combobox', { name: 'HSK level' }).selectOption('1');
  await page.getByRole('combobox', { name: 'Lesson' }).selectOption('hsk1-2');
  await page.getByRole('button', { name: 'Select all 10' }).click();
  await page.getByRole('button', { name: 'Save deck' }).click();

  await page.getByRole('checkbox', { name: 'Shuffle cards' }).uncheck();
  await page.getByRole('radio', { name: 'Meaning → characters' }).click();
  await page.getByRole('button', { name: 'Start · 10 cards' }).click();

  const card = page.locator('.flashcard');
  const back = card.locator('.flashcard__face--back');
  await expect(back).toBeEmpty(); // the answer isn't in the page until flipped
  await page.keyboard.press('Space');
  await expect(card).toHaveClass(/is-flipped/);
  await expect(back.locator('.flashcard__hanzi')).not.toBeEmpty();

  // Miss the first card once, then know every card.
  await page.getByRole('button', { name: '✗ Again' }).click();
  await expect(page.getByText('0 / 10 known')).toBeVisible();
  for (let i = 0; i < 10; i++) {
    await card.click();
    await page.keyboard.press('ArrowRight');
  }
  await expect(page.getByRole('heading', { name: 'Deck complete' })).toBeVisible();
  await expect(page.getByText('9 of 10 known on the first try')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review 1 missed' })).toBeVisible();
});

test('builds a custom deck from picked words and studies it', async ({ page }) => {
  await page.goto('/flashcards');
  await page.getByRole('link', { name: '+ New deck' }).click();
  await page.getByLabel('Deck name').fill('Food');

  await page.getByRole('searchbox', { name: 'Search words' }).fill('chi');
  await page.getByRole('checkbox', { name: /^吃\s*chī/ }).check();
  await page.getByRole('searchbox', { name: 'Search words' }).fill('mi fan');
  await page.getByRole('checkbox', { name: /^米饭/ }).check();
  await expect(page.getByText('2 words selected')).toBeVisible();

  await page.getByRole('button', { name: 'Save deck' }).click();
  await expect(page).toHaveURL(/\/flashcards\?deck=/);
  await expect(page.getByRole('radio', { name: /Food/ })).toBeChecked();
  await page.getByRole('button', { name: 'Start · 2 cards' }).click();
  await expect(page.getByRole('heading', { name: 'Food' })).toBeVisible();

  // The deck survives a reload and can be edited.
  await page.goto('/flashcards');
  await page.getByRole('link', { name: 'Edit Food' }).click();
  await page.getByRole('button', { name: 'Remove 米饭' }).click();
  await page.getByRole('button', { name: 'Save deck' }).click();
  await expect(page.getByText('(1 word)')).toBeVisible();
});
