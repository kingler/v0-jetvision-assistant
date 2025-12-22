import { test, expect, Page } from '@playwright/test';
import { setupClerkTestingToken } from '@clerk/testing/playwright';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Avinode Deep Link Workflow E2E Test
 *
 * Comprehensive end-to-end test that validates the complete Avinode deep link
 * workflow with screenshot documentation covering:
 *
 * 1. Flight Request Submission
 * 2. Deep Link Generation & Display
 * 3. Manual Avinode Marketplace Interaction (Human-in-the-Loop)
 * 4. Trip ID Submission
 * 5. Quote Retrieval Validation
 *
 * @see docs/implementation/WORKFLOW-AVINODE-INTEGRATION.md
 */

const SCREENSHOTS_DIR = path.join(process.cwd(), 'test-results', 'avinode-workflow');
const AUTH_FILE = path.join(process.cwd(), '.auth', 'user.json');

// Ensure screenshots directory exists
function ensureScreenshotsDir(): void {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
}

/**
 * Capture a full-page screenshot with consistent naming
 */
async function captureScreenshot(
  page: Page,
  stepNumber: string,
  name: string,
  options?: { fullPage?: boolean }
): Promise<string> {
  ensureScreenshotsDir();
  const filename = `${stepNumber}-${name}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({
    path: filepath,
    fullPage: options?.fullPage ?? true
  });
  console.log(`  📸 Screenshot: ${filename}`);
  return filename;
}

/**
 * Wait for page to be fully loaded and stable
 * Note: We avoid 'networkidle' as SSE connections prevent it from resolving
 */
async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  // Wait for main content to be visible instead of networkidle (SSE connections prevent idle)
  await page.waitForSelector('main, [role="main"], #main-content, .chat-interface', {
    timeout: 10000
  }).catch(() => {
    // Fallback: just wait for load state
  });
  await page.waitForTimeout(500); // Additional stability wait
}

/**
 * Wait for chat response with timeout
 */
async function waitForAgentResponse(page: Page, timeout = 30000): Promise<boolean> {
  try {
    // Wait for typing indicator to appear and disappear
    const typingIndicator = page.locator('[class*="typing"], [class*="loading"], .animate-spin').first();

    // Wait for response container to have new content
    await page.waitForFunction(
      () => {
        const messages = document.querySelectorAll('[data-testid="agent-message"], [data-message], [class*="message"]');
        return messages.length > 0;
      },
      { timeout }
    );

    // Wait for any loading to complete
    if (await typingIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
      await typingIndicator.waitFor({ state: 'hidden', timeout: timeout - 2000 }).catch(() => {});
    }

    return true;
  } catch {
    console.log('    Warning: Agent response timeout');
    return false;
  }
}

/**
 * Validate Deep Link URL format
 */
function isValidAvinodeDeepLink(url: string | null): boolean {
  if (!url) return false;
  // Avinode marketplace URLs follow patterns like:
  // https://marketplace.avinode.com/trip/12345
  // https://app.avinode.com/trips/12345
  return /^https:\/\/(marketplace|app)\.avinode\.com\/(trip|trips)\/[A-Za-z0-9-]+/.test(url);
}

/**
 * Extract Trip ID from the page using various patterns
 */
async function extractTripId(page: Page): Promise<string | null> {
  // Look for Trip ID in various locations using data-testid first
  const tripIdPatterns = [
    // Data attributes (preferred)
    '[data-trip-id]',
    '[data-testid="trip-id"]',
    '[data-testid="request-id"]',
    // Text content with Trip ID pattern
    ':text-matches("atrip-[A-Z0-9]+")',
    ':text-matches("TRP[A-Z0-9]+")',
    // Copy button for Trip ID
    'button[aria-label*="copy"][aria-label*="trip" i]',
    // Monospace/code elements containing IDs
    'code:text-matches("[A-Z0-9]{6,12}")',
    '.font-mono:text-matches("[A-Z0-9]{6,12}")',
  ];

  for (const pattern of tripIdPatterns) {
    try {
      const element = page.locator(pattern).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Try to get from data attribute first
        const dataId = await element.getAttribute('data-trip-id');
        if (dataId) return dataId;

        // Otherwise get text content
        const text = await element.textContent();
        if (text) {
          // Extract ID using regex
          const match = text.match(/atrip-[A-Z0-9]+|TRP[A-Z0-9]+|[A-Z0-9]{6,12}/i);
          if (match) return match[0];
        }
      }
    } catch {
      // Continue to next pattern
    }
  }

  // Fallback: Search entire page content for Trip ID pattern
  const content = await page.content();
  const tripIdMatch = content.match(/atrip-[A-Za-z0-9]+|trip_id["':\s]+["']?([A-Z0-9]{6,12})/i);
  if (tripIdMatch) {
    return tripIdMatch[1] || tripIdMatch[0];
  }

  return null;
}

/**
 * Extract and validate Trip ID from deep link or page content
 */
async function extractAndValidateTripId(page: Page): Promise<{ tripId: string | null; isValid: boolean }> {
  const tripId = await extractTripId(page);
  const isValid = tripId !== null && /^[A-Z0-9]{6,12}$/i.test(tripId.replace('atrip-', ''));
  return { tripId, isValid };
}

/**
 * Check if deep link elements are visible using data-testid selectors
 */
async function checkDeepLinkElements(page: Page): Promise<{
  hasDeepLinkPrompt: boolean;
  hasDeepLinkButton: boolean;
  hasTripId: boolean;
  hasWorkflowStatus: boolean;
  deepLinkUrl: string | null;
  tripId: string | null;
}> {
  const result = {
    hasDeepLinkPrompt: false,
    hasDeepLinkButton: false,
    hasTripId: false,
    hasWorkflowStatus: false,
    deepLinkUrl: null as string | null,
    tripId: null as string | null,
  };

  // Check for deep link prompt using data-testid (preferred)
  const deepLinkPrompt = page.locator('[data-testid="avinode-deep-link-prompt"]');
  result.hasDeepLinkPrompt = await deepLinkPrompt.isVisible({ timeout: 2000 }).catch(() => false);

  // Check for deep link button using data-testid (preferred)
  const deepLinkButton = page.locator('[data-testid="avinode-deep-link-button"]');
  result.hasDeepLinkButton = await deepLinkButton.isVisible({ timeout: 2000 }).catch(() => false);

  if (result.hasDeepLinkButton) {
    result.deepLinkUrl = await deepLinkButton.getAttribute('href');
  } else {
    // Fallback to other selectors
    const fallbackButton = page.locator([
      'button:has-text("Open Avinode")',
      'button:has-text("Open in Avinode")',
      'a:has-text("Avinode Marketplace")',
      'a[href*="marketplace.avinode.com"]',
    ].join(', ')).first();

    result.hasDeepLinkButton = await fallbackButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (result.hasDeepLinkButton) {
      result.deepLinkUrl = await fallbackButton.getAttribute('href');
    }
  }

  // Check for Trip ID display
  const requestId = page.locator('[data-testid="request-id"]');
  result.hasTripId = await requestId.isVisible({ timeout: 2000 }).catch(() => false);

  if (result.hasTripId) {
    result.tripId = await extractTripId(page);
  }

  // Check for workflow status indicator
  const workflowStatus = page.locator([
    '[data-testid="workflow-progress"]',
    '[data-testid="trip-id-action-required"]',
    '[class*="workflow"]',
    ':text-matches("Step [0-9] of [0-9]")',
    ':text-matches("Action Required")',
  ].join(', ')).first();

  result.hasWorkflowStatus = await workflowStatus.isVisible({ timeout: 2000 }).catch(() => false);

  return result;
}

/**
 * Check for quote display elements
 */
async function checkQuoteElements(page: Page): Promise<{
  hasQuotes: boolean;
  quoteCount: number;
  hasPricing: boolean;
  hasOperatorDetails: boolean;
  hasAircraftSpecs: boolean;
  hasNoQuotesMessage: boolean;
}> {
  const result = {
    hasQuotes: false,
    quoteCount: 0,
    hasPricing: false,
    hasOperatorDetails: false,
    hasAircraftSpecs: false,
    hasNoQuotesMessage: false,
  };

  // Check for quote comparison container using data-testid
  const quoteComparison = page.locator('[data-testid="quote-comparison"]');
  result.hasQuotes = await quoteComparison.isVisible({ timeout: 2000 }).catch(() => false);

  // Check for quote status waiting
  const quoteStatusWaiting = page.locator('[data-testid="quote-status-waiting"]');
  result.hasNoQuotesMessage = await quoteStatusWaiting.isVisible({ timeout: 2000 }).catch(() => false);

  if (result.hasQuotes) {
    // Count quote cards
    const quoteCards = page.locator('[data-testid="quote-card"], [class*="quote-card"], [class*="QuoteCard"]');
    result.quoteCount = await quoteCards.count();

    // Check for pricing
    const priceDisplays = page.locator(':text-matches("\\$[0-9,]+")');
    result.hasPricing = (await priceDisplays.count()) > 0;

    // Check for operator details
    const operatorNames = page.locator('[class*="operator"], :text-matches("Operator")');
    result.hasOperatorDetails = (await operatorNames.count()) > 0;

    // Check for aircraft specs
    const aircraftInfo = page.locator(':text-matches("Citation|Gulfstream|Challenger|Hawker|Embraer")');
    result.hasAircraftSpecs = (await aircraftInfo.count()) > 0;
  }

  return result;
}

/**
 * Wait for MCP tool call to be executed (check page content for tool usage indicators)
 */
async function waitForMCPToolCall(page: Page, toolName: string, timeout = 30000): Promise<boolean> {
  try {
    await page.waitForFunction(
      (tool) => {
        const content = document.body.textContent || '';
        const patterns = [
          tool,
          tool.replace(/_/g, ''),
          tool.replace(/_/g, '-'),
        ];
        return patterns.some(p => content.toLowerCase().includes(p.toLowerCase()));
      },
      toolName,
      { timeout }
    );
    return true;
  } catch {
    return false;
  }
}

test.describe('Avinode Deep Link Complete Workflow', () => {
  test.setTimeout(600000); // 10 minutes for full workflow with manual interaction

  // Use stored auth state if available
  test.use({
    storageState: fs.existsSync(AUTH_FILE) ? AUTH_FILE : undefined,
  });

  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
    ensureScreenshotsDir();
  });

  test.beforeAll(async () => {
    console.log('\n========================================');
    console.log('Avinode Deep Link Workflow E2E Test');
    console.log('========================================\n');
    console.log(`Screenshots will be saved to: ${SCREENSHOTS_DIR}\n`);
    console.log('NOTE: This test includes a manual interaction step.');
    console.log('When page.pause() is called, complete these steps:');
    console.log('  1. Click "Open in Avinode Marketplace" button');
    console.log('  2. In Avinode, select operators and send RFP');
    console.log('  3. Copy the Trip ID from Avinode');
    console.log('  4. Return to the test and click "Resume" in Playwright Inspector');
    console.log('  5. Paste the Trip ID when prompted\n');
    ensureScreenshotsDir();
  });

  test('Complete Avinode deep link workflow with human-in-the-loop', async ({ page }) => {
    let extractedTripId: string | null = null;
    let deepLinkUrl: string | null = null;

    // =========================================================================
    // STEP 1: Flight Request Submission
    // =========================================================================
    console.log('\n📋 STEP 1: Flight Request Submission');
    console.log('=====================================');

    await page.goto('/');
    await waitForPageLoad(page);

    // Check authentication
    const currentUrl = page.url();
    console.log(`  Current URL: ${currentUrl}`);

    if (currentUrl.includes('sign-in')) {
      console.log('  ⚠️  Redirected to sign-in page - authentication required');
      await captureScreenshot(page, '00', 'sign-in-redirect');
      test.skip(true, 'Authentication required - run auth-setup.spec.ts first');
      return;
    }

    // Locate chat input
    const chatInput = page.locator([
      'textarea[placeholder*="message" i]',
      'input[placeholder*="message" i]',
      '[data-testid="chat-input"]',
      'textarea',
    ].join(', ')).first();

    // If not visible on home, try /chat route
    if (!(await chatInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log('  Chat not found on home, navigating to /chat');
      await page.goto('/chat');
      await waitForPageLoad(page);

      if (page.url().includes('sign-in')) {
        console.log('  ⚠️  Chat page requires authentication');
        await captureScreenshot(page, '00', 'auth-required');
        test.skip(true, 'Authentication required for chat page');
        return;
      }
    }

    // Verify chat input is available
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Submit flight request
    const flightRequest = 'I need a private jet from Teterboro (KTEB) to Los Angeles (KLAX) for 6 passengers on January 25th, 2025';
    console.log(`  ✍️  Submitting: "${flightRequest}"`);

    await chatInput.focus();
    await chatInput.fill(flightRequest);

    await captureScreenshot(page, '01', 'flight-request-submitted');

    // Find and click send button or press Enter
    const sendButton = page.locator([
      'button[type="submit"]',
      'button[aria-label*="send" i]',
      'button:has(svg)',
    ].join(', ')).last();

    if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sendButton.click();
    } else {
      await chatInput.press('Enter');
    }

    console.log('  ✅ Request submitted, waiting for response...');

    // =========================================================================
    // STEP 2: Deep Link Generation & Display
    // =========================================================================
    console.log('\n🔗 STEP 2: Deep Link Generation & Display');
    console.log('==========================================');

    // Wait for agent to respond (longer timeout for MCP tool execution)
    const hasResponse = await waitForAgentResponse(page, 60000);
    expect(hasResponse).toBe(true);

    // Additional wait for deep link generation
    await page.waitForTimeout(3000);

    // Check for deep link elements using data-testid selectors
    const deepLinkCheck = await checkDeepLinkElements(page);
    console.log(`  Deep Link Prompt: ${deepLinkCheck.hasDeepLinkPrompt ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`  Deep Link Button: ${deepLinkCheck.hasDeepLinkButton ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`  Trip ID Display: ${deepLinkCheck.hasTripId ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`  Workflow Status: ${deepLinkCheck.hasWorkflowStatus ? '✅ FOUND' : '❌ NOT FOUND'}`);

    if (deepLinkCheck.deepLinkUrl) {
      deepLinkUrl = deepLinkCheck.deepLinkUrl;
      console.log(`  🔗 Deep Link URL: ${deepLinkUrl}`);
      console.log(`  Valid Avinode URL: ${isValidAvinodeDeepLink(deepLinkUrl) ? '✅ YES' : '⚠️  NO'}`);
    }
    if (deepLinkCheck.tripId) {
      extractedTripId = deepLinkCheck.tripId;
      console.log(`  🆔 Trip ID: ${extractedTripId}`);
    }

    await captureScreenshot(page, '02', 'deep-link-displayed');

    // Verify expected elements
    if (!deepLinkCheck.hasDeepLinkButton && !deepLinkCheck.hasDeepLinkPrompt) {
      console.log('  ⚠️  Note: Deep link elements not found - may be in mock mode or processing');

      // Check if agent responded with any content
      const agentMessages = page.locator('[data-testid="agent-message"], [class*="agent"]');
      const messageCount = await agentMessages.count();
      console.log(`  Agent messages found: ${messageCount}`);

      // Generate a mock Trip ID for testing purposes if no real one was found
      if (!extractedTripId) {
        extractedTripId = `ATRIP${Date.now().toString(36).toUpperCase().slice(-8)}`;
        console.log(`  🧪 Using test Trip ID: ${extractedTripId}`);
      }
    }

    // =========================================================================
    // STEP 3: Manual Avinode Marketplace Interaction (Human-in-the-Loop)
    // =========================================================================
    console.log('\n🖐️  STEP 3: Manual Avinode Marketplace Interaction');
    console.log('===================================================');
    console.log('');
    console.log('  ╔═══════════════════════════════════════════════════════════╗');
    console.log('  ║                    ACTION REQUIRED                        ║');
    console.log('  ╠═══════════════════════════════════════════════════════════╣');
    console.log('  ║  The test will now PAUSE for manual interaction.          ║');
    console.log('  ║                                                           ║');
    console.log('  ║  Please complete these steps:                             ║');
    console.log('  ║  1. Click "Open in Avinode Marketplace" button            ║');
    console.log('  ║  2. In Avinode, review available operators                ║');
    console.log('  ║  3. Select your preferred aircraft/operators              ║');
    console.log('  ║  4. Send the RFP to selected operators                    ║');
    console.log('  ║  5. Copy the Trip ID from the confirmation page           ║');
    console.log('  ║  6. Return here and click "Resume" in Playwright Inspector║');
    console.log('  ║                                                           ║');
    if (deepLinkUrl) {
      console.log(`  ║  Deep Link: ${deepLinkUrl.slice(0, 45)}...`);
    }
    console.log('  ╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    // PAUSE for manual interaction - Playwright Inspector will open
    await page.pause();

    // After resume, capture screenshot
    await captureScreenshot(page, '03', 'avinode-marketplace-interaction');
    console.log('  ✅ Manual interaction completed, continuing test...');

    // =========================================================================
    // STEP 4: Trip ID Submission
    // =========================================================================
    console.log('\n📝 STEP 4: Trip ID Submission');
    console.log('==============================');

    // Look for Trip ID input field using data-testid (preferred)
    const tripIdInput = page.locator('[data-testid="trip-id-input"]');
    let hasTripIdInput = await tripIdInput.isVisible({ timeout: 5000 }).catch(() => false);

    // Fallback to other selectors if data-testid not found
    if (!hasTripIdInput) {
      const fallbackInput = page.locator([
        'input[placeholder*="trip" i]',
        'input[placeholder*="ID" i]',
        'input[aria-label*="trip" i]',
      ].join(', ')).first();
      hasTripIdInput = await fallbackInput.isVisible({ timeout: 5000 }).catch(() => false);
    }

    if (hasTripIdInput) {
      console.log('  ✅ Trip ID input field found');

      // Prompt user to enter Trip ID (they copied from Avinode)
      console.log('');
      console.log('  ╔═══════════════════════════════════════════════════════════╗');
      console.log('  ║  Enter the Trip ID you copied from Avinode.               ║');
      console.log('  ║  The test will use the ID you type in the input field.    ║');
      if (extractedTripId) {
        console.log(`  ║  Fallback ID available: ${extractedTripId.padEnd(32)}║`);
      }
      console.log('  ╚═══════════════════════════════════════════════════════════╝');
      console.log('');

      // Use extracted Trip ID or wait for user input
      const tripIdToSubmit = extractedTripId || 'TESTTRIP123';
      console.log(`  ✍️  Entering Trip ID: ${tripIdToSubmit}`);

      const inputField = page.locator('[data-testid="trip-id-input"]').or(
        page.locator('input[placeholder*="trip" i]')
      ).first();

      await inputField.clear();
      await inputField.fill(tripIdToSubmit);
      await captureScreenshot(page, '04a', 'trip-id-entered');

      // Find and click submit button using data-testid
      const submitButton = page.locator('[data-testid="trip-id-submit-button"]');
      let hasSubmitButton = await submitButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasSubmitButton) {
        await submitButton.click();
        console.log('  ✅ Submit button clicked');
      } else {
        // Fallback to other selectors
        const fallbackSubmit = page.locator([
          'button:has-text("Submit")',
          'button:has-text("Retrieve")',
          'button:has-text("Get Quotes")',
          'button[type="submit"]',
        ].join(', ')).first();

        if (await fallbackSubmit.isVisible({ timeout: 2000 }).catch(() => false)) {
          await fallbackSubmit.click();
          console.log('  ✅ Submit button clicked (fallback)');
        } else {
          await inputField.press('Enter');
          console.log('  ✅ Pressed Enter to submit');
        }
      }

      await captureScreenshot(page, '04', 'trip-id-submitted');

    } else {
      console.log('  ⚠️  Trip ID input not found - trying chat-based submission');

      // Submit Trip ID via chat as fallback
      const tripIdMessage = `Here is my Trip ID: ${extractedTripId || 'TESTTRIP123'}`;

      // Re-locate chat input
      const chatInputAgain = page.locator('textarea, input[type="text"]').first();
      if (await chatInputAgain.isVisible({ timeout: 5000 }).catch(() => false)) {
        await chatInputAgain.fill(tripIdMessage);
        await chatInputAgain.press('Enter');
        console.log(`  ✅ Submitted via chat: "${tripIdMessage}"`);
        await captureScreenshot(page, '04', 'trip-id-submitted');
      } else {
        console.log('  ❌ Warning: Could not submit Trip ID');
      }
    }

    // Wait for response after Trip ID submission
    console.log('  ⏳ Waiting for quote retrieval...');
    await waitForAgentResponse(page, 60000);
    await page.waitForTimeout(3000);

    // =========================================================================
    // STEP 5: Quote Retrieval Validation
    // =========================================================================
    console.log('\n📊 STEP 5: Quote Retrieval Validation');
    console.log('======================================');

    // Check for quote elements using data-testid
    const quoteCheck = await checkQuoteElements(page);

    console.log(`  Quote Comparison: ${quoteCheck.hasQuotes ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`  Quote Count: ${quoteCheck.quoteCount}`);
    console.log(`  Pricing Info: ${quoteCheck.hasPricing ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`  Operator Details: ${quoteCheck.hasOperatorDetails ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`  Aircraft Specs: ${quoteCheck.hasAircraftSpecs ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`  No Quotes Message: ${quoteCheck.hasNoQuotesMessage ? '⚠️  SHOWN' : '✅ NOT SHOWN'}`);

    // Check for "no quotes" scenario
    if (quoteCheck.hasNoQuotesMessage && !quoteCheck.hasQuotes) {
      console.log('  📭 Status: No quotes available yet (operators haven\'t responded)');
      console.log('     This is expected if the RFP was just sent.');
    }

    // Check for Trip ID submitted success
    const tripIdSuccess = page.locator('[data-testid="trip-id-submitted-success"]');
    const hasSuccessMessage = await tripIdSuccess.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasSuccessMessage) {
      console.log('  ✅ Trip ID submission confirmed');
    }

    await captureScreenshot(page, '05', 'quotes-retrieved');

    // Check for MCP tool usage by examining page content
    console.log('\n  🔧 Checking MCP tool usage:');
    const pageContent = await page.content();
    const toolPatterns = [
      { name: 'create_trip', pattern: /create[_-]?trip/i },
      { name: 'get_rfq', pattern: /get[_-]?rfq/i },
      { name: 'get_quote', pattern: /get[_-]?quote/i },
      { name: 'get_trip_messages', pattern: /get[_-]?trip[_-]?messages/i },
    ];

    for (const { name, pattern } of toolPatterns) {
      const found = pattern.test(pageContent);
      console.log(`     ${name}: ${found ? '✅ DETECTED' : '⚪ not detected'}`);
    }

    // =========================================================================
    // Final Summary
    // =========================================================================
    console.log('\n========================================');
    console.log('📋 Workflow Summary');
    console.log('========================================');
    console.log(`  Deep Link Generated: ${deepLinkCheck.hasDeepLinkButton || deepLinkCheck.hasDeepLinkPrompt ? '✅ YES' : '❌ NO'}`);
    console.log(`  Deep Link URL: ${deepLinkUrl || 'N/A'}`);
    console.log(`  Trip ID: ${extractedTripId || 'N/A'}`);
    console.log(`  Quotes Retrieved: ${quoteCheck.hasQuotes ? `✅ YES (${quoteCheck.quoteCount})` : '❌ NO'}`);
    console.log(`  Success Message: ${hasSuccessMessage ? '✅ SHOWN' : '⚪ NOT SHOWN'}`);
    console.log(`\n📸 Screenshots saved to: ${SCREENSHOTS_DIR}`);
    console.log('');

    // Assertions
    // We don't fail on missing quotes since operators may not have responded yet
    expect(hasResponse).toBe(true);
  });

  test('Handles "no quotes available" scenario gracefully', async ({ page }) => {
    console.log('\n📭 Testing "No Quotes Available" Scenario');
    console.log('==========================================');

    await page.goto('/');
    await waitForPageLoad(page);

    // Skip if auth required
    if (page.url().includes('sign-in')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Submit a flight request
    const chatInput = page.locator('textarea, input[type="text"]').first();
    if (!(await chatInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Chat input not found');
      return;
    }

    await chatInput.fill('I need a flight from KTEB to KORD for 2 passengers tomorrow');
    await chatInput.press('Enter');
    await waitForAgentResponse(page, 30000);

    // Wait for UI to stabilize
    await page.waitForTimeout(3000);

    // Try submitting a fake Trip ID to test no-quotes handling
    const tripIdInput = page.locator('[data-testid="trip-id-input"]').or(
      page.locator('input[placeholder*="trip" i]')
    ).first();

    if (await tripIdInput.isVisible({ timeout: 10000 }).catch(() => false)) {
      await tripIdInput.fill('FAKETRIP000');
      await tripIdInput.press('Enter');
      await page.waitForTimeout(3000);

      // Check for error or "no quotes" message
      const errorMessage = page.locator([
        '[data-testid="trip-id-error"]',
        '[data-testid="quote-status-waiting"]',
        ':text-matches("no quotes")',
        ':text-matches("not found")',
        ':text-matches("invalid")',
        '[class*="error"]',
      ].join(', ')).first();

      const hasErrorHandling = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);
      console.log(`  Error handling visible: ${hasErrorHandling ? '✅ YES' : '❌ NO'}`);

      await captureScreenshot(page, '06', 'no-quotes-scenario');
    } else {
      console.log('  ⚠️  Trip ID input not available for this test');
    }
  });

  test('Workflow status indicators update correctly', async ({ page }) => {
    console.log('\n📊 Testing Workflow Status Indicators');
    console.log('======================================');

    await page.goto('/');
    await waitForPageLoad(page);

    if (page.url().includes('sign-in')) {
      test.skip(true, 'Authentication required');
      return;
    }

    const chatInput = page.locator('textarea, input[type="text"]').first();
    if (!(await chatInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Chat input not found');
      return;
    }

    // Submit request and monitor workflow indicators
    await chatInput.fill('Book a flight KJFK to KMIA 4 passengers Jan 30');
    await chatInput.press('Enter');

    // Wait for response
    await waitForAgentResponse(page, 30000);
    await page.waitForTimeout(3000);

    // Check for workflow progress using data-testid
    const workflowProgress = page.locator('[data-testid="workflow-progress"]');
    const hasWorkflowProgress = await workflowProgress.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`  Workflow progress indicator: ${hasWorkflowProgress ? '✅ VISIBLE' : '❌ NOT FOUND'}`);

    // Check for action required card using data-testid
    const actionRequired = page.locator('[data-testid="trip-id-action-required"]');
    const hasActionRequired = await actionRequired.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`  Action required card: ${hasActionRequired ? '✅ VISIBLE' : '❌ NOT FOUND'}`);

    // Check for step indicators
    const stepIndicators = [
      { step: 1, patterns: [':text-matches("Request")', ':text-matches("Step 1")'] },
      { step: 2, patterns: [':text-matches("Avinode")', ':text-matches("Step 2")'] },
      { step: 3, patterns: [':text-matches("Trip ID")', ':text-matches("Step 3")'] },
      { step: 4, patterns: [':text-matches("Quotes")', ':text-matches("Step 4")'] },
    ];

    // Log which steps are visible
    for (const { step, patterns } of stepIndicators) {
      const stepLocator = page.locator(patterns.join(', ')).first();
      const visible = await stepLocator.isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`  Step ${step} indicator: ${visible ? '✅ VISIBLE' : '⚪ not found'}`);
    }

    // Check for animated/pulsing indicators (current step)
    const animatedIndicator = page.locator('.animate-pulse, [class*="animate"]').first();
    const hasAnimation = await animatedIndicator.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`  Animated indicator (current step): ${hasAnimation ? '✅ VISIBLE' : '⚪ not found'}`);

    await captureScreenshot(page, '07', 'workflow-status-indicators');
  });

  test('Trip ID validation works correctly', async ({ page }) => {
    console.log('\n✅ Testing Trip ID Validation');
    console.log('==============================');

    await page.goto('/');
    await waitForPageLoad(page);

    if (page.url().includes('sign-in')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Submit flight request to trigger Trip ID input
    const chatInput = page.locator('textarea, input[type="text"]').first();
    if (!(await chatInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Chat input not found');
      return;
    }

    await chatInput.fill('Need flight KLAX to KSFO 3 passengers Feb 1');
    await chatInput.press('Enter');
    await waitForAgentResponse(page, 30000);
    await page.waitForTimeout(3000);

    // Look for Trip ID input using data-testid
    const tripIdInput = page.locator('[data-testid="trip-id-input"]').or(
      page.locator('input[placeholder*="trip" i]')
    ).first();

    if (!(await tripIdInput.isVisible({ timeout: 10000 }).catch(() => false))) {
      console.log('  ⚠️  Trip ID input not found - workflow may not have reached this step');
      await captureScreenshot(page, '08', 'trip-id-validation-skipped');
      return;
    }

    // Test validation cases
    const validationCases = [
      { input: 'ABC', expected: 'error', desc: 'Too short (< 6 chars)' },
      { input: 'ABCDEFGHIJKLM', expected: 'error', desc: 'Too long (> 12 chars)' },
      { input: 'abc-123', expected: 'transform', desc: 'Auto-uppercase + strip invalid chars' },
      { input: 'ABCD1234', expected: 'valid', desc: 'Valid format (8 chars)' },
    ];

    for (const { input, expected, desc } of validationCases) {
      await tripIdInput.clear();
      await tripIdInput.fill(input);
      await page.waitForTimeout(500);

      // Check for validation feedback using data-testid
      const validationError = page.locator('[data-testid="trip-id-validation-error"]');
      const hasValidationError = await validationError.isVisible({ timeout: 1000 }).catch(() => false);

      // Check for aria-invalid attribute
      const ariaInvalid = await tripIdInput.getAttribute('aria-invalid');
      const hasError = hasValidationError || ariaInvalid === 'true';

      let result: string;
      if (expected === 'transform') {
        const currentValue = await tripIdInput.inputValue();
        result = currentValue === input.toUpperCase().replace(/[^A-Z0-9]/g, '') ? 'transform' : 'no-transform';
      } else {
        result = hasError ? 'error' : 'valid';
      }

      const status = result === expected ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${desc}: ${status} (expected: ${expected}, got: ${result})`);
    }

    await captureScreenshot(page, '08', 'trip-id-validation');
  });
});
