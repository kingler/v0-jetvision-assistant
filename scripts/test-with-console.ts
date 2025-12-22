/**
 * Test with console logging to debug the issue
 */
import { chromium } from 'playwright';

async function testWithConsole() {
  console.log('Connecting to Chrome...');

  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];

  if (!context) {
    console.log('No browser context found');
    await browser.close();
    return;
  }

  const pages = context.pages();
  let page = pages.find(p => p.url().includes('localhost:3000'));

  if (!page) {
    page = await context.newPage();
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  }

  // Set up console listener
  page.on('console', msg => {
    const text = msg.text();
    // Filter for relevant logs
    if (text.includes('trip') || text.includes('deep') || text.includes('tool') ||
        text.includes('SSE') || text.includes('streaming') || text.includes('error') ||
        text.includes('Error') || text.includes('status') || text.includes('step')) {
      console.log(`[BROWSER] ${msg.type()}: ${text}`);
    }
  });

  page.on('pageerror', error => {
    console.log(`[BROWSER ERROR] ${error.message}`);
  });

  console.log('Listening for console output...');

  // Click "+ New" to start fresh
  await page.click('button:has-text("New")');
  await page.waitForTimeout(1000);

  // Type and submit
  const input = page.locator('input[placeholder*="Type your message"]');
  await input.fill('I need a flight from KTEB to KVNY for 4 passengers on January 20, 2025');
  await page.click('button[type="submit"]');

  console.log('Message submitted, monitoring console...');

  // Wait and capture console output
  await page.waitForTimeout(30000);

  // Take screenshot
  await page.screenshot({ path: 'screenshots/console-test.png', fullPage: true });
  console.log('Screenshot saved');

  await browser.close();
}

testWithConsole().catch(console.error);

export {};
