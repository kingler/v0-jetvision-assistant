/**
 * Capture the final response with deep link after workflow completes
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

// Create screenshots directory
try {
  mkdirSync('screenshots', { recursive: true });
} catch (e) {}

async function captureResponse() {
  console.log('\n=== Capturing Final Response ===\n');

  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const page = contexts[0].pages().find(p => p.url().includes('localhost:3000')) || contexts[0].pages()[0];

  console.log('Connected to page:', page.url());

  // Wait for the response to fully complete - look for deep link or completion
  let attempts = 0;
  const maxAttempts = 120; // 2 minutes max

  while (attempts < maxAttempts) {
    attempts++;

    const pageText = await page.textContent('body') || '';

    // Check for deep link indicators
    const hasDeepLink = pageText.includes('marketplace.avinode.com') ||
                        pageText.includes('Open in Avinode') ||
                        pageText.includes('atrip-');

    // Check for workflow completion
    const hasCompleted = pageText.includes('Step 3: Awaiting Selection') &&
                         !pageText.includes('Creating Trip');

    if (hasDeepLink) {
      console.log('✅ Deep link found!');
      break;
    }

    if (hasCompleted) {
      console.log('✅ Workflow reached awaiting selection stage');
      break;
    }

    // Check if still processing
    const isProcessing = pageText.includes('Creating Trip') ||
                         pageText.includes('Searching');

    if (!isProcessing && attempts > 30) {
      console.log('Processing appears complete');
      break;
    }

    if (attempts % 10 === 0) {
      console.log(`Waiting for response... (${attempts}s)`);
      await page.screenshot({ path: `screenshots/progress-${attempts}s.png`, fullPage: true });
    }

    await page.waitForTimeout(1000);
  }

  // Final wait for any animations
  await page.waitForTimeout(3000);

  // Take the final screenshot
  await page.screenshot({ path: 'screenshots/final-response.png', fullPage: true });
  console.log('📸 Captured: screenshots/final-response.png');

  // Scroll down to see full response if needed
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/final-response-scrolled.png', fullPage: true });
  console.log('📸 Captured: screenshots/final-response-scrolled.png');

  // Extract content
  const pageContent = await page.textContent('body') || '';

  // Look for trip ID
  const tripMatch = pageContent.match(/atrip-\d+/);
  if (tripMatch) {
    console.log(`\n✅ Trip ID: ${tripMatch[0]}`);
  }

  // Look for deep link URL
  const urlMatch = pageContent.match(/https?:\/\/marketplace\.avinode\.com[^\s"')]+/);
  if (urlMatch) {
    console.log(`✅ Deep Link URL: ${urlMatch[0]}`);
  }

  // Highlight deep link if present
  const deepLinkEl = await page.$('a[href*="marketplace.avinode.com"], a[href*="avinode"], button:has-text("Open in Avinode")');
  if (deepLinkEl) {
    await deepLinkEl.evaluate((el) => {
      (el as HTMLElement).style.border = '4px solid red';
      (el as HTMLElement).style.boxShadow = '0 0 10px red';
    });
    await page.screenshot({ path: 'screenshots/deep-link-highlighted.png', fullPage: true });
    console.log('📸 Captured: screenshots/deep-link-highlighted.png');
  }

  console.log('\n=== Done ===\n');
}

captureResponse().catch(console.error);
