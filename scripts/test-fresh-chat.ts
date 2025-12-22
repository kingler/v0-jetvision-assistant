/**
 * Start a fresh chat and test the deep link workflow
 */
import { chromium } from 'playwright';

async function testFreshChat() {
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

  console.log('Current URL:', page.url());

  // Click "+ New" button to start fresh
  console.log('Clicking "+ New" button...');
  await page.click('button:has-text("New")');
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'screenshots/fresh-01-new-chat.png', fullPage: true });
  console.log('Screenshot 1: New chat started');

  // Type the flight request
  const input = page.locator('input[placeholder*="Type your message"]');
  await input.fill('I need a flight from KTEB to KVNY for 4 passengers on January 20, 2025');

  await page.screenshot({ path: 'screenshots/fresh-02-typed.png', fullPage: true });
  console.log('Screenshot 2: Message typed');

  // Submit
  await page.click('button[type="submit"]');
  console.log('Message submitted, waiting for response...');

  await page.screenshot({ path: 'screenshots/fresh-03-submitted.png', fullPage: true });
  console.log('Screenshot 3: Message submitted');

  // Wait for the response with progress checks
  let deepLinkFound = false;
  for (let i = 0; i < 24; i++) {  // 24 x 5 seconds = 2 minutes max
    await page.waitForTimeout(5000);

    await page.screenshot({ path: `screenshots/fresh-04-progress-${String(i+1).padStart(2, '0')}.png`, fullPage: true });

    const pageText = await page.evaluate(() => document.body.innerText);

    // Check for deep link
    const hasDeepLink = pageText.includes('marketplace.avinode') ||
                        pageText.includes('Open in Avinode') ||
                        pageText.includes('Goto Avinode') ||
                        pageText.includes('atrip-');

    // Check workflow state
    const creatingTrip = pageText.includes('Creating Trip');
    const awaitingSelection = pageText.includes('Awaiting Selection');

    console.log(`Progress ${(i+1)*5}s: Creating=${creatingTrip}, Awaiting=${awaitingSelection}, DeepLink=${hasDeepLink}`);

    if (hasDeepLink) {
      console.log('✅ Deep link found!');
      deepLinkFound = true;
      break;
    }

    // Check if response is complete (no longer loading)
    const hasLoading = await page.$('[class*="animate-spin"], [class*="loading"]');
    const hasStep3InProgress = pageText.includes('Step 3') && pageText.includes('in-progress');

    // If we see step 3 content appearing without a spinner on step 2
    if (awaitingSelection && !creatingTrip) {
      console.log('Step 3 active, checking for deep link UI...');
    }
  }

  // Final screenshot
  await page.screenshot({ path: 'screenshots/fresh-05-final.png', fullPage: true });
  console.log('Screenshot 5: Final state');

  if (deepLinkFound) {
    console.log('\n✅ SUCCESS: Deep link workflow completed!');
  } else {
    console.log('\n⚠️ Deep link not visible after 2 minutes');
  }

  await browser.close();
}

testFreshChat().catch(console.error);

export {};
