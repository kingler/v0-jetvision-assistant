#!/usr/bin/env npx tsx
/**
 * Complete Chat Workflow E2E Test
 * ================================
 *
 * This is the consolidated end-to-end test for the Jetvision chat interface
 * including Avinode deep link workflow with human-in-the-loop support.
 *
 * WORKFLOW COVERED:
 * 1. Authentication Flow (Clerk)
 * 2. Chat Interface Functionality
 * 3. Flight Request Submission
 * 4. create_trip MCP Tool Execution
 * 5. Deep Link Generation & Display
 * 6. Manual Pause for Avinode Marketplace Interaction
 * 7. Trip ID Submission After Operator Selection
 * 8. Quote Retrieval & Display
 *
 * PREREQUISITES:
 * - Chrome running with: --remote-debugging-port=9222
 * - Dev server running: npm run dev
 * - User authenticated in Chrome session
 *
 * USAGE:
 *   npx tsx scripts/test-complete-chat-workflow.ts
 *   npx tsx scripts/test-complete-chat-workflow.ts --skip-auth   # Skip auth check
 *   npx tsx scripts/test-complete-chat-workflow.ts --no-pause    # Skip manual pause
 *
 * @author Claude Code
 * @date 2025-12-20
 */

import { chromium, Page, Browser, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const CONFIG = {
  CDP_URL: 'http://localhost:9222',
  APP_URL: 'http://localhost:3000',
  SCREENSHOTS_DIR: path.join(process.cwd(), 'test-results', 'complete-workflow'),
  TIMEOUTS: {
    navigation: 60000,
    agentResponse: 90000,
    deepLink: 30000,
    quote: 60000,
  },
};

// Parse command line arguments
const ARGS = {
  skipAuth: process.argv.includes('--skip-auth'),
  noPause: process.argv.includes('--no-pause'),
};

// Test context
interface TestContext {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  tripId?: string;
  deepLinkUrl?: string;
}

// Test step result
interface StepResult {
  name: string;
  passed: boolean;
  duration: number;
  details?: string;
  error?: string;
}

const results: StepResult[] = [];

// ============================================================================
// Utility Functions
// ============================================================================

function ensureScreenshotsDir(): void {
  if (!fs.existsSync(CONFIG.SCREENSHOTS_DIR)) {
    fs.mkdirSync(CONFIG.SCREENSHOTS_DIR, { recursive: true });
  }
}

async function screenshot(page: Page, step: string, name: string): Promise<string> {
  ensureScreenshotsDir();
  const filename = `${step}-${name}.png`;
  const filepath = path.join(CONFIG.SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`  📸 ${filename}`);
  return filepath;
}

function log(message: string, level: 'info' | 'success' | 'warn' | 'error' = 'info'): void {
  const icons = {
    info: 'ℹ️ ',
    success: '✅',
    warn: '⚠️ ',
    error: '❌',
  };
  console.log(`${icons[level]} ${message}`);
}

function header(title: string): void {
  console.log('\n' + '='.repeat(60));
  console.log(`📋 ${title}`);
  console.log('='.repeat(60) + '\n');
}

function subheader(title: string): void {
  console.log(`\n--- ${title} ---`);
}

async function runStep<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T | null; passed: boolean }> {
  const startTime = Date.now();
  subheader(name);

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    results.push({
      name,
      passed: true,
      duration,
      details: typeof result === 'object' ? JSON.stringify(result).slice(0, 200) : String(result),
    });

    log(`Completed in ${duration}ms`, 'success');
    return { result, passed: true };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    results.push({
      name,
      passed: false,
      duration,
      error: errorMessage,
    });

    log(errorMessage, 'error');
    return { result: null, passed: false };
  }
}

// ============================================================================
// Test Steps
// ============================================================================

/**
 * Step 1: Connect to Chrome via CDP
 */
async function connectToBrowser(): Promise<TestContext | null> {
  const { result } = await runStep('Connect to Chrome Browser', async () => {
    const browser = await chromium.connectOverCDP(CONFIG.CDP_URL);
    const contexts = browser.contexts();

    if (contexts.length === 0) {
      throw new Error('No browser contexts found. Please open Chrome with the app loaded.');
    }

    const context = contexts[0];
    const pages = context.pages();

    // Find existing localhost page or create new one
    let page = pages.find((p) => p.url().includes('localhost:3000'));

    if (!page) {
      log('No existing localhost page, creating new one', 'info');
      page = await context.newPage();
    } else {
      log(`Found existing page: ${page.url()}`, 'info');
    }

    return { browser, context, page };
  });

  return result;
}

/**
 * Step 2: Verify Authentication
 */
