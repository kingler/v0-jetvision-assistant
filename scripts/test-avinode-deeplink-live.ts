/**
 * Avinode Deeplink Test - Live Browser Connection
 *
 * This script connects to your existing Chrome browser via CDP (Chrome DevTools Protocol)
 * to test the Avinode workflow with your authenticated session.
 *
 * SETUP:
 * 1. Close Chrome completely
 * 2. Start Chrome with debugging enabled:
 *    /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
 * 3. Log in to Jetvision at http://localhost:3000
 * 4. Run this script: npx tsx scripts/test-avinode-deeplink-live.ts
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots', 'avinode-live');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function captureScreenshot(page: any, name: string): Promise<string> {
  const filename = `${name}-${Date.now()}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot: ${filename}`);
  return filename;
}

async function main() {
  console.log('\n🚀 Avinode Deeplink Live Test\n');
  console.log('Connecting to Chrome at http://localhost:9222...\n');

  let browser;
  try {
    // Connect to existing Chrome instance
    browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Connected to Chrome\n');
  } catch (error) {
    console.error('❌ Could not connect to Chrome.');
    console.error('\nPlease start Chrome with remote debugging:');
    console.error(
      '\n  /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222\n'
    );
    console.error('Then log in to http://localhost:3000 and run this script again.\n');
    process.exit(1);
  }

  // Get existing contexts
  const contexts = browser.contexts();
  console.log(`Found ${contexts.length} browser context(s)`);

  if (contexts.length === 0) {
    console.error('No browser contexts found. Open a tab first.');
    await browser.close();
    process.exit(1);
  }

  const context = contexts[0];
  const pages = context.pages();
  console.log(`Found ${pages.length} page(s)\n`);

  // Find existing Jetvision page or create new one
  let page = pages.find((p) => p.url().includes('localhost:3000'));

  if (!page) {
    console.log('Creating new tab for Jetvision...');
    page = await context.newPage();
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
  }

  console.log(`Current URL: ${page.url()}\n`);

  // Check authentication
  if (page.url().includes('sign-in')) {
    console.log('⚠️  Not authenticated - please log in through the browser');
    console.log('Then run this script again.\n');
    await captureScreenshot(page, 'auth-required');
    return;
  }

  await captureScreenshot(page, '01-authenticated');

  // Test the Avinode workflow
  console.log('=== Testing Avinode Flight Request Workflow ===\n');

  // Find chat input - look for various placeholder patterns
  console.log('Step 1: Looking for chat input...');
  const chatInput = page.locator(
    'textarea[placeholder*="Message"], textarea[placeholder*="message"], textarea[placeholder*="Flight Request"], input[placeholder*="Message"], textarea[placeholder*="Type your message"], input[placeholder*="Type your message"]'
  );

  let inputFound = await chatInput.first().isVisible({ timeout: 5000 }).catch(() => false);

  if (!inputFound) {
    // Try any textarea as fallback
    const altInput = page.locator('textarea').first();
    if (await altInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Found textarea element');
      inputFound = true;
    } else {
      console.log('❌ Chat input not found');
      await captureScreenshot(page, '02-no-input');

      // Debug: list all inputs
      const allInputs = await page.locator('textarea, input').all();
      console.log(`\nFound ${allInputs.length} input elements:`);
      for (let i = 0; i < Math.min(allInputs.length, 5); i++) {
        const placeholder = await allInputs[i].getAttribute('placeholder');
        const type = await allInputs[i].getAttribute('type');
        console.log(`  ${i + 1}. type="${type}" placeholder="${placeholder}"`);
      }
      return;
    }
  }

  console.log('✅ Chat input found\n');
  await captureScreenshot(page, '02-input-found');

  // Enter flight request
  console.log('Step 2: Entering flight request...');
  const flightRequest =
    'I need a private jet from Teterboro (KTEB) to Miami (KMIA) for 6 passengers on January 20th, 2025';

  await chatInput.first().focus();
  await chatInput.first().fill(flightRequest);
  await captureScreenshot(page, '03-request-typed');
  console.log('✅ Flight request entered\n');

  // Submit
  console.log('Step 3: Submitting request...');
  await chatInput.first().press('Enter');
  await captureScreenshot(page, '04-submitted');
  console.log('✅ Request submitted\n');

  // Wait for response
  console.log('Step 4: Waiting for Avinode response (15 seconds)...');
  await page.waitForTimeout(15000);
  await captureScreenshot(page, '05-response-wait');

  // Check for Avinode integration elements
  console.log('\nStep 5: Checking for Avinode deeplink...\n');

  // Various selectors for Avinode elements
  const avinodeLink = page.locator('a[href*="avinode"], a:has-text("View in Avinode")');
  const deepLinkButton = page.locator('[data-testid="avinode-deep-link"]');
  const webhookStatus = page.locator('[data-testid="webhook-status"]');
  const tripIdDisplay = page.locator('[data-testid="trip-id"], [class*="trip-id"]');
  const connectTripBtn = page.locator('button:has-text("Connect Trip")');
  const viewQuotesBtn = page.locator('button:has-text("View Quotes")');

  // Check each element
  const results = {
    'View in Avinode link': await avinodeLink.first().isVisible({ timeout: 3000 }).catch(() => false),
    'Deeplink button': await deepLinkButton.first().isVisible({ timeout: 2000 }).catch(() => false),
    'Webhook status': await webhookStatus.first().isVisible({ timeout: 2000 }).catch(() => false),
    'Trip ID display': await tripIdDisplay.first().isVisible({ timeout: 2000 }).catch(() => false),
    'Connect Trip button': await connectTripBtn.first().isVisible({ timeout: 2000 }).catch(() => false),
    'View Quotes button': await viewQuotesBtn.first().isVisible({ timeout: 2000 }).catch(() => false),
  };

  console.log('=== Avinode Integration Results ===\n');
  let foundAny = false;
  for (const [name, found] of Object.entries(results)) {
    console.log(`${found ? '✅' : '❌'} ${name}: ${found ? 'FOUND' : 'NOT FOUND'}`);
    if (found) foundAny = true;
  }

  // If we found the Avinode link, extract the URL
  if (results['View in Avinode link']) {
    const href = await avinodeLink.first().getAttribute('href');
    console.log(`\n🔗 Deeplink URL: ${href}`);
  }

  // Check page content for any Avinode references
  console.log('\n=== Page Content Analysis ===\n');
  const content = await page.content();
  const checks = {
    "Contains 'avinode'": content.toLowerCase().includes('avinode'),
    "Contains 'deep_link' or 'deepLink'":
      content.includes('deep_link') || content.includes('deepLink') || content.includes('deeplink'),
    "Contains 'trip_id' or 'tripId'":
      content.includes('trip_id') || content.includes('tripId') || content.includes('TRP'),
    "Contains 'webhook'": content.toLowerCase().includes('webhook'),
    "Contains 'quote'": content.toLowerCase().includes('quote'),
  };

  for (const [check, result] of Object.entries(checks)) {
    console.log(`${result ? '✅' : '❌'} ${check}`);
  }

  await captureScreenshot(page, '06-final');

  // Summary
  console.log('\n=== Summary ===\n');
  if (foundAny) {
    console.log('✅ Avinode integration elements detected in the UI');
  } else {
    console.log('⚠️  No Avinode integration elements visible yet.');
    console.log('   This could mean:');
    console.log('   - The workflow is still processing');
    console.log('   - Running in mock mode (no real Avinode connection)');
    console.log('   - The Avinode MCP server is not running');
  }

  console.log(`\n📁 Screenshots saved to: ${SCREENSHOTS_DIR}\n`);
}

main().catch(console.error);
