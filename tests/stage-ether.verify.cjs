const { chromium } = require('playwright');

const SITE = 'http://127.0.0.1:3012/';
const CHROME = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';

(async () => {
  console.log('Starting Bitty Stage & Ether Transition verification...');
  const browser = await chromium.launch({ headless: true, executablePath: CHROME });
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  try {
    await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Close any tour modal if present
    const tourClose = page.locator('.shepherd-cancel-icon');
    if (await tourClose.count()) {
      await tourClose.first().click({ force: true });
    }

    // 1. Verify Bitty Stage container and Editor are the default home state
    const stage = page.locator('.bitty-stage');
    await stage.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✔ Bitty Stage is visible as default home container');

    // Confirm no carousel wizard buttons (Next slide / Prev slide)
    const nextSlideButton = page.locator('button[aria-label="Next slide"]');
    const hasNextSlide = await nextSlideButton.count();
    console.log(`✔ Carousel wizard buttons absent: ${hasNextSlide === 0}`);

    // Verify Composer textarea is present in the stage
    const textarea = stage.locator('textarea');
    await textarea.waitFor({ state: 'visible', timeout: 5000 });
    await textarea.fill('<h1>Hello from Bitty Stage</h1>\n<p>Single stage authoring works!</p>');
    console.log('✔ Box composer textarea populated');

    // 2. Test Password Lock transition
    const passwordButton = page.getByRole('button', { name: /Add PIN|Password/i }).first();
    await passwordButton.click();

    // Verify Ether transition rendered Password Lock view in the same stage container
    const passwordHeader = stage.getByText('PASSWORD LOCK', { exact: true });
    await passwordHeader.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✔ Password Lock stage materialized inside Bitty Stage');

    // Test entering 8-digit PIN
    const pinInput = stage.locator('input[type="password"], input[type="text"]').first();
    await pinInput.fill('87654321');

    // Click Apply Lock
    const applyButton = stage.getByRole('button', { name: /Apply Lock/i });
    await applyButton.click();

    // Verify returned to editor
    await textarea.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✔ Returned to Stage Editor via Ether transition');

    // Verify Active Lock Chip for Password is now visible
    const passwordChip = stage.locator('button[aria-label*="Password lock"]');
    await passwordChip.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✔ Active Password Lock chip is visible and active on Editor stage');

    // 3. Test Time Lock transition
    const timerButton = page.getByRole('button', { name: /Add Timer|Timer/i }).first();
    await timerButton.click();

    const timeHeader = stage.getByText('TIME-BASED LOCK', { exact: true });
    await timeHeader.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✔ Time Lock stage materialized inside Bitty Stage');

    const applyTimeButton = stage.getByRole('button', { name: /Apply Lock/i });
    await applyTimeButton.click();

    await textarea.waitFor({ state: 'visible', timeout: 5000 });
    const timeChip = stage.locator('button[aria-label*="Time lock"]');
    await timeChip.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✔ Active Time Lock chip is visible on Editor stage');

    // 4. Test Access Limit Lock transition
    const limitButton = page.getByRole('button', { name: /Add Limit|Limit Active/i }).first();
    await limitButton.click();

    const accessHeader = stage.getByText('ACCESS LIMIT LOCK', { exact: true });
    await accessHeader.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✔ Access Limit Lock stage materialized inside Bitty Stage');

    const applyLimitButton = stage.getByRole('button', { name: /Apply Lock/i });
    await applyLimitButton.click();

    await textarea.waitFor({ state: 'visible', timeout: 5000 });
    const viewsChip = stage.locator('button[aria-label*="Views lock"], button[aria-label*="View lock"]');
    await viewsChip.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✔ Active View Limit Lock chip is visible on Editor stage');

    // 5. Test Live Preview inside Stage
    const previewButton = stage.getByRole('button', { name: /Preview/i }).first();
    await previewButton.click();

    const previewHeader = stage.getByText('LIVE PREVIEW', { exact: true });
    await previewHeader.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✔ Live Preview stage rendered inside Bitty Stage');

    const backButton = stage.getByRole('button', { name: /Back to Editor/i });
    await backButton.click();
    await textarea.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✔ Returned from Preview to Editor stage');

    console.log(`Page errors: ${pageErrors.length}`);
    if (pageErrors.length > 0) {
      console.error('Errors encountered:', pageErrors);
      process.exit(1);
    }

    console.log('🎉 ALL STAGE & ETHER TRANSITION CHECKS PASSED!');
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