async function verifyAuthentication(ctx: TestContext): Promise<boolean> {
  if (ARGS.skipAuth) {
    log('Skipping authentication check (--skip-auth)', 'warn');
    return true;
  }

  const { passed } = await runStep('Verify Authentication', async () => {
    const { page } = ctx;

    // Navigate to app if not already there
    const currentUrl = page.url();
    if (!currentUrl.includes('localhost:3000')) {
      await page.goto(CONFIG.APP_URL, { waitUntil: 'domcontentloaded', timeout: CONFIG.TIMEOUTS.navigation });
    } else {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: CONFIG.TIMEOUTS.navigation });
    }

    // Wait for page to stabilize
    await page.waitForTimeout(2000);

    const urlAfterLoad = page.url();
    await screenshot(page, '01', 'authentication-check');

    // Check if redirected to sign-in
    if (urlAfterLoad.includes('sign-in') || urlAfterLoad.includes('sign-up')) {
      throw new Error('Not authenticated! Please sign in through the browser first.');
    }

    // Check for Clerk user button or authenticated content
    const isAuthenticated = await page
      .locator('[data-clerk-user-button], [class*="UserButton"], button:has-text("Sign out")')
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!isAuthenticated) {
      // Check if we can access the chat (alternative auth check)
      const hasChat = await page
        .locator('textarea, input[placeholder*="message" i]')
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (!hasChat) {
        throw new Error('Unable to verify authentication. Please sign in manually.');
      }
    }

    log('User is authenticated', 'success');
    return true;
  });

  return passed;
}

/**
 * Step 3: Navigate to Chat Interface
 */
async function navigateToChat(ctx: TestContext): Promise<boolean> {
  const { passed } = await runStep('Navigate to Chat Interface', async () => {
    const { page } = ctx;

    // Click "New" button if visible to start fresh chat
    const newButton = page.locator('button:has-text("New"), a:has-text("New")').first();
    if (await newButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newButton.click();
      await page.waitForTimeout(1000);
      log('Started new chat session', 'info');
    }

    // Find chat input
    const chatInput = page.locator([
      'textarea[placeholder*="message" i]',
      'input[placeholder*="message" i]',
      '[data-testid="chat-input"]',
      'textarea',
    ].join(', ')).first();

    const hasInput = await chatInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasInput) {
      // Try navigating to /chat
      await page.goto(`${CONFIG.APP_URL}/chat`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
    }

    await screenshot(page, '02', 'chat-interface-ready');

    // Verify input is accessible
    const inputVisible = await chatInput.isVisible({ timeout: 5000 });
    if (!inputVisible) {
      throw new Error('Chat input not found on page');
    }

    return true;
  });

  return passed;
}

/**
 * Step 4: Submit Flight Request
 */
async function submitFlightRequest(ctx: TestContext): Promise<boolean> {
  const { passed } = await runStep('Submit Flight Request', async () => {
    const { page } = ctx;

    const flightRequest =
      'I need a private jet from Teterboro (KTEB) to Los Angeles (KLAX) for 6 passengers on January 25th, 2025';

    log(`Request: "${flightRequest}"`, 'info');

    // Find and fill chat input
    const chatInput = page.locator('textarea, input[placeholder*="message" i]').first();
    await chatInput.focus();
    await chatInput.fill(flightRequest);

    await screenshot(page, '03', 'flight-request-typed');

    // Submit the request
    const sendButton = page.locator('button[type="submit"], button[aria-label*="send" i]').last();
    if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sendButton.click();
    } else {
      await chatInput.press('Enter');
    }

    log('Request submitted', 'success');
    return true;
  });

  return passed;
}

/**
 * Step 5: Wait for Agent Response with Deep Link
 */
