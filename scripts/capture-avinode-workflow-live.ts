/**
 * Live Avinode Workflow Capture Script
 *
 * Connects to Chrome debug session and captures the complete workflow
 * with proper waiting and network interception.
 *
 * Usage:
 *   npx tsx scripts/capture-avinode-workflow-live.ts
 */

import { chromium, Page, Request, Response } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const CHROME_DEBUG_PORT = 9222;
const SCREENSHOTS_DIR = path.join(process.cwd(), 'test-results', 'avinode-live-capture');

// Ensure output directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

interface APILog {
  timestamp: string;
  type: 'request' | 'response';
  method: string;
  url: string;
  status?: number;
  body?: string;
  toolCalls?: string[];
  tripData?: unknown;
}

const apiLogs: APILog[] = [];

async function screenshot(page: Page, name: string): Promise<void> {
  const ts = Date.now();
  const filepath = path.join(SCREENSHOTS_DIR, `${ts}-${name}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 ${name}`);
}

async function main(): Promise<void> {
  console.log('\n🚀 AVINODE LIVE WORKFLOW CAPTURE');
  console.log('================================\n');

  // Connect to Chrome
  const browser = await chromium.connectOverCDP(`http://localhost:${CHROME_DEBUG_PORT}`);
  const context = browser.contexts()[0] || await browser.newContext();
  const page = context.pages()[0] || await context.newPage();

  console.log('✅ Connected to Chrome\n');

  // Set up comprehensive network interception
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = request.url();

    console.log(`📤 ${request.method()} ${url}`);

    // Log request body for POST
    if (request.method() === 'POST') {
      try {
        const postData = request.postData();
        if (postData) {
          const body = JSON.parse(postData);
          console.log(`   Request body: ${JSON.stringify(body).slice(0, 200)}...`);
          apiLogs.push({
            timestamp: new Date().toISOString(),
            type: 'request',
            method: request.method(),
            url,
            body: postData,
          });
        }
      } catch {}
    }

    // Continue the request
    const response = await route.fetch();
    const status = response.status();

    console.log(`📥 ${status} ${url}`);

    // Log response body
    try {
      const responseBody = await response.text();

      // Parse SSE responses
      if (url.includes('/api/chat')) {
        const lines = responseBody.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.tool_calls) {
              console.log(`   🔧 Tool calls: ${data.tool_calls.map((t: {name: string}) => t.name).join(', ')}`);
              for (const tc of data.tool_calls) {
                if (tc.result) {
                  console.log(`      ${tc.name} result: ${JSON.stringify(tc.result).slice(0, 300)}`);
                }
              }
            }
            if (data.trip_data) {
              console.log(`   ✈️ trip_data: ${JSON.stringify(data.trip_data)}`);
            }
            if (data.rfp_data) {
              console.log(`   📋 rfp_data: ${JSON.stringify(data.rfp_data)}`);
            }
          } catch {}
        }
      }

      apiLogs.push({
        timestamp: new Date().toISOString(),
        type: 'response',
        method: request.method(),
        url,
        status,
        body: responseBody.slice(0, 5000),
      });

      // Fulfill with original response
      await route.fulfill({ response });
    } catch (e) {
      console.log(`   ⚠️ Error reading response: ${e}`);
      await route.fulfill({ response });
    }
  });

  // Navigate to home page
  console.log('📍 Navigating to app...');
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  await screenshot(page, '01-initial');

  // Check if authenticated
  if (page.url().includes('sign-in')) {
    console.log('❌ Not authenticated - please sign in first');
    await screenshot(page, '01-auth-required');
    return;
  }

  // Click the first suggested action to start a new chat
  console.log('\n📝 Starting new chat with flight request...');

  // Look for the chat input - more specific selector
  const chatInput = page.locator('input[placeholder*="Type your message"], textarea[placeholder*="Type your message"], input[placeholder*="start a new chat"], textarea');

  console.log('   Looking for chat input...');
  const inputCount = await chatInput.count();
  console.log(`   Found ${inputCount} potential inputs`);

  if (inputCount > 0 && await chatInput.first().isVisible({ timeout: 5000 })) {
    const flightRequest = 'I need a private jet from Teterboro (KTEB) to Los Angeles (KLAX) for 6 passengers on January 25th, 2025';

    console.log(`   Typing: "${flightRequest}"`);
    await chatInput.first().fill(flightRequest);
    await screenshot(page, '02-message-typed');

    // Find send button and click - look for the teal/cyan send button
    const sendButton = page.locator('button:has(svg[class*="lucide-send"]), button[type="submit"], button.bg-teal-500, button[class*="teal"]').first();

    // Try clicking send button first, then fallback to Enter
    let sent = false;
    if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   Clicking send button...');
      await sendButton.click();
      sent = true;
    }

    if (!sent) {
      // Look for any button near the input
      const anyButton = page.locator('button').filter({ hasText: /send/i }).first();
      if (await anyButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('   Clicking button with "send" text...');
        await anyButton.click();
        sent = true;
      }
    }

    if (!sent) {
      console.log('   Pressing Enter to submit...');
      await chatInput.first().press('Enter');
    }

    await screenshot(page, '03-message-sent');

    // Wait for the response with progressive screenshots
    console.log('\n⏳ Waiting for response (taking screenshots every 5s)...');

    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(5000);
      await screenshot(page, `04-progress-${(i + 1) * 5}s`);

      // Check if typing indicator is gone (response complete)
      const isTyping = await page.locator('.animate-spin, [class*="loading"]').isVisible().catch(() => false);
      if (!isTyping && i > 0) {
        console.log('   Response appears complete');
        break;
      }
    }

    // Final capture
    await screenshot(page, '05-final');

    // Check for deep link elements
    console.log('\n🔍 Checking for deep link UI elements...');

    const checks = [
      { name: 'DeepLinkPrompt', selector: '[data-testid="avinode-deep-link-prompt"]' },
      { name: 'DeepLinkButton', selector: '[data-testid="avinode-deep-link-button"]' },
      { name: 'AvinodeLink', selector: 'a[href*="avinode"]' },
      { name: 'TripIDInput', selector: '[data-testid="trip-id-input"]' },
      { name: 'ActionRequired', selector: '[data-testid="trip-id-action-required"]' },
      { name: 'WorkflowProgress', selector: '[data-testid="workflow-progress"]' },
    ];

    for (const check of checks) {
      const visible = await page.locator(check.selector).isVisible().catch(() => false);
      console.log(`   ${visible ? '✅' : '❌'} ${check.name}`);

      if (visible && check.name === 'AvinodeLink') {
        const href = await page.locator(check.selector).first().getAttribute('href');
        console.log(`      URL: ${href}`);
      }
    }

  } else {
    console.log('❌ Chat input not found');
  }

  // Save API logs
  const logPath = path.join(SCREENSHOTS_DIR, 'api-logs.json');
  fs.writeFileSync(logPath, JSON.stringify(apiLogs, null, 2));
  console.log(`\n📄 API logs saved to: ${logPath}`);

  console.log(`\n📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);
  console.log('\n✅ Capture complete!\n');
}

main().catch(console.error);
