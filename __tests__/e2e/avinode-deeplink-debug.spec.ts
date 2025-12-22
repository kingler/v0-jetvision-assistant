/**
 * Avinode Deep Link Debug Test
 *
 * Specialized E2E test that connects to an existing Chrome debug session
 * (running with --remote-debugging-port=9222) to investigate why the
 * deep link UI is not rendering in Step 2 of the Avinode workflow.
 *
 * This test provides detailed diagnostic information about:
 * 1. MCP tool call execution (create_trip)
 * 2. SSE response parsing
 * 3. Deep link data extraction
 * 4. UI component rendering
 *
 * @see docs/implementation/WORKFLOW-AVINODE-INTEGRATION.md
 */

import { test, expect, chromium, Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'test-results', 'avinode-deeplink-debug');
const CHROME_DEBUG_PORT = 9222;

// Ensure screenshots directory exists
function ensureScreenshotsDir(): void {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
}

/**
 * Capture screenshot with timestamp and step info
 */
async function debugScreenshot(
  page: Page,
  step: string,
  name: string
): Promise<string> {
  ensureScreenshotsDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${step}-${name}-${timestamp}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`    📸 Screenshot saved: ${filename}`);
  return filepath;
}

/**
 * Log detailed DOM inspection for debugging
 */
async function inspectDOM(page: Page, selector: string, label: string): Promise<void> {
  console.log(`\n  🔍 DOM Inspection: ${label}`);
  console.log(`     Selector: ${selector}`);

  const elements = await page.locator(selector).all();
  console.log(`     Found: ${elements.length} element(s)`);

  for (let i = 0; i < Math.min(elements.length, 3); i++) {
    const el = elements[i];
    try {
      const tagName = await el.evaluate((e) => e.tagName.toLowerCase());
      const className = await el.evaluate((e) => e.className);
      const textContent = await el.evaluate((e) => e.textContent?.slice(0, 100));
      const isVisible = await el.isVisible();
      console.log(`     [${i}] <${tagName} class="${className?.toString().slice(0, 50)}...">`);
      console.log(`         Visible: ${isVisible}`);
      console.log(`         Text: "${textContent?.trim()}..."`);
    } catch (e) {
      console.log(`     [${i}] Error inspecting: ${e}`);
    }
  }
}

/**
 * Monitor network requests for API calls
 */
interface APICallLog {
  method: string;
  url: string;
  status: number;
  responsePreview: string;
  toolCalls?: string[];
  tripData?: Record<string, unknown>;
  rfpData?: Record<string, unknown>;
}

async function setupNetworkMonitoring(page: Page): Promise<APICallLog[]> {
  const apiCalls: APICallLog[] = [];

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/chat') || url.includes('/api/avinode')) {
      try {
        const status = response.status();
        let responseText = '';
        let toolCalls: string[] = [];
        let tripData: Record<string, unknown> | undefined;
        let rfpData: Record<string, unknown> | undefined;

        try {
          responseText = await response.text();

          // Parse SSE data for tool calls
          const sseLines = responseText.split('\n').filter((l) => l.startsWith('data: '));
          for (const line of sseLines) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.tool_calls) {
                toolCalls = data.tool_calls.map((tc: { name: string }) => tc.name);
              }
              if (data.trip_data) {
                tripData = data.trip_data;
              }
              if (data.rfp_data) {
                rfpData = data.rfp_data;
              }
            } catch {
              // Skip non-JSON lines
            }
          }
        } catch {
          responseText = '[Unable to read response body]';
        }

        apiCalls.push({
          method: response.request().method(),
          url,
          status,
          responsePreview: responseText.slice(0, 500),
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          tripData,
          rfpData,
        });
      } catch (e) {
        console.log(`    ⚠️ Error logging API call: ${e}`);
      }
    }
  });

  return apiCalls;
}

/**
 * Check for deep link UI components with detailed logging
 */
