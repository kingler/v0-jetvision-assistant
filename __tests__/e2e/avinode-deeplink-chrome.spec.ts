import { test, expect, chromium, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Avinode Deeplink Flow E2E Test - Using Default Chrome
 *
 * This test connects to the default Chrome browser to use your existing session.
 * Make sure Chrome is running and you're logged in to Jetvision.
 *
 * Run with: npx playwright test avinode-deeplink-chrome.spec.ts
 */

const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots', 'avinode-flow');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function captureScreenshot(page: Page, name: string): Promise<string> {
  const filename = `${name}-${Date.now()}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`Screenshot captured: ${filename}`);
  return filename;
}

// Skip the default Playwright browser - we'll launch our own
test.skip(({ browserName }) => browserName !== 'chromium', 'Chrome only');

test.describe('Avinode Deeplink Flow - Default Chrome', () => {
  test.setTimeout(180000);

  test('Flight request with authenticated session', async () => {
    console.log('\n=== Avinode Deeplink Flow Test ===\n');

    // Launch Chrome with a user data directory to use default profile
    const userDataDir =
      process.platform === 'darwin'
        ? path.join(process.env.HOME || '', 'Library/Application Support/Google/Chrome')
        : process.platform === 'win32'
          ? path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/User Data')
          : path.join(process.env.HOME || '', '.config/google-chrome');

    console.log(`Using Chrome profile from: ${userDataDir}`);

    // Launch Chromium (Playwright's Chrome)
    const browser = await chromium.launch({
      headless: false,
      channel: 'chrome', // Use installed Chrome
      args: ['--start-maximized'],
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();

    try {
      console.log('Step 1: Navigate to Jetvision');
      await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      const currentUrl = page.url();
      console.log(`Current URL: ${currentUrl}`);
      await captureScreenshot(page, 'chrome-01-initial');

      // Check if we hit sign-in
      if (currentUrl.includes('sign-in')) {
        console.log('\n⚠️  Not authenticated - you need to log in');
        console.log('The browser window will stay open for 60 seconds');
        console.log('Please log in manually, then the test will continue...\n');

        // Wait for user to potentially log in
        await page.waitForTimeout(60000);

        // Check again
        if (page.url().includes('sign-in')) {
          console.log('Still on sign-in page - test cannot proceed');
          await captureScreenshot(page, 'chrome-auth-required');
          return;
        }
      }

      console.log('\nStep 2: Find chat input');
      await captureScreenshot(page, 'chrome-02-authenticated');

      // Look for chat input
      const chatInput = page.locator('textarea, input[type="text"]').first();

      if (await chatInput.isVisible({ timeout: 10000 })) {
        console.log('Chat input found');

        // Enter flight request
        const flightRequest =
          'I need a private jet from Teterboro (KTEB) to Miami (KMIA) for 6 passengers on January 20th, 2025';
        await chatInput.fill(flightRequest);
        await captureScreenshot(page, 'chrome-03-request-typed');

        // Submit
        console.log('\nStep 3: Submit flight request');
        await chatInput.press('Enter');
        await page.waitForTimeout(2000);
        await captureScreenshot(page, 'chrome-04-submitted');

        // Wait for response
        console.log('\nStep 4: Wait for Avinode response');
        await page.waitForTimeout(10000);
        await captureScreenshot(page, 'chrome-05-response');

        // Check for Avinode elements
        console.log('\nStep 5: Check for Avinode deeplink');

        const avinodeLink = page.locator('a[href*="avinode"], a:has-text("View in Avinode")');
        const webhookStatus = page.locator('[data-testid="webhook-status"]');
        const tripId = page.locator('[data-testid="trip-id"]');

        const hasAvinodeLink = await avinodeLink.first().isVisible({ timeout: 5000 }).catch(() => false);
        const hasWebhookStatus = await webhookStatus.first().isVisible({ timeout: 2000 }).catch(() => false);
        const hasTripId = await tripId.first().isVisible({ timeout: 2000 }).catch(() => false);

        console.log('\n=== Results ===');
        console.log(`Avinode Link: ${hasAvinodeLink ? '✅ FOUND' : '❌ NOT FOUND'}`);
        console.log(`Webhook Status: ${hasWebhookStatus ? '✅ FOUND' : '❌ NOT FOUND'}`);
        console.log(`Trip ID: ${hasTripId ? '✅ FOUND' : '❌ NOT FOUND'}`);

        if (hasAvinodeLink) {
          const href = await avinodeLink.first().getAttribute('href');
          console.log(`\n🔗 Deeplink URL: ${href}`);
        }

        await captureScreenshot(page, 'chrome-06-final');

        // Check page content
        const content = await page.content();
        const hasAvinodeRef = content.toLowerCase().includes('avinode');
        const hasDeeplinkRef =
          content.includes('deep_link') || content.includes('deepLink') || content.includes('deeplink');

        console.log(`\nPage contains 'avinode': ${hasAvinodeRef}`);
        console.log(`Page contains deeplink reference: ${hasDeeplinkRef}`);
      } else {
        console.log('Chat input not visible');
        await captureScreenshot(page, 'chrome-no-input');
      }

      // Keep browser open briefly to see results
      console.log('\nTest complete - browser will close in 10 seconds');
      await page.waitForTimeout(10000);
    } finally {
      await browser.close();
    }
  });
});
