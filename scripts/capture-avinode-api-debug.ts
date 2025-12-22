/**
 * Avinode API Debug Script
 *
 * Connects to Chrome debug session and captures:
 * 1. All API requests/responses to /api/chat and /api/avinode
 * 2. Screenshots at each step
 * 3. Detailed logging of MCP tool calls and responses
 *
 * Usage:
 *   npx tsx scripts/capture-avinode-api-debug.ts
 *
 * Prerequisites:
 *   - Chrome running with --remote-debugging-port=9222
 *   - Dev server running on localhost:3000
 */

import { chromium, Page, Response } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const CHROME_DEBUG_PORT = 9222;
const SCREENSHOTS_DIR = path.join(process.cwd(), 'test-results', 'avinode-api-debug');
const BASE_URL = 'http://localhost:3000';

// Ensure output directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

interface APICallLog {
  timestamp: string;
  method: string;
  url: string;
  status: number;
  requestBody?: unknown;
  responseBody?: unknown;
  toolCalls?: Array<{ name: string; result?: unknown }>;
  tripData?: unknown;
  rfpData?: unknown;
  error?: string;
}

const apiCalls: APICallLog[] = [];

/**
 * Save screenshot with timestamp
 */
async function screenshot(page: Page, name: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`  📸 Screenshot: ${filename}`);
  return filepath;
}

/**
 * Parse SSE response to extract tool calls and data
 */
function parseSSEResponse(responseText: string): {
  toolCalls: Array<{ name: string; result?: unknown }>;
  tripData: unknown | null;
  rfpData: unknown | null;
  content: string;
} {
  const result = {
    toolCalls: [] as Array<{ name: string; result?: unknown }>,
    tripData: null as unknown | null,
    rfpData: null as unknown | null,
    content: '',
  };

  const lines = responseText.split('\n').filter((l) => l.startsWith('data: '));

  for (const line of lines) {
    try {
      const data = JSON.parse(line.slice(6));

      if (data.content) {
        result.content += data.content;
      }

      if (data.tool_calls) {
        result.toolCalls = data.tool_calls;
      }

      if (data.trip_data) {
        result.tripData = data.trip_data;
      }

      if (data.rfp_data) {
        result.rfpData = data.rfp_data;
      }
    } catch {
      // Skip non-JSON lines
    }
  }

  return result;
}

/**
 * Set up network monitoring for API calls
 */
function setupNetworkMonitor(page: Page): void {
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/api/chat') || url.includes('/api/avinode') || url.includes('/api/mcp')) {
      console.log(`  📤 REQUEST: ${request.method()} ${url}`);

      try {
        const postData = request.postData();
        if (postData) {
          const body = JSON.parse(postData);
          console.log(`     Body: ${JSON.stringify(body).slice(0, 200)}...`);
        }
      } catch {
        // Not JSON or no body
      }
    }
  });

  page.on('response', async (response: Response) => {
    const url = response.url();
    if (url.includes('/api/chat') || url.includes('/api/avinode') || url.includes('/api/mcp')) {
      const status = response.status();
      console.log(`  📥 RESPONSE: ${status} ${url}`);

      const logEntry: APICallLog = {
        timestamp: new Date().toISOString(),
        method: response.request().method(),
        url,
        status,
      };

      try {
        // Get request body
        const postData = response.request().postData();
        if (postData) {
          logEntry.requestBody = JSON.parse(postData);
        }
      } catch {
        // Ignore
      }

      try {
        const responseText = await response.text();
        logEntry.responseBody = responseText.slice(0, 2000);

        // Parse SSE for tool calls
        if (url.includes('/api/chat')) {
          const parsed = parseSSEResponse(responseText);

          if (parsed.toolCalls.length > 0) {
            logEntry.toolCalls = parsed.toolCalls;
            console.log(`     🔧 Tool calls: ${parsed.toolCalls.map((t) => t.name).join(', ')}`);

            for (const tc of parsed.toolCalls) {
              console.log(`        - ${tc.name}:`);
              if (tc.result) {
                console.log(`          Result: ${JSON.stringify(tc.result).slice(0, 300)}...`);
              }
            }
          }

          if (parsed.tripData) {
            logEntry.tripData = parsed.tripData;
            console.log(`     ✈️ Trip Data: ${JSON.stringify(parsed.tripData)}`);
          }

          if (parsed.rfpData) {
            logEntry.rfpData = parsed.rfpData;
            console.log(`     📋 RFP Data: ${JSON.stringify(parsed.rfpData)}`);
          }
        }
      } catch (e) {
        logEntry.error = `Failed to read response: ${e}`;
        console.log(`     ⚠️ Error reading response: ${e}`);
      }

      apiCalls.push(logEntry);
    }
  });
}

/**
 * Wait for agent response to complete
 */
