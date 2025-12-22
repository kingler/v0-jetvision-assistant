/**
 * Check current page state and look for deep link elements
 */
import { chromium } from 'playwright';

async function checkPage() {
  console.log('Connecting to Chrome...');

  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];

  if (!context) {
    console.log('No browser context found');
    await browser.close();
    return;
  }

  const pages = context.pages();
  const page = pages.find(p => p.url().includes('localhost:3000'));

  if (!page) {
    console.log('No page on localhost:3000');
    await browser.close();
    return;
  }

  console.log('Current URL:', page.url());

  // Take screenshot
  await page.screenshot({ path: 'screenshots/current-check.png', fullPage: true });
  console.log('Screenshot saved: screenshots/current-check.png');

  // Check for various UI elements
  const checks = [
    { name: 'Deep link button', selector: 'button:has-text("Open in Avinode"), button:has-text("Goto Avinode"), a[href*="marketplace.avinode"]' },
    { name: 'Trip ID display', selector: 'text=/atrip-/' },
    { name: 'Awaiting Selection step', selector: 'text="Awaiting Selection"' },
    { name: 'Creating Trip step', selector: 'text="Creating Trip"' },
    { name: 'Step 3 in-progress', selector: '[data-step="3"][data-status="in-progress"]' },
    { name: 'Workflow visualization', selector: 'text="Flight Search Progress"' },
  ];

  for (const check of checks) {
    const element = await page.$(check.selector);
    console.log(`${check.name}: ${element ? 'FOUND' : 'not found'}`);
  }

  // Get page text to understand state
  const pageText = await page.evaluate(() => document.body.innerText);

  // Check for key strings
  const keyStrings = [
    'marketplace.avinode',
    'Open in Avinode',
    'Goto Avinode',
    'atrip-',
    'Creating Trip',
    'Awaiting Selection',
    'Step 2',
    'Step 3',
    'deep_link',
    'Searching Aircraft',
  ];

  console.log('\n=== Key Text Checks ===');
  for (const str of keyStrings) {
    console.log(`"${str}": ${pageText.includes(str) ? 'FOUND' : 'not found'}`);
  }

  // Look for data attributes
  const workflowStatus = await page.evaluate(() => {
    const sidebar = document.querySelector('[class*="sidebar"]');
    const status = document.querySelector('[data-status]');
    const step = document.querySelector('[data-step]');
    return {
      sidebarText: sidebar?.textContent?.substring(0, 200),
      statusAttr: status?.getAttribute('data-status'),
      stepAttr: step?.getAttribute('data-step'),
    };
  });

  console.log('\n=== Workflow Status ===');
  console.log('Sidebar preview:', workflowStatus.sidebarText);
  console.log('Status attr:', workflowStatus.statusAttr);
  console.log('Step attr:', workflowStatus.stepAttr);

  await browser.close();
}

checkPage().catch(console.error);

export {};
