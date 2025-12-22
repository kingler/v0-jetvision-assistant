/**
 * Avinode Deep Link Workflow Screenshot Capture Script (Authenticated)
 *
 * Uses persistent browser context to maintain authentication across runs.
 * First run: Sign in manually, auth will be saved
 * Subsequent runs: Automatically uses saved auth
 *
 * Run with: npx tsx scripts/capture-avinode-workflow-authenticated.ts
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'test-results', 'avinode-workflow');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function ensureDir(dir: string): Promise<void> {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Check if server is running before proceeding
async function checkServer(): Promise<boolean> {
  try {
    const response = await fetch(BASE_URL, { method: 'HEAD' });
    return response.status > 0;
  } catch {
    return false;
  }
}

async function captureScreenshot(page: Page, name: string): Promise<void> {
  const filepath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`  📸 Screenshot saved: ${name}.png`);
}

async function waitForResponse(page: Page, timeout = 30000): Promise<void> {
  try {
    // Wait for typing indicator to disappear or new content
    await page.waitForFunction(
      () => {
        const loader = document.querySelector('.animate-spin');
        return !loader || getComputedStyle(loader).display === 'none';
      },
      { timeout }
    );
    await page.waitForTimeout(2000); // Extra settle time
  } catch {
    console.log('  ⚠️  Response timeout, continuing...');
  }
}

async function main(): Promise<void> {
  console.log('\n========================================');
  console.log('Avinode Deep Link Workflow Screenshot Capture');
  console.log('(With Persistent Authentication)');
  console.log('========================================\n');

  await ensureDir(SCREENSHOTS_DIR);

  // Check server before launching browser
  console.log(`🔍 Checking server at ${BASE_URL}...`);
  const serverOk = await checkServer();
  if (!serverOk) {
    console.log('❌ Server not reachable. Please start the dev server with: npm run dev:app');
    console.log('   Then run this script again.');
    return;
  }
  console.log('✅ Server is running');

  let browser: Browser | null = null;

  try {
    // Launch browser with anti-detection settings
    console.log('\n🚀 Launching browser...');
    console.log('   (Using settings to avoid Google bot detection)');

    browser = await chromium.launch({
      headless: false,
      slowMo: 200,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--no-sandbox',
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      // Remove automation indicators
      bypassCSP: true,
    });

    // Remove webdriver property that Google uses for detection
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const page = await context.newPage();

    // Step 1: Navigate to app
    console.log('\n📋 STEP 1: Navigating to application');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000); // Let Clerk load

    // Check if we need to sign in (check for sign-in page, Google OAuth, or not on localhost)
    const currentUrl = page.url();
    const needsAuth = currentUrl.includes('sign-in') ||
                      currentUrl.includes('accounts.google.com') ||
                      currentUrl.includes('clerk.') ||
                      !currentUrl.includes('localhost');

    if (needsAuth) {
      console.log('  ⚠️  Sign-in required');
      console.log('  👤 Please sign in manually in the browser window...');
      console.log('  💡 Complete Google sign-in to continue');

      // Wait for Clerk/Google to load
      await page.waitForTimeout(5000);
      await captureScreenshot(page, '00-sign-in-page');

      // Wait for successful sign-in (navigation back to localhost)
      console.log('  ⏳ Waiting for sign-in (up to 3 minutes)...');
      try {
        await page.waitForURL((url) => {
          const urlStr = url.toString();
          return urlStr.includes('localhost:3000') &&
                 !urlStr.includes('sign-in') &&
                 !urlStr.includes('sign-up');
        }, { timeout: 180000 });
        console.log('  ✅ Successfully signed in!');
        await page.waitForTimeout(5000); // Let page load
      } catch {
        console.log('  ❌ Sign-in timeout. Please run the script again and sign in faster.');
        return;
      }
    } else {
      console.log('  ✅ Already authenticated');
    }

    await captureScreenshot(page, '01-home-page');

    // Step 2: Find chat interface
    console.log('\n📋 STEP 2: Locating chat interface');

    // Check for chat input on current page
    let chatInput = page.locator('textarea, input[placeholder*="message" i]').first();
    let chatFound = await chatInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (!chatFound) {
      // Try navigating to /chat
      console.log('  Chat not found on home, trying /chat route...');
      await page.goto(`${BASE_URL}/chat`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      await captureScreenshot(page, '01b-chat-route');

      chatInput = page.locator('textarea, input[placeholder*="message" i]').first();
      chatFound = await chatInput.isVisible({ timeout: 5000 }).catch(() => false);
    }

    if (!chatFound) {
      console.log('  ❌ Chat input not found. Checking page state...');
      await captureScreenshot(page, '02-no-chat-input');

      // Debug: Print page content
      const pageContent = await page.content();
      console.log('  Page URL:', page.url());
      console.log('  Page has textarea:', pageContent.includes('textarea'));
      console.log('  Page has input:', pageContent.includes('input'));
      return;
    }

    console.log('  ✅ Chat interface found');

    // Step 3: Submit flight request
    console.log('\n📋 STEP 3: Submitting flight request');

    const flightRequest = 'I need a private jet from Teterboro (KTEB) to Los Angeles (KLAX) for 6 passengers on January 25, 2025';

    await chatInput.click();
    await chatInput.fill(flightRequest);
    await page.waitForTimeout(500);
    await captureScreenshot(page, '02-flight-request-typed');

    // Submit the request
    await chatInput.press('Enter');
    console.log('  ✅ Request submitted');

    // Wait for agent response
    console.log('  ⏳ Waiting for AI response (this may take up to 60 seconds)...');
    await waitForResponse(page, 60000);
    await page.waitForTimeout(3000);
    await captureScreenshot(page, '03-agent-response');

    // Step 4: Check for deep link
    console.log('\n📋 STEP 4: Checking for deep link components');

    // Check for deep link prompt
    const deepLinkPrompt = page.locator('[data-testid="avinode-deep-link-prompt"]');
    const hasDeepLink = await deepLinkPrompt.isVisible({ timeout: 10000 }).catch(() => false);

    if (hasDeepLink) {
      console.log('  ✅ Deep link prompt found!');
      await captureScreenshot(page, '04-deep-link-displayed');

      // Get the deep link URL
      const deepLinkButton = page.locator('[data-testid="avinode-deep-link-button"]');
      if (await deepLinkButton.isVisible().catch(() => false)) {
        const href = await deepLinkButton.getAttribute('href');
        console.log(`  🔗 Deep Link URL: ${href}`);
      }

      // Check for route visualization
      const routeViz = page.locator('[data-testid="route-visualization"]');
      if (await routeViz.isVisible().catch(() => false)) {
        console.log('  ✅ Route visualization found');
      }
    } else {
      console.log('  ⚠️  Deep link prompt not found');
      await captureScreenshot(page, '04-no-deep-link');

      // Check for any messages
      const messages = await page.locator('[data-role="assistant"], .assistant-message').count();
      console.log(`  📝 Assistant messages found: ${messages}`);

      // Scroll down to see more content
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
      await captureScreenshot(page, '04b-scrolled-view');
    }

    // Step 5: Check for Trip ID input
    console.log('\n📋 STEP 5: Checking for Trip ID input');

    const tripIdInput = page.locator('[data-testid="trip-id-input"]');
    const hasTripIdInput = await tripIdInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasTripIdInput) {
      console.log('  ✅ Trip ID input found!');
      await captureScreenshot(page, '05-trip-id-input-visible');

      // Fill in a test Trip ID
      await tripIdInput.fill('atrip-12345678');
      await captureScreenshot(page, '05b-trip-id-filled');

      // Check for workflow progress indicator
      const workflowProgress = page.locator('[data-testid="workflow-progress"]');
      if (await workflowProgress.isVisible().catch(() => false)) {
        console.log('  ✅ Workflow progress indicator found');
      }

      // Check for action required card
      const actionRequired = page.locator('[data-testid="trip-id-action-required"]');
      if (await actionRequired.isVisible().catch(() => false)) {
        console.log('  ✅ Action required card found');
      }
    } else {
      console.log('  ⚠️  Trip ID input not visible');
    }

    // Final full-page screenshot
    await captureScreenshot(page, '06-final-state');

    // Summary
    console.log('\n========================================');
    console.log('📋 Capture Complete');
    console.log('========================================');
    console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);

    // List screenshots
    const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
    console.log(`\nCaptured ${files.length} screenshots:`);
    files.forEach(f => console.log(`  - ${f}`));

    // Keep browser open for inspection
    console.log('\n👀 Browser will remain open for 30 seconds for inspection...');
    console.log('   Press Ctrl+C to close earlier.');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main().catch(console.error);