async function waitForResponse(page: Page, timeout = 60000): Promise<boolean> {
  const startTime = Date.now();

  // Wait for typing indicator to appear
  console.log('  ⏳ Waiting for agent response...');

  try {
    // Wait for loading/typing state
    await page.waitForSelector('.animate-spin, [class*="loading"], [class*="typing"]', {
      timeout: 10000,
    });
    console.log('  🔄 Agent is processing...');

    // Wait for it to disappear (response complete)
    await page.waitForSelector('.animate-spin, [class*="loading"], [class*="typing"]', {
      state: 'hidden',
      timeout: timeout - 10000,
    });
    console.log('  ✅ Agent response complete');
    return true;
  } catch {
    // Check if we got a response anyway
    const elapsed = Date.now() - startTime;
    console.log(`  ⚠️ Response wait timed out after ${elapsed}ms`);
    return false;
  }
}

/**
 * Check for deep link UI elements
 */
async function checkDeepLinkUI(page: Page): Promise<{
  found: boolean;
  details: Record<string, boolean | string | null>;
}> {
  const details: Record<string, boolean | string | null> = {};

  // Check for deep link prompt
  const promptSelectors = [
    '[data-testid="avinode-deep-link-prompt"]',
    '[data-testid="deep-link-prompt"]',
  ];

  for (const sel of promptSelectors) {
    details[`DeepLinkPrompt(${sel})`] = await page
      .locator(sel)
      .isVisible({ timeout: 1000 })
      .catch(() => false);
  }

  // Check for deep link button
  const buttonSelectors = [
    '[data-testid="avinode-deep-link-button"]',
    'a[href*="marketplace.avinode.com"]',
    'button:has-text("Open Avinode")',
    'a:has-text("Avinode Marketplace")',
  ];

  for (const sel of buttonSelectors) {
    const visible = await page
      .locator(sel)
      .first()
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    details[`DeepLinkButton(${sel})`] = visible;

    if (visible) {
      const href = await page.locator(sel).first().getAttribute('href').catch(() => null);
      if (href) {
        details['DeepLink URL'] = href;
      }
    }
  }

  // Check for Trip ID input
  const inputSelectors = [
    '[data-testid="trip-id-input"]',
    '[data-testid="trip-id-action-required"]',
  ];

  for (const sel of inputSelectors) {
    details[`TripIDInput(${sel})`] = await page
      .locator(sel)
      .isVisible({ timeout: 1000 })
      .catch(() => false);
  }

  // Check for workflow progress
  details['WorkflowProgress'] = await page
    .locator('[data-testid="workflow-progress"]')
    .isVisible({ timeout: 1000 })
    .catch(() => false);

  const found = Object.values(details).some(
    (v) => v === true || (typeof v === 'string' && v.includes('avinode'))
  );

  return { found, details };
}

/**
 * Main test function
 */
