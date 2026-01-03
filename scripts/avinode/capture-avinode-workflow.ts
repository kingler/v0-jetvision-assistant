/**
 * Avinode Deep Link Workflow Screenshot Capture Script
 *
 * Captures screenshots of the complete Avinode workflow:
 * 1. Flight request submission
 * 2. Deep link generation
 * 3. Trip ID input
 *
 * Run with: npx tsx scripts/capture-avinode-workflow.ts
 */

import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'test-results', 'avinode-workflow');
const BASE_URL = 'http://localhost:3000';

async function ensureDir(dir: string): Promise<void> {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
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
  console.log('========================================\n');

  await ensureDir(SCREENSHOTS_DIR);

  let browser: Browser | null = null;

  try {
    // Launch browser
    console.log('🚀 Launching browser...');
    browser = await chromium.launch({
      headless: false,
      slowMo: 300 // Slow down for visibility
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 }
    });
    const page = await context.newPage();

    // Step 1: Navigate to app
    console.log('\n📋 STEP 1: Navigating to application');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Wait for page content to render
    console.log('  ⏳ Waiting for page content to load...');
    await page.waitForTimeout(5000);

    // Check if still redirected to sign-in (Clerk token may not work without env vars)
    if (page.url().includes('sign-in')) {
      console.log('  ⚠️  Sign-in page detected - waiting for Clerk UI to load...');

      // Wait for Clerk sign-in form to appear
      try {
        await page.waitForSelector('input[name="identifier"], [data-clerk-component], .cl-signIn-root, form', { timeout: 10000 });
      } catch {
        console.log('  ⚠️  Could not find Clerk form elements');
      }
      await page.waitForTimeout(2000);
      await captureScreenshot(page, '00-sign-in-page');

      // Show the sign-in page for manual login
      console.log('  👤 Please sign in manually within 120 seconds...');
      console.log('  📍 Browser window should be open - sign in there');

      // Wait for navigation away from sign-in (manual login)
      try {
        await page.waitForURL((url) => !url.toString().includes('sign-in'), { timeout: 120000 });
        console.log('  ✅ Successfully signed in!');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
      } catch {
        console.log('  ⚠️  Sign-in timeout - proceeding anyway...');
      }
    }

    await captureScreenshot(page, '01-home-page');

    // Step 2: Find chat interface
    console.log('\n📋 STEP 2: Locating chat interface');

    // Look for chat input
    const chatInput = page.locator('textarea, input[placeholder*="message" i], input[placeholder*="Message" i]').first();

    if (!(await chatInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      // Try /chat route
      console.log('  Chat not found, trying /chat route...');
      await page.goto(`${BASE_URL}/chat`);
      await page.waitForTimeout(2000);
      await captureScreenshot(page, '01b-chat-route');
    }

    // Step 3: Submit flight request
    console.log('\n📋 STEP 3: Submitting flight request');

    const input = page.locator('textarea, input[type="text"]').first();
    if (await input.isVisible({ timeout: 5000 }).catch(() => false)) {
      const flightRequest = 'I need a private jet from Teterboro (KTEB) to Los Angeles (KLAX) for 6 passengers on January 25, 2025';

      await input.click();
      await input.fill(flightRequest);
      await captureScreenshot(page, '02-flight-request-typed');

      // Submit
      await input.press('Enter');
      console.log('  ✅ Request submitted');

      // Wait for response
      console.log('  ⏳ Waiting for agent response...');
      await waitForResponse(page, 60000);
      await captureScreenshot(page, '03-agent-response');

      // Step 4: Check for deep link
      console.log('\n📋 STEP 4: Checking for deep link components');

      // Check for deep link prompt
      const deepLinkPrompt = page.locator('[data-testid="avinode-deep-link-prompt"]');
      const hasDeepLink = await deepLinkPrompt.isVisible({ timeout: 5000 }).catch(() => false);

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
        console.log('  ⚠️  Deep link prompt not found - checking page state');
        await captureScreenshot(page, '04-no-deep-link');

        // Look for any agent messages
        const messages = await page.locator('[data-testid="agent-message"]').count();
        console.log(`  Agent messages found: ${messages}`);
      }

      // Step 5: Check for Trip ID input
      console.log('\n📋 STEP 5: Checking for Trip ID input');

      const tripIdInput = page.locator('[data-testid="trip-id-input"]');
      const hasTripIdInput = await tripIdInput.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasTripIdInput) {
        console.log('  ✅ Trip ID input found!');
        await captureScreenshot(page, '05-trip-id-input-visible');

        // Fill in a test Trip ID
        await tripIdInput.fill('TEST123456');
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
        console.log('  ⚠️  Trip ID input not visible yet');
      }

      // Final full-page screenshot
      await captureScreenshot(page, '06-final-state');

    } else {
      console.log('  ❌ Chat input not found');
      await captureScreenshot(page, '02-no-chat-input');
    }

    // Summary
    console.log('\n========================================');
    console.log('📋 Capture Complete');
    console.log('========================================');
    console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);

    // List screenshots
    const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
    console.log(`\nCaptured ${files.length} screenshots:`);
    files.forEach(f => console.log(`  - ${f}`));

    // Keep browser open for manual inspection
    console.log('\n👀 Browser will remain open for 30 seconds for inspection...');
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
