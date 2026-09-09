const { chromium } = require('playwright');

const SITE = process.env.BITTYBOX_TEST_URL || 'https://bittybox.org/';
const CHROME = process.env.PLAYWRIGHT_CHROME || '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME });
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  try {
    await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    const tourClose = page.locator('.shepherd-cancel-icon');
    if (await tourClose.count()) {
      await tourClose.first().click({ force: true });
    }
    await page.getByText('ENTER BITTY BOX', { exact: true }).first().click();
    await page.getByLabel('Next slide').waitFor({ state: 'visible', timeout: 10_000 });
    const editorTourClose = page.locator('.shepherd-cancel-icon');
    if (await editorTourClose.count()) {
      await editorTourClose.first().click({ force: true });
    }

    // Slide 02: password lock.
    await page.getByLabel('Next slide').click();
    await page.locator('#holo-toggle-slide-02').evaluate(el => el.click());
    await page.locator('input[inputmode="numeric"]').first().fill('12345678');

    // Slide 03: delayed time lock, reproducing the time-blocked state.
    await page.getByLabel('Next slide').click();
    await page.locator('#holo-toggle-slide-03').evaluate(el => el.click());
    await page.getByRole('button', { name: /Time Until Open/i }).click();

    // Slide 04: access-limit lock.
    await page.getByLabel('Next slide').click();
    await page.locator('#holo-toggle-slide-04').evaluate(el => el.click());

    // Slide 05 agentic (coming soon), then Slide 06 review.
    await page.getByLabel('Next slide').click();
    await page.getByLabel('Next slide').click();

    const popupPromise = page.waitForEvent('popup', { timeout: 20_000 });
    await page.getByText('GENERATE BOX', { exact: true }).click();
    const viewer = await popupPromise;
    await viewer.waitForLoadState('domcontentloaded', { timeout: 45_000 });
    await viewer.waitForTimeout(2_000);

    const url = viewer.url();
    const bodyText = await viewer.locator('body').innerText();
    const result = {
      encodedPassword: url.includes('cipher='),
      encodedTimeLock: url.includes('/tw/'),
      encodedAccessLimit: url.includes('/ol/'),
      showsTimeLock: bodyText.includes('TIME-LOCKED BITTY BOX') || bodyText.includes('TIME-LIMITED ACCESS'),
      showsPasswordLock: bodyText.includes('NUMERICAL PASSCODE'),
      showsAccessLimit: bodyText.includes('ACCESS QUOTA LIMITED'),
      pageErrors,
    };

    console.log(JSON.stringify(result, null, 2));
    assert(result.encodedPassword && result.encodedTimeLock && result.encodedAccessLimit,
      'Generated URL must encode every configured lock', result);
    assert(result.showsTimeLock && result.showsPasswordLock && result.showsAccessLimit,
      'Viewer must visibly present every configured lock, even while the time lock is pending', result);
    assert(pageErrors.length === 0, 'Creator emitted browser errors', result);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error.message);
  if (error.details) console.error(JSON.stringify(error.details, null, 2));
  process.exit(1);
});