async function main(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 AVINODE API DEBUG - Capturing Screenshots & API Responses');
  console.log('='.repeat(70));
  console.log(`\n📁 Output directory: ${SCREENSHOTS_DIR}\n`);

  // Connect to Chrome debug session
  console.log('🔗 Connecting to Chrome debug session...');
  const browser = await chromium.connectOverCDP(`http://localhost:${CHROME_DEBUG_PORT}`);
  const contexts = browser.contexts();
  const context = contexts[0] || (await browser.newContext());
  const pages = context.pages();
  const page = pages[0] || (await context.newPage());

  console.log(`  ✅ Connected to Chrome (${pages.length} existing page(s))`);

  // Set up network monitoring
  setupNetworkMonitor(page);

  try {
    // Step 1: Navigate to chat
    console.log('\n' + '-'.repeat(50));
    console.log('📋 STEP 1: Navigate to Chat Interface');
    console.log('-'.repeat(50));

    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log(`  Current URL: ${currentUrl}`);

    if (currentUrl.includes('sign-in')) {
      console.log('  ⚠️ Redirected to sign-in - authentication required');
      await screenshot(page, '01-auth-required');
      console.log('\n❌ Cannot proceed without authentication');
      return;
    }

    await screenshot(page, '01-initial-page');

    // Step 2: Find and fill chat input
    console.log('\n' + '-'.repeat(50));
    console.log('✍️ STEP 2: Submit Flight Request');
    console.log('-'.repeat(50));

    const chatInput = page
      .locator(
        [
          'textarea[placeholder*="message" i]',
          'input[placeholder*="message" i]',
          '[data-testid="chat-input"]',
          'textarea',
        ].join(', ')
      )
      .first();

    if (!(await chatInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      // Try /chat route
      console.log('  Chat input not found, trying /chat route...');
      await page.goto(`${BASE_URL}/chat`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
    }

    const flightRequest =
      'I need a private jet from Teterboro (KTEB) to Los Angeles (KLAX) for 6 passengers on January 25th, 2025';

    console.log(`  ✍️ Entering: "${flightRequest}"`);
    await chatInput.fill(flightRequest);
    await screenshot(page, '02-request-entered');

    // Submit
    const sendButton = page
      .locator(['button[type="submit"]', 'button[aria-label*="send" i]', 'button:has(svg)'].join(', '))
      .last();

    if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sendButton.click();
      console.log('  ✅ Send button clicked');
    } else {
      await chatInput.press('Enter');
      console.log('  ✅ Enter pressed');
    }

    await screenshot(page, '02-request-submitted');

    // Step 3: Wait for response and capture API calls
    console.log('\n' + '-'.repeat(50));
    console.log('📡 STEP 3: Monitor API Response');
    console.log('-'.repeat(50));

    await waitForResponse(page, 60000);
    await page.waitForTimeout(3000);

    await screenshot(page, '03-response-received');

    // Step 4: Check for deep link UI
    console.log('\n' + '-'.repeat(50));
    console.log('🔗 STEP 4: Check Deep Link UI');
    console.log('-'.repeat(50));

    const uiCheck = await checkDeepLinkUI(page);

    console.log('\n  UI Element Check:');
    for (const [key, value] of Object.entries(uiCheck.details)) {
      const icon = value === true ? '✅' : value === false ? '❌' : '📄';
      console.log(`    ${icon} ${key}: ${value}`);
    }

    await screenshot(page, '04-deep-link-check');

    // Step 5: Generate report
    console.log('\n' + '-'.repeat(50));
    console.log('📊 STEP 5: Generate Debug Report');
    console.log('-'.repeat(50));

    // Analyze API calls
    const chatApiCalls = apiCalls.filter((c) => c.url.includes('/api/chat'));
    const hasCreateTrip = chatApiCalls.some((c) => c.toolCalls?.some((t) => t.name === 'create_trip'));
    const hasTripData = chatApiCalls.some((c) => c.tripData);
    const hasRfpData = chatApiCalls.some((c) => c.rfpData);

    console.log('\n  📡 API Analysis:');
    console.log(`    Total /api/chat calls: ${chatApiCalls.length}`);
    console.log(`    create_trip called: ${hasCreateTrip ? '✅ YES' : '❌ NO'}`);
    console.log(`    trip_data in response: ${hasTripData ? '✅ YES' : '❌ NO'}`);
    console.log(`    rfp_data in response: ${hasRfpData ? '✅ YES' : '❌ NO'}`);
    console.log(`    Deep Link UI visible: ${uiCheck.found ? '✅ YES' : '❌ NO'}`);

    // Identify failure point
    console.log('\n  🎯 FAILURE ANALYSIS:');
    if (!hasCreateTrip) {
      console.log('    ❌ FAILURE: create_trip tool NOT called');
      console.log('    CAUSE: Flight request not detected by API route');
      console.log('    FILE: app/api/chat/route.ts (lines 389-438)');
    } else if (!hasTripData && !hasRfpData) {
      console.log('    ❌ FAILURE: No trip_data or rfp_data in response');
      console.log('    CAUSE: Tool result not included in SSE stream');
      console.log('    FILE: app/api/chat/route.ts (lines 657-670)');
    } else if (!uiCheck.found) {
      console.log('    ❌ FAILURE: Data received but UI not rendering');
      console.log('    CAUSE: Frontend not setting showDeepLink flag');
      console.log('    FILE: components/chat-interface.tsx (lines 293-377)');
    } else {
      console.log('    ✅ ALL CHECKS PASSED');
    }

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        createTripCalled: hasCreateTrip,
        tripDataReceived: hasTripData,
        rfpDataReceived: hasRfpData,
        deepLinkUIVisible: uiCheck.found,
      },
      apiCalls: chatApiCalls.map((c) => ({
        timestamp: c.timestamp,
        method: c.method,
        url: c.url,
        status: c.status,
        toolCalls: c.toolCalls?.map((t) => t.name),
        hasTripData: !!c.tripData,
        hasRfpData: !!c.rfpData,
        tripData: c.tripData,
        rfpData: c.rfpData,
      })),
      uiElements: uiCheck.details,
    };

    const reportPath = path.join(SCREENSHOTS_DIR, 'api-debug-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n  📄 Report saved: ${reportPath}`);

    // Take final screenshot
    await screenshot(page, '05-final-state');

    console.log('\n' + '='.repeat(70));
    console.log('✅ DEBUG COMPLETE');
    console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);
    console.log('='.repeat(70) + '\n');
  } catch (error) {
    console.error('\n❌ Error:', error);
    await screenshot(page, 'error-state');
  }

  // Don't close browser - it's a debug session
}

main().catch(console.error);