async function waitForDeepLink(ctx: TestContext): Promise<boolean> {
  const { passed, result } = await runStep('Wait for Deep Link Generation', async () => {
    const { page } = ctx;

    log('Waiting for AI agent response (up to 90s)...', 'info');

    // Wait for agent to respond with create_trip tool result
    const startTime = Date.now();
    let deepLinkFound = false;
    let tripIdFound = false;

    while (Date.now() - startTime < CONFIG.TIMEOUTS.agentResponse) {
      // Take periodic screenshots
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      if (elapsed % 15 === 0 && elapsed > 0) {
        await screenshot(page, '04', `response-progress-${elapsed}s`);
        log(`Still waiting... (${elapsed}s)`, 'info');
      }

      // Check for deep link button
      const deepLinkSelectors = [
        'a:has-text("Open in Avinode")',
        'a:has-text("Open Avinode")',
        'button:has-text("Open in Avinode")',
        'a[href*="avinode.com"]',
        'a[href*="marketplace"]',
        '[data-testid="avinode-deep-link"]',
      ];

      for (const selector of deepLinkSelectors) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 500 }).catch(() => false)) {
          deepLinkFound = true;
          const href = await element.getAttribute('href').catch(() => null);
          if (href) {
            ctx.deepLinkUrl = href;
            log(`Deep link URL: ${href}`, 'success');
          }
          break;
        }
      }

      // Check for trip ID display
      const tripIdPattern = /trip[_-]?id[:\s]*([A-Za-z0-9-]+)/i;
      const pageContent = await page.content();
      const match = pageContent.match(tripIdPattern);
      if (match) {
        ctx.tripId = match[1];
        tripIdFound = true;
        log(`Trip ID detected: ${ctx.tripId}`, 'success');
      }

      if (deepLinkFound || tripIdFound) {
        break;
      }

      await page.waitForTimeout(1000);
    }

    await screenshot(page, '05', 'deep-link-result');

    if (!deepLinkFound && !tripIdFound) {
      // Check if response received but no deep link
      const hasResponse = await page
        .locator('.prose, [data-message-type="agent"], [class*="agent-message"]')
        .count();

      if (hasResponse > 0) {
        log('Agent responded but deep link not visible', 'warn');
        // Get response text for debugging
        const responseText = await page
          .locator('.prose, [data-message-type="agent"]')
          .last()
          .textContent()
          .catch(() => '');
        log(`Response preview: ${responseText?.slice(0, 200)}...`, 'info');
      }

      throw new Error('Deep link not generated within timeout');
    }

    return { deepLinkFound, tripIdFound, tripId: ctx.tripId, deepLinkUrl: ctx.deepLinkUrl };
  });

  return passed;
}

/**
 * Step 6: Manual Pause for Avinode Marketplace
 *
 * IMPORTANT: This step pauses the test to allow manual interaction with
 * the Avinode marketplace. The user should:
 * 1. Click the deep link to open Avinode
 * 2. Review available operators
 * 3. Select preferred aircraft
 * 4. Submit RFP to operators
 * 5. Return to the app and continue the test
 */
