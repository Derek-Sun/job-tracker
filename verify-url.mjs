import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

// Collect console errors
page.on('console', msg => { if (msg.type() === 'error') console.log('BROWSER ERR:', msg.text()); });

await page.goto('http://localhost:3000/jobs/new');
await page.waitForLoadState('networkidle');
await page.screenshot({ path: '/tmp/u1-loaded.png' });
console.log('Step 1: page loaded');

// Enter URL and click fetch
await page.fill('input[placeholder*="jobs.company.com"]', 'https://boards.greenhouse.io/anthropic/jobs/4020305008');
await page.click('button:has-text("Fetch & Parse")');
console.log('Step 2: fetch clicked');

// Wait for button to stop showing "Fetching" (loading complete)
await page.waitForFunction(
  () => !document.querySelector('button[disabled]'),
  { timeout: 20000 }
);
await page.waitForTimeout(300);
await page.screenshot({ path: '/tmp/u2-after-fetch.png' });

const errorMsg = await page.locator('[class*="text-red-600"]').textContent().catch(() => null);
const greenMsg = await page.locator('text=Fields auto-filled').isVisible().catch(() => false);
const parserOpen = await page.locator('input[placeholder*="jobs.company.com"]').isVisible().catch(() => false);
console.log('Step 3 - state:', { errorMsg, greenMsg, parserOpen });

// If success: check form fields
if (greenMsg || !parserOpen) {
  const titleVal = await page.inputValue('input[placeholder="Software Engineer"]').catch(() => '');
  const companyVal = await page.inputValue('input[placeholder="Acme Corp"]').catch(() => '');
  console.log('Step 4 - parsed fields:', { titleVal, companyVal });
}

// Switch to Paste text tab and verify textarea appears
if (parserOpen || errorMsg) {
  await page.locator('button:has-text("Paste text")').click();
} else {
  await page.locator('button', { hasText: 'Auto-fill' }).click().catch(() => {});
  await page.waitForTimeout(200);
  await page.locator('button:has-text("Paste text")').click();
}
await page.waitForTimeout(200);
const textareaVisible = await page.locator('textarea').isVisible();
console.log('Step 5 - Paste text tab shows textarea:', textareaVisible);
await page.screenshot({ path: '/tmp/u3-text-tab.png' });

await browser.close();
console.log('DONE');
