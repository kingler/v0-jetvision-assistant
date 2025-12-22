/**
 * Test after fixing the infinite loop - refresh and start fresh
 */
import { chromium } from 'playwright';

async function testAfterFix() {
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
  }

  // Force a hard refresh to reload the JavaScript
  console.log('Refreshing page to load updated code...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Set up console listener for errors
  let errorCount = 0;
  page.on('console', msg => {
    if (msg.type() === 'error' && msg.text().includes('Maximum update depth')) {
      errorCount++;
      if (errorCount <= 3) {
        console.log('[ERROR] Infinite loop still occurring!');
      }
    }
  });

  await page.screenshot({ path: 'screenshots/fix-01-initial.png', fullPage: true });
  console.log('Screenshot 1: Initial state after refresh');

  // Wait to see if infinite loop still occurs
  await page.waitForTimeout(3000);

  if (errorCount > 0) {
    console.log(`❌ Still seeing ${errorCount} infinite loop errors`);
    await page.screenshot({ path: 'screenshots/fix-error.png', fullPage: true });
    await browser.close();
    return;
  }

  console.log('✅ No infinite loop errors detected');

  // Start a new chat
  await page.click('button:has-text("New")');
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'screenshots/fix-02-new-chat.png', fullPage: true });
  console.log('Screenshot 2: New chat');

  // Type and submit
  const input = page.locator('input[placeholder*="Type your message"]');
  await input.fill('I need a flight from KTEB to KVNY for 4 passengers on January 20, 2025');
  await page.click('button[type="submit"]');

  console.log('Message submitted, waiting for response...');

  // Wait for response (up to 60 seconds)
  let deepLinkFound = false;
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(5000);

    const pageText = await page.evaluate(() => document.body.innerText);
    const hasDeepLink = pageText.includes('marketplace.avinode') ||
                        pageText.includes('Open in Avinode') ||
                        pageText.includes('atrip-');

    console.log(`Progress ${(i+1)*5}s: DeepLink=${hasDeepLink}, Errors=${errorCount}`);

    if (hasDeepLink) {
      console.log('✅ Deep link found!');
      deepLinkFound = true;
      break;
    }

    // Check if response completed
    const hasStep3Active = pageText.includes('Awaiting Selection');
    if (hasStep3Active) {
      console.log('Workflow at Step 3');
    }
  }

  await page.screenshot({ path: 'screenshots/fix-03-final.png', fullPage: true });
  console.log('Screenshot 3: Final state');

  if (deepLinkFound) {
    console.log('\\n✅ SUCCESS: Deep link workflow working!');
  } else if (errorCount === 0) {
    console.log('\\n⚠️ No infinite loop, but deep link not visible yet');
  } else {
    console.log('\\n❌ Issues detected');
  }

  await browser.close();
}

testAfterFix().catch(console.error);

export {};
