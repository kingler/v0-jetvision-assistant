/**
 * Quick capture of current state + send new message
 */

import { chromium } from 'playwright';

async function quickCapture() {
  console.log('Connecting to Chrome...');

  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const page = contexts[0].pages().find(p => p.url().includes('localhost:3000')) || contexts[0].pages()[0];

  console.log('Connected to:', page.url());

  // Screenshot current state
  await page.screenshot({ path: 'screenshots/current-state.png', fullPage: true });
  console.log('📸 Captured current state');

  // Get page content to check if deep link exists
  const content = await page.textContent('body') || '';

  console.log('\n=== Page Content Analysis ===');
  console.log('Has "deep link" text:', content.toLowerCase().includes('deep link'));
  console.log('Has "avinode" text:', content.toLowerCase().includes('avinode'));
  console.log('Has "marketplace" text:', content.toLowerCase().includes('marketplace'));
  console.log('Has "atrip-" text:', content.includes('atrip-'));
  console.log('Has "Open in Avinode" text:', content.includes('Open in Avinode'));
  console.log('Has "Your request has been created":', content.includes('Your request has been created'));

  // Check for flight search progress
  console.log('Has "Creating Trip" text:', content.includes('Creating Trip'));
  console.log('Has "Step 2" text:', content.includes('Step 2'));
  console.log('Has "Flight Search" text:', content.includes('Flight Search'));

  // Look for any link elements with avinode
  const avinodeLinks = await page.$$('a[href*="avinode"], a[href*="marketplace"]');
  console.log('\nAvinode links found:', avinodeLinks.length);

  for (const link of avinodeLinks) {
    const href = await link.getAttribute('href');
    const text = await link.textContent();
    console.log(`  - ${text?.trim()}: ${href}`);
  }

  // Look for the deep link prompt component
  const deepLinkPrompt = await page.$('[data-testid="avinode-deep-link-prompt"]');
  console.log('\nDeepLinkPrompt component found:', !!deepLinkPrompt);

  // Look for trip ID input
  const tripIdInput = await page.$('[data-testid="trip-id-action-required"]');
  console.log('TripIDInput component found:', !!tripIdInput);

  // Look for workflow progress
  const workflowProgress = await page.$('[data-testid="workflow-progress"]');
  console.log('WorkflowProgress component found:', !!workflowProgress);

  console.log('\n=== Done ===');
}

quickCapture().catch(console.error);

export {};