async function checkDeepLinkUIDebug(page: Page): Promise<{
  found: boolean;
  details: Record<string, boolean | string | null>;
}> {
  const details: Record<string, boolean | string | null> = {};

  // Check DeepLinkPrompt component
  const deepLinkPromptSelectors = [
    '[data-testid="avinode-deep-link-prompt"]',
    '[data-testid="deep-link-prompt"]',
    '.deep-link-prompt',
  ];

  for (const selector of deepLinkPromptSelectors) {
    const visible = await page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false);
    details[`DeepLinkPrompt (${selector})`] = visible;
  }

  // Check DeepLink button
  const deepLinkButtonSelectors = [
    '[data-testid="avinode-deep-link-button"]',
    'a[href*="marketplace.avinode.com"]',
    'button:has-text("Open Avinode")',
    'button:has-text("Open in Avinode")',
    'a:has-text("Avinode Marketplace")',
  ];

  for (const selector of deepLinkButtonSelectors) {
    const visible = await page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false);
    details[`DeepLinkButton (${selector})`] = visible;

    if (visible) {
      const href = await page.locator(selector).getAttribute('href').catch(() => null);
      details['DeepLink URL'] = href;
    }
  }

  // Check TripIdInput component (shows when deep link should be visible)
  const tripIdInputSelectors = [
    '[data-testid="trip-id-input"]',
    '[data-testid="trip-id-action-required"]',
    'input[placeholder*="trip" i]',
  ];

  for (const selector of tripIdInputSelectors) {
    const visible = await page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false);
    details[`TripIdInput (${selector})`] = visible;
  }

  // Check workflow indicators
  const workflowSelectors = [
    '[data-testid="workflow-progress"]',
    '.workflow-visualization',
    ':text-matches("Step [0-9] of [0-9]")',
  ];

  for (const selector of workflowSelectors) {
    const visible = await page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false);
    details[`Workflow (${selector})`] = visible;
  }

  // Check for showDeepLink flag in message data
  const agentMessages = await page.locator('[data-testid="agent-message"]').all();
  details['Agent Messages Count'] = agentMessages.length.toString();

  // Check if any message has deep link data
  for (let i = 0; i < agentMessages.length; i++) {
    const msg = agentMessages[i];
    const hasDeepLinkChild =
      (await msg.locator('[data-testid*="deep-link"]').count()) > 0 ||
      (await msg.locator('a[href*="avinode"]').count()) > 0;
    details[`Message[${i}] has deep link child`] = hasDeepLinkChild;
  }

  const found = Object.values(details).some(
    (v) => v === true || (typeof v === 'string' && v.includes('avinode'))
  );

  return { found, details };
}

/**
 * Check chat-interface.tsx SSE parsing behavior
 */