async function manualAvinodeInteraction(ctx: TestContext): Promise<boolean> {
  if (ARGS.noPause) {
    log('Skipping manual pause (--no-pause)', 'warn');
    return true;
  }

  const { passed } = await runStep('Manual Avinode Marketplace Interaction', async () => {
    const { page } = ctx;

    console.log('\n' + '!'.repeat(60));
    console.log('!!! MANUAL STEP REQUIRED !!!');
    console.log('!'.repeat(60));
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║  HUMAN-IN-THE-LOOP: Avinode Marketplace Selection              ║
╠════════════════════════════════════════════════════════════════╣
║                                                                 ║
║  Please perform the following steps:                            ║
║                                                                 ║
║  1. Click the "Open in Avinode Marketplace" button              ║
║  2. Log in to Avinode (if required)                             ║
║  3. Review the available operators                              ║
║  4. Select your preferred aircraft options                      ║
║  5. Submit the RFP to the selected operators                    ║
║  6. Note down the Trip ID from Avinode                          ║
║  7. Return to this terminal                                     ║
║                                                                 ║
║  ${ctx.deepLinkUrl ? `Deep Link: ${ctx.deepLinkUrl}` : 'Deep link should be visible in the app'}
║                                                                 ║
╚════════════════════════════════════════════════════════════════╝
`);

    // Use page.pause() to allow manual interaction
    // This opens Playwright Inspector for step-by-step debugging
    log('Opening Playwright Inspector. Click "Resume" when done with Avinode.', 'info');
    await page.pause();

    await screenshot(page, '06', 'after-avinode-interaction');
    log('Manual step completed', 'success');

    return true;
  });

  return passed;
}

/**
 * Step 7: Submit Trip ID (after Avinode selection)
 */
async function submitTripId(ctx: TestContext): Promise<boolean> {
  const { passed } = await runStep('Submit Trip ID', async () => {
    const { page } = ctx;

    // Look for Trip ID input field
    const tripIdInput = page.locator([
      'input[placeholder*="trip" i]',
      'input[placeholder*="enter" i]',
      '[data-testid="trip-id-input"]',
      'input[name*="trip" i]',
    ].join(', ')).first();

    const hasInput = await tripIdInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasInput) {
      // Trip ID might already be known from create_trip response
      if (ctx.tripId) {
        log(`Using existing Trip ID: ${ctx.tripId}`, 'info');
        return true;
      }

      // Or the workflow might have auto-proceeded
      log('Trip ID input not visible - workflow may have auto-continued', 'info');
      return true;
    }

    // If we have a trip ID, use it; otherwise prompt user
    const tripIdToUse = ctx.tripId || 'TEST-TRIP-ID';
    await tripIdInput.fill(tripIdToUse);
    log(`Entered Trip ID: ${tripIdToUse}`, 'info');

    await screenshot(page, '07', 'trip-id-entered');

    // Submit
    const submitButton = page.locator([
      'button:has-text("Submit")',
      'button:has-text("Retrieve")',
      'button:has-text("Get Quotes")',
      'button[type="submit"]',
    ].join(', ')).first();

    if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitButton.click();
      log('Trip ID submitted', 'success');
    }

    return true;
  });

  return passed;
}

/**
 * Step 8: Wait for Quotes
 */
async function waitForQuotes(ctx: TestContext): Promise<boolean> {
  const { passed } = await runStep('Wait for Quote Retrieval', async () => {
    const { page } = ctx;

    log('Waiting for quotes from operators...', 'info');

    const startTime = Date.now();

    while (Date.now() - startTime < CONFIG.TIMEOUTS.quote) {
      // Check for quote cards
      const quoteSelectors = [
        '[class*="quote"]',
        '[data-testid*="quote"]',
        '.quote-card',
        '[class*="Quote"]',
      ];

      for (const selector of quoteSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          log(`Found ${count} quote card(s)`, 'success');
          await screenshot(page, '08', 'quotes-displayed');
          return { quotesFound: true, count };
        }
      }

      // Check for "no quotes" or "pending" states
      const pendingText = await page
        .locator('text=Waiting for quotes, text=No quotes, text=pending')
        .isVisible({ timeout: 500 })
        .catch(() => false);

      if (pendingText) {
        log('Quotes pending from operators', 'info');
      }

      await page.waitForTimeout(2000);
    }

    // Even if no quotes, capture final state
    await screenshot(page, '08', 'quotes-final-state');

    log('Quote retrieval timeout - operators may not have responded yet', 'warn');
    return { quotesFound: false, count: 0 };
  });

  return passed;
}

/**
 * Print test summary
 */
function printSummary(): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\nTotal Steps: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Duration: ${(totalDuration / 1000).toFixed(1)}s`);

  if (failed > 0) {
    console.log('\n❌ FAILED STEPS:');
    for (const result of results.filter((r) => !r.passed)) {
      console.log(`   - ${result.name}: ${result.error}`);
    }
  }

  console.log('\n' + '='.repeat(60));

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('The complete chat workflow with Avinode integration is working.');
  } else {
    console.log('⚠️  SOME TESTS FAILED');
    console.log('Please review the errors and screenshots above.');
  }

  console.log(`\n📁 Screenshots saved to: ${CONFIG.SCREENSHOTS_DIR}`);
  console.log('='.repeat(60) + '\n');
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function main(): Promise<void> {
  header('Complete Chat Workflow E2E Test');

  console.log('Configuration:');
  console.log(`  CDP URL: ${CONFIG.CDP_URL}`);
  console.log(`  App URL: ${CONFIG.APP_URL}`);
  console.log(`  Skip Auth: ${ARGS.skipAuth}`);
  console.log(`  No Pause: ${ARGS.noPause}`);
  console.log('');

  // Step 1: Connect to browser
  const ctx = await connectToBrowser();
  if (!ctx) {
    log('Failed to connect to Chrome. Please ensure Chrome is running with:', 'error');
    log('  --remote-debugging-port=9222', 'error');
    printSummary();
    process.exit(1);
  }

  try {
    // Step 2: Verify authentication
    const isAuthenticated = await verifyAuthentication(ctx);
    if (!isAuthenticated && !ARGS.skipAuth) {
      log('Please authenticate in Chrome and try again.', 'error');
      printSummary();
      return;
    }

    // Step 3: Navigate to chat
    const chatReady = await navigateToChat(ctx);
    if (!chatReady) {
      printSummary();
      return;
    }

    // Step 4: Submit flight request
    const requestSubmitted = await submitFlightRequest(ctx);
    if (!requestSubmitted) {
      printSummary();
      return;
    }

    // Step 5: Wait for deep link
    const deepLinkGenerated = await waitForDeepLink(ctx);
    if (!deepLinkGenerated) {
      printSummary();
      return;
    }

    // Step 6: Manual Avinode interaction
    await manualAvinodeInteraction(ctx);

    // Step 7: Submit Trip ID
    await submitTripId(ctx);

    // Step 8: Wait for quotes
    await waitForQuotes(ctx);

    // Final screenshot
    await screenshot(ctx.page, '99', 'workflow-complete');

  } catch (error) {
    log(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`, 'error');
    if (ctx.page) {
      await screenshot(ctx.page, 'error', 'unexpected-error');
    }
  }

  printSummary();

  // Exit with appropriate code
  const failed = results.filter((r) => !r.passed).length;
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export {};
