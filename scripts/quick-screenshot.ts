/**
 * Quick screenshot capture via CDP
 */
import { chromium } from 'playwright';

async function capture() {
  console.log('Connecting to Chrome...');

  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();

  if (contexts.length === 0) {
    console.log('No browser contexts found');
    await browser.close();
    return;
  }

  const pages = contexts[0].pages();
  if (pages.length === 0) {
    console.log('No pages found');
    await browser.close();
    return;
  }

  const page = pages[0];
  console.log('Current URL:', page.url());

  // Take screenshot
  await page.screenshot({ path: 'current-state.png', fullPage: true });
  console.log('Screenshot saved: current-state.png');

  // Check for deep link elements
  const deepLinkButton = await page.$('button:has-text("Open in Avinode")');
  const marketplaceLink = await page.$('a[href*="marketplace.avinode"]');
  const tripId = await page.$('text=/atrip-/');

  console.log('Has "Open in Avinode" button:', !!deepLinkButton);
  console.log('Has marketplace link:', !!marketplaceLink);
  console.log('Has trip ID:', !!tripId);

  // Get page text for debugging
  const bodyText = await page.evaluate(() => document.body.innerText);
  const hasDeepLink = bodyText.includes('deep_link') || bodyText.includes('marketplace.avinode');
  const hasCreatingTrip = bodyText.includes('Creating Trip');
  const hasAwaitingSelection = bodyText.includes('Awaiting Selection');

  console.log('Page contains deep_link:', hasDeepLink);
  console.log('Page contains "Creating Trip":', hasCreatingTrip);
  console.log('Page contains "Awaiting Selection":', hasAwaitingSelection);

  await browser.close();
}

capture().catch(console.error);

export {};