async function analyzeSSEResponse(page: Page): Promise<{
  hasToolCalls: boolean;
  hasCreateTrip: boolean;
  hasTripData: boolean;
  hasDeepLink: boolean;
  tripId: string | null;
  deepLink: string | null;
  rawData: string | null;
}> {
  // Inject a script to capture the last SSE response data
  const responseData = await page.evaluate(() => {
    // Access window to check for any stored response data
    const win = window as Window & {
      __lastSSEData?: string;
      __lastToolCalls?: Array<{ name: string; result?: unknown }>;
      __lastTripData?: { trip_id?: string; deep_link?: string };
    };

    return {
      lastSSEData: win.__lastSSEData || null,
      lastToolCalls: win.__lastToolCalls || null,
      lastTripData: win.__lastTripData || null,
    };
  });

  // Parse page content for response data
  const pageContent = await page.content();

  const hasToolCalls = pageContent.includes('tool_calls') || pageContent.includes('create_trip');
  const hasCreateTrip = pageContent.includes('create_trip');
  const hasTripData = pageContent.includes('trip_data') || pageContent.includes('trip_id');
  const hasDeepLink =
    pageContent.includes('deep_link') || pageContent.includes('marketplace.avinode.com');

  // Extract trip ID and deep link from page content
  const tripIdMatch = pageContent.match(/trip_id["']?\s*:\s*["']([^"']+)["']/);
  const deepLinkMatch = pageContent.match(
    /deep_link["']?\s*:\s*["'](https:\/\/[^"']+)["']/
  );

  return {
    hasToolCalls,
    hasCreateTrip,
    hasTripData,
    hasDeepLink,
    tripId: tripIdMatch?.[1] || null,
    deepLink: deepLinkMatch?.[1] || null,
    rawData: responseData.lastSSEData || null,
  };
}

test.describe('Avinode Deep Link Debug - Chrome Debug Session', () => {
  let browser: ReturnType<typeof chromium.connectOverCDP> extends Promise<infer T> ? T : never;
  let context: BrowserContext;
  let page: Page;
  let apiCalls: APICallLog[];

  test.beforeAll(async () => {
    console.log('\n' + '='.repeat(70));
    console.log('🔧 AVINODE DEEP LINK DEBUG TEST');
    console.log('    Connecting to Chrome Debug Session on port ' + CHROME_DEBUG_PORT);
    console.log('='.repeat(70));

    // Check if Chrome debug session is available
    try {
      const response = await fetch(`http://localhost:${CHROME_DEBUG_PORT}/json/version`);
      const data = await response.json();
      console.log(`\n  ✅ Chrome debug session found`);
      console.log(`     Browser: ${data.Browser}`);
      console.log(`     Protocol: ${data['Protocol-Version']}`);
    } catch {
      console.log('\n  ❌ Chrome debug session not found!');
      console.log('     Start Chrome with: --remote-debugging-port=9222');
      throw new Error('Chrome debug session not available on port 9222');
    }

    // Connect to existing Chrome instance
    browser = await chromium.connectOverCDP(`http://localhost:${CHROME_DEBUG_PORT}`);
    const contexts = browser.contexts();
    context = contexts[0] || (await browser.newContext());
    const pages = context.pages();
    page = pages[0] || (await context.newPage());

    // Set up network monitoring
    apiCalls = await setupNetworkMonitoring(page);

    ensureScreenshotsDir();
  });

  test.afterAll(async () => {
    // Don't close browser - it's a debug session
    console.log('\n  📁 Screenshots saved to:', SCREENSHOTS_DIR);
    console.log('  Note: Browser connection released but Chrome remains open');
  });

  test('Step 1: Verify Flight Request Parsing', async () => {
    console.log('\n' + '-'.repeat(50));
    console.log('📋 STEP 1: Verify Flight Request Parsing');
    console.log('-'.repeat(50));

    // Navigate to chat interface
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Check if redirected to sign-in
    const currentUrl = page.url();
    console.log(`  Current URL: ${currentUrl}`);

    if (currentUrl.includes('sign-in')) {
      console.log('  ⚠️ Redirected to sign-in - need to authenticate first');
      await debugScreenshot(page, '01', 'auth-required');
      test.skip(true, 'Authentication required');
      return;
    }

    await debugScreenshot(page, '01', 'initial-state');

    // Find chat input
    const chatInputSelectors = [
      'textarea[placeholder*="message" i]',
      'input[placeholder*="message" i]',
      '[data-testid="chat-input"]',
      'textarea',
      'input[type="text"]',
    ];

    let chatInput = null;
    for (const selector of chatInputSelectors) {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        chatInput = el;
        console.log(`  ✅ Chat input found: ${selector}`);
        break;
      }
    }

    if (!chatInput) {
      console.log('  ❌ Chat input not found');
      await inspectDOM(page, 'input, textarea', 'All inputs');
      test.fail(true, 'Chat input not found');
      return;
    }

    // Submit realistic flight request
    const flightRequest =
      'I need a private jet from Teterboro (KTEB) to Los Angeles (KLAX) for 6 passengers on January 25th, 2025';
    console.log(`\n  ✍️ Submitting flight request:`);
    console.log(`     "${flightRequest}"`);

    await chatInput.fill(flightRequest);
    await debugScreenshot(page, '01', 'request-entered');

    // Submit
    const sendButton = page
      .locator(
        [
          'button[type="submit"]',
          'button[aria-label*="send" i]',
          'button:has(svg[class*="send" i])',
        ].join(', ')
      )
      .first();

    if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sendButton.click();
      console.log('  ✅ Send button clicked');
    } else {
      await chatInput.press('Enter');
      console.log('  ✅ Enter pressed');
    }

    await debugScreenshot(page, '01', 'request-submitted');

    // Wait for response
    console.log('\n  ⏳ Waiting for agent response...');
    await page.waitForTimeout(5000);

    // Check for user message displayed
    const userMessage = page.locator('text="Teterboro"').first();
    expect(await userMessage.isVisible({ timeout: 10000 })).toBe(true);
    console.log('  ✅ User message displayed');
  });

  test('Step 2: Debug Deep Link Display Issue (CRITICAL)', async () => {
    console.log('\n' + '-'.repeat(50));
    console.log('🔗 STEP 2: Debug Deep Link Display Issue (CRITICAL)');
    console.log('-'.repeat(50));

    // Wait for agent response
    console.log('\n  ⏳ Waiting for complete agent response (up to 60s)...');

    // Wait for typing indicator to appear and disappear
    const typingIndicator = page.locator('.animate-spin, [class*="loading"], [class*="typing"]');
    let hasTypingIndicator = await typingIndicator.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasTypingIndicator) {
      console.log('  🔄 Agent is typing...');
      await typingIndicator
        .waitFor({ state: 'hidden', timeout: 60000 })
        .catch(() => console.log('  ⚠️ Typing indicator timeout'));
    }

    await page.waitForTimeout(3000);
    await debugScreenshot(page, '02', 'after-response');

    // Log API calls
    console.log('\n  📡 API Calls captured:');
    for (const call of apiCalls) {
      console.log(`     ${call.method} ${call.url} → ${call.status}`);
      if (call.toolCalls) {
        console.log(`        Tool calls: ${call.toolCalls.join(', ')}`);
      }
      if (call.tripData) {
        console.log(`        Trip data: ${JSON.stringify(call.tripData)}`);
      }
      if (call.rfpData) {
        console.log(`        RFP data: ${JSON.stringify(call.rfpData)}`);
      }
    }

    // Check for create_trip tool call
    const hasCreateTripCall = apiCalls.some((c) => c.toolCalls?.includes('create_trip'));
    console.log(`\n  🔧 create_trip tool called: ${hasCreateTripCall ? '✅ YES' : '❌ NO'}`);

    // Check for trip_data in response
    const tripDataCall = apiCalls.find((c) => c.tripData);
    if (tripDataCall?.tripData) {
      console.log(`  📦 trip_data received:`);
      console.log(`     trip_id: ${tripDataCall.tripData.trip_id || 'N/A'}`);
      console.log(`     deep_link: ${tripDataCall.tripData.deep_link || 'N/A'}`);
    } else {
      console.log(`  ❌ trip_data NOT found in API response`);
    }

    // Analyze SSE response
    const sseAnalysis = await analyzeSSEResponse(page);
    console.log('\n  📊 SSE Response Analysis:');
    console.log(`     Has tool_calls: ${sseAnalysis.hasToolCalls}`);
    console.log(`     Has create_trip: ${sseAnalysis.hasCreateTrip}`);
    console.log(`     Has trip_data: ${sseAnalysis.hasTripData}`);
    console.log(`     Has deep_link: ${sseAnalysis.hasDeepLink}`);
    console.log(`     Trip ID: ${sseAnalysis.tripId || 'NOT FOUND'}`);
    console.log(`     Deep Link: ${sseAnalysis.deepLink || 'NOT FOUND'}`);

    // Check Deep Link UI components
    console.log('\n  🖥️ Deep Link UI Component Check:');
    const uiCheck = await checkDeepLinkUIDebug(page);

    for (const [key, value] of Object.entries(uiCheck.details)) {
      const icon = value === true ? '✅' : value === false ? '❌' : '📄';
      console.log(`     ${icon} ${key}: ${value}`);
    }

    // Detailed DOM inspection for missing components
    if (!uiCheck.found) {
      console.log('\n  🔬 Detailed DOM Inspection (Deep Link Components Missing):');

      await inspectDOM(page, '[data-testid="agent-message"]', 'Agent Messages');
      await inspectDOM(page, '[class*="deep-link"], [class*="DeepLink"]', 'Deep Link Classes');
      await inspectDOM(page, 'a[href*="avinode"]', 'Avinode Links');
      await inspectDOM(page, '[data-testid*="trip"]', 'Trip-related TestIDs');

      // Check message content for expected keywords
      const messageContent = await page
        .locator('[data-testid="agent-message"]')
        .allTextContents()
        .catch(() => []);
      console.log('\n  📝 Agent Message Contents:');
      for (let i = 0; i < messageContent.length; i++) {
        const preview = messageContent[i].slice(0, 200).replace(/\n/g, ' ');
        console.log(`     [${i}] "${preview}..."`);

        // Check for expected keywords
        const keywords = ['trip', 'avinode', 'marketplace', 'link', 'deep', 'click', 'open'];
        const foundKeywords = keywords.filter((k) =>
          messageContent[i].toLowerCase().includes(k)
        );
        if (foundKeywords.length > 0) {
          console.log(`         Keywords found: ${foundKeywords.join(', ')}`);
        }
      }
    }

    await debugScreenshot(page, '02', 'deep-link-check');

    // CRITICAL: Assert deep link should be visible
    console.log('\n  ⚠️ STEP 2 VERIFICATION:');
    if (!uiCheck.found) {
      console.log('     ❌ FAIL: Deep link UI components NOT rendered');
      console.log('     Expected: DeepLinkPrompt or AvinodeDeepLinks component visible');
      console.log('     Actual: No deep link UI found');

      // Diagnose the issue
      console.log('\n  🔍 DIAGNOSIS:');
      if (!hasCreateTripCall) {
        console.log('     ISSUE: create_trip MCP tool was NOT called');
        console.log('     CAUSE: API route may not be detecting flight details correctly');
        console.log('     FIX: Check /api/chat/route.ts tool detection logic');
      } else if (!tripDataCall?.tripData) {
        console.log('     ISSUE: create_trip called but trip_data not in SSE response');
        console.log('     CAUSE: API route may not be including trip_data in SSE stream');
        console.log('     FIX: Check /api/chat/route.ts responseData construction');
      } else if (tripDataCall?.tripData && !uiCheck.found) {
        console.log('     ISSUE: trip_data received but UI not rendering');
        console.log('     CAUSE: chat-interface.tsx may not be setting showDeepLink=true');
        console.log('     FIX: Check chat-interface.tsx SSE parsing for trip_data');
      }
    } else {
      console.log('     ✅ PASS: Deep link UI is visible');
    }

    // Don't fail the test - we're debugging
    // expect(uiCheck.found).toBe(true);
  });

  test('Step 3: Verify Deep Link URL Format', async () => {
    console.log('\n' + '-'.repeat(50));
    console.log('🔗 STEP 3: Verify Deep Link URL Format');
    console.log('-'.repeat(50));

    // Look for any avinode links
    const avinodeLinks = page.locator('a[href*="avinode"], a[href*="marketplace"]');
    const linkCount = await avinodeLinks.count();

    console.log(`  Found ${linkCount} Avinode link(s)`);

    if (linkCount > 0) {
      for (let i = 0; i < linkCount; i++) {
        const href = await avinodeLinks.nth(i).getAttribute('href');
        console.log(`  Link ${i + 1}: ${href}`);

        // Validate URL format
        if (href) {
          const isValid = /^https:\/\/(marketplace|app)\.avinode\.com\/(trip|trips)\/[A-Za-z0-9-]+/.test(href);
          console.log(`     Valid format: ${isValid ? '✅ YES' : '❌ NO'}`);

          // Extract trip ID from URL
          const tripIdMatch = href.match(/\/(trip|trips)\/([A-Za-z0-9-]+)/);
          if (tripIdMatch) {
            console.log(`     Trip ID in URL: ${tripIdMatch[2]}`);
          }
        }
      }
    } else {
      console.log('  ⚠️ No Avinode links found in DOM');

      // Check page content for deep link references
      const pageContent = await page.content();
      const deepLinkMatches = pageContent.match(
        /https:\/\/marketplace\.avinode\.com\/trip\/[A-Za-z0-9-]+/g
      );
      if (deepLinkMatches) {
        console.log(`  📄 Deep links found in page content: ${deepLinkMatches.length}`);
        for (const match of deepLinkMatches.slice(0, 3)) {
          console.log(`     ${match}`);
        }
      }
    }

    await debugScreenshot(page, '03', 'deep-link-url-check');
  });

  test('Step 4: Test Trip ID Input Flow', async () => {
    console.log('\n' + '-'.repeat(50));
    console.log('📝 STEP 4: Test Trip ID Input Flow');
    console.log('-'.repeat(50));

    // Check for Trip ID input
    const tripIdInputSelectors = [
      '[data-testid="trip-id-input"]',
      'input[placeholder*="trip" i]',
      'input[placeholder*="ID" i]',
      'input[aria-label*="trip" i]',
    ];

    let tripIdInput = null;
    for (const selector of tripIdInputSelectors) {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        tripIdInput = el;
        console.log(`  ✅ Trip ID input found: ${selector}`);
        break;
      }
    }

    if (!tripIdInput) {
      console.log('  ⚠️ Trip ID input not visible yet');
      await inspectDOM(page, 'input', 'All input fields');

      // Check if we need to manually trigger the input to appear
      const actionRequiredCard = page.locator('[data-testid="trip-id-action-required"]');
      if (await actionRequiredCard.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('  ✅ Action Required card is visible');
      } else {
        console.log('  ❌ Action Required card not visible');
      }
    } else {
      // Test entering a Trip ID
      const testTripId = 'ATRIP12345678';
      console.log(`  ✍️ Entering test Trip ID: ${testTripId}`);

      await tripIdInput.fill(testTripId);
      await debugScreenshot(page, '04', 'trip-id-entered');

      // Find submit button
      const submitButton = page
        .locator(
          [
            '[data-testid="trip-id-submit-button"]',
            'button:has-text("Submit")',
            'button:has-text("Retrieve")',
          ].join(', ')
        )
        .first();

      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('  ✅ Submit button found');
      } else {
        console.log('  ⚠️ Submit button not found');
      }
    }

    await debugScreenshot(page, '04', 'trip-id-flow');
  });

  test('Step 5: Verify Quote Retrieval Components', async () => {
    console.log('\n' + '-'.repeat(50));
    console.log('📊 STEP 5: Verify Quote Retrieval Components');
    console.log('-'.repeat(50));

    // Check for quote-related UI elements
    const quoteSelectors = [
      '[data-testid="quote-comparison"]',
      '[data-testid="quote-card"]',
      '[data-testid="quote-status-waiting"]',
      '[class*="quote"]',
      ':text-matches("\\$[0-9,]+")',
    ];

    for (const selector of quoteSelectors) {
      const visible = await page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false);
      const count = await page.locator(selector).count().catch(() => 0);
      console.log(`  ${selector}: ${visible ? '✅ visible' : '❌ hidden'} (${count} found)`);
    }

    await debugScreenshot(page, '05', 'quote-components');
  });

  test('Generate Debug Report', async () => {
    console.log('\n' + '='.repeat(70));
    console.log('📋 DEBUG REPORT SUMMARY');
    console.log('='.repeat(70));

    // Collect all diagnostic information
    const uiCheck = await checkDeepLinkUIDebug(page);
    const sseAnalysis = await analyzeSSEResponse(page);

    console.log('\n  🔧 MCP Tool Execution:');
    const hasCreateTrip = apiCalls.some((c) => c.toolCalls?.includes('create_trip'));
    console.log(`     create_trip called: ${hasCreateTrip ? '✅ YES' : '❌ NO'}`);

    console.log('\n  📦 Response Data:');
    const tripDataCall = apiCalls.find((c) => c.tripData);
    console.log(`     trip_data present: ${tripDataCall ? '✅ YES' : '❌ NO'}`);
    console.log(`     deep_link present: ${sseAnalysis.hasDeepLink ? '✅ YES' : '❌ NO'}`);

    console.log('\n  🖥️ UI Components:');
    console.log(`     Deep Link visible: ${uiCheck.found ? '✅ YES' : '❌ NO'}`);

    // Identify the failure point
    console.log('\n  🎯 FAILURE POINT ANALYSIS:');
    if (!hasCreateTrip) {
      console.log('     ❌ FAILURE AT: API route tool detection');
      console.log('     FILE: app/api/chat/route.ts');
      console.log('     LINE: ~389-438 (flight detail detection)');
      console.log('     ISSUE: Flight request not triggering create_trip tool');
    } else if (!tripDataCall) {
      console.log('     ❌ FAILURE AT: SSE response construction');
      console.log('     FILE: app/api/chat/route.ts');
      console.log('     LINE: ~657-661 (responseData.trip_data)');
      console.log('     ISSUE: trip_data not included in SSE stream');
    } else if (!uiCheck.found) {
      console.log('     ❌ FAILURE AT: Frontend SSE parsing / UI rendering');
      console.log('     FILE: components/chat-interface.tsx');
      console.log('     LINE: ~293-350 (SSE data parsing for trip_data)');
      console.log('     LINE: ~374-377 (showDeepLink flag on message)');
      console.log('     ISSUE: trip_data received but showDeepLink not set or component not rendered');
    } else {
      console.log('     ✅ ALL STEPS PASSED');
    }

    // Save debug report to file
    const report = {
      timestamp: new Date().toISOString(),
      apiCalls: apiCalls.map((c) => ({
        method: c.method,
        url: c.url,
        status: c.status,
        toolCalls: c.toolCalls,
        hasTripData: !!c.tripData,
        hasRfpData: !!c.rfpData,
      })),
      sseAnalysis,
      uiCheck: uiCheck.details,
      failurePoint: !hasCreateTrip
        ? 'API_TOOL_DETECTION'
        : !tripDataCall
          ? 'SSE_RESPONSE'
          : !uiCheck.found
            ? 'UI_RENDERING'
            : 'NONE',
    };

    const reportPath = path.join(SCREENSHOTS_DIR, 'debug-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n  📄 Debug report saved: ${reportPath}`);

    await debugScreenshot(page, '99', 'final-state');

    console.log('\n' + '='.repeat(70));
  });
});
