/**
 * Test flight booking workflow and capture screenshot with deep link
 */
import { chromium, Page } from 'playwright';

async function testWorkflow() {
  console.log('Connecting to Chrome via CDP...');

  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0] || await browser.newContext();

  // Create a new page and navigate to the app
  const page = await context.newPage();

  console.log('Navigating to localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  console.log('Current URL:', page.url());

  // Take initial screenshot
  await page.screenshot({ path: 'screenshots/01-initial.png', fullPage: true });
  console.log('Screenshot 1: Initial page');

  // Wait for page to fully load
  await page.waitForTimeout(2000);

  // Find message input - could be input or textarea with placeholder
  const messageInput = await page.$('input[placeholder*="message"], textarea[placeholder*="message"], input[placeholder*="chat"], textarea');
  if (!messageInput) {
    console.log('Trying alternative selectors...');
    const allInputs = await page.$$('input, textarea');
    console.log(`Found ${allInputs.length} input/textarea elements`);

    // Try to find by visible text
    const inputByText = await page.$('input:visible, textarea:visible');
    if (!inputByText) {
      console.log('No visible input found');
      await page.screenshot({ path: 'screenshots/02-no-input.png', fullPage: true });
      await browser.close();
      return;
    }
  }

  // Type a flight request - use locator for better reliability
  const flightRequest = 'I need a private jet from Teterboro (KTEB) to Van Nuys (KVNY) for 4 passengers on January 20, 2025';
  console.log('Typing flight request...');

  // Use the placeholder text to find the input
  await page.locator('input[placeholder*="Type your message"]').fill(flightRequest);
  await page.screenshot({ path: 'screenshots/02-message-typed.png', fullPage: true });
  console.log('Screenshot 2: Message typed');

  // Click the send button (the blue arrow button)
  console.log('Clicking send button...');
  await page.locator('button[type="submit"]').click();

  await page.screenshot({ path: 'screenshots/03-message-sent.png', fullPage: true });
  console.log('Screenshot 3: Message sent');

  // Wait for response with deep link (up to 90 seconds)
  console.log('Waiting for deep link to appear...');

  let deepLinkFound = false;
  for (let i = 0; i < 18; i++) {  // 18 x 5 seconds = 90 seconds max
    await page.waitForTimeout(5000);

    // Take progress screenshot
    await page.screenshot({ path: `screenshots/04-progress-${String(i+1).padStart(2, '0')}.png`, fullPage: true });
    console.log(`Screenshot 4.${i+1}: Progress check (${(i+1)*5}s)`);

    // Check for deep link indicators
    const pageText = await page.evaluate(() => document.body.innerText);
    const hasDeepLink = pageText.includes('marketplace.avinode') ||
                        pageText.includes('Open in Avinode') ||
                        pageText.includes('Goto Avinode') ||
                        pageText.includes('atrip-');

    if (hasDeepLink) {
      console.log('✅ Deep link found!');
      deepLinkFound = true;
      break;
    }

    // Check workflow status
    const hasCreatingTrip = pageText.includes('Creating Trip');
    const hasAwaitingSelection = pageText.includes('Awaiting Selection');
    const hasCompleted = pageText.includes('completed') || pageText.includes('Complete');

    console.log(`  Creating Trip: ${hasCreatingTrip}, Awaiting: ${hasAwaitingSelection}, Completed: ${hasCompleted}`);

    // If workflow reached awaiting selection, we should have deep link
    if (hasAwaitingSelection && !hasCreatingTrip) {
      console.log('Workflow at Awaiting Selection - checking for deep link UI...');
    }
  }

  // Final screenshot
  await page.screenshot({ path: 'screenshots/05-final.png', fullPage: true });
  console.log('Screenshot 5: Final state');

  if (deepLinkFound) {
    console.log('✅ Deep link workflow completed successfully!');
  } else {
    console.log('⏱️ Deep link not visible - may need UI investigation');
  }

  await browser.close();
}

testWorkflow().catch(console.error);

export {};
