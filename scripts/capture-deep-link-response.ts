/**
 * Capture screenshot of the full chat response with deep link
 * Uses Playwright to connect to running Chrome and capture the response
 */

import { chromium, Browser, Page } from 'playwright';
import { mkdirSync } from 'fs';

// Create screenshots directory
try {
  mkdirSync('screenshots', { recursive: true });
} catch (e) {
  // Directory already exists
}

async function captureDeepLinkResponse() {
  console.log('\n=== Capturing Deep Link Response Screenshot ===\n');

  let browser: Browser | null = null;

  try {
    // Connect to existing Chrome instance
    console.log('Connecting to Chrome at http://localhost:9222...');
    browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Connected to Chrome');

    // Get the default context and pages
    const contexts = browser.contexts();
    if (contexts.length === 0) {
      throw new Error('No browser contexts found');
    }

    const context = contexts[0];
    const pages = context.pages();

    // Find or create a page for the app
    let page: Page;
    const appPage = pages.find(p => p.url().includes('localhost:3000'));

    if (appPage) {
      page = appPage;
      console.log('Using existing page:', page.url());
    } else if (pages.length > 0) {
      page = pages[0];
      console.log('Using first available page');
    } else {
      page = await context.newPage();
      console.log('Created new page');
    }

    // Navigate to the app
    console.log('\nNavigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ Page loaded');

    // Wait for page to be fully interactive
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/01-initial-page.png', fullPage: true });
    console.log('📸 Captured: screenshots/01-initial-page.png');

    // Look for the chat input - updated selectors based on screenshot
    console.log('\nLooking for chat input...');

    // Try multiple selectors
    const inputSelectors = [
      'input[placeholder*="Type your message"]',
      'input[placeholder*="message"]',
      'textarea[placeholder*="message"]',
      '[role="textbox"]',
      'input[type="text"]',
    ];

    let chatInput = null;
    for (const selector of inputSelectors) {
      chatInput = await page.$(selector);
      if (chatInput) {
        console.log(`Found input with selector: ${selector}`);
        break;
      }
    }

    if (!chatInput) {
      // Try clicking on the visible input area
      console.log('Trying to click on the input area...');
      await page.click('text=Type your message to start a new chat');
      await page.waitForTimeout(500);

      // Try to find focused element
      chatInput = await page.$(':focus');
    }

    if (!chatInput) {
      console.log('❌ Chat input not found. Current page HTML:');
      const html = await page.content();
      console.log(html.substring(0, 2000));
      await page.screenshot({ path: 'screenshots/02-no-input.png', fullPage: true });
      return;
    }

    console.log('✅ Found chat input');

    // Type the flight request
    const flightRequest = 'I need a flight from KTEB to KVNY for 4 passengers on January 20, 2025';
    console.log(`\nTyping: "${flightRequest}"`);

    await chatInput.click();
    await page.waitForTimeout(300);
    await chatInput.fill(flightRequest);
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'screenshots/02-message-typed.png', fullPage: true });
    console.log('📸 Captured: screenshots/02-message-typed.png');

    // Find and click the send button
    console.log('\nLooking for send button...');

    // The send button appears to be the blue button with a paper plane icon
    const sendButtonSelectors = [
      'button[type="submit"]',
      'button:has(svg)',
      'button.bg-primary',
      '[class*="send"]',
    ];

    let sendButton = null;
    for (const selector of sendButtonSelectors) {
      sendButton = await page.$(selector);
      if (sendButton) {
        console.log(`Found send button with selector: ${selector}`);
        break;
      }
    }

    if (sendButton) {
      console.log('Clicking send button...');
      await sendButton.click();
    } else {
      console.log('Send button not found, pressing Enter...');
      await chatInput.press('Enter');
    }

    // Wait for response
    console.log('\nWaiting for response...');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/03-waiting.png', fullPage: true });
    console.log('📸 Captured: screenshots/03-waiting.png');

    // Wait for the response to complete
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max

    while (attempts < maxAttempts) {
      attempts++;

      // Check for deep link or trip ID in the response
      const pageText = await page.textContent('body') || '';
      const hasDeepLink = pageText.includes('marketplace.avinode.com') || pageText.includes('atrip-');
      const hasResponse = pageText.includes('KTEB') && pageText.includes('KVNY');

      if (hasDeepLink) {
        console.log('✅ Deep link found in response!');
        break;
      }

      if (hasResponse && attempts > 10) {
        console.log('Response received, checking for deep link...');
        // Give it a bit more time for the full response
        await page.waitForTimeout(2000);
        break;
      }

      console.log(`Waiting... (${attempts}/${maxAttempts})`);
      await page.waitForTimeout(1000);

      // Take periodic screenshots
      if (attempts % 10 === 0) {
        await page.screenshot({ path: `screenshots/04-progress-${attempts}.png`, fullPage: true });
        console.log(`📸 Captured: screenshots/04-progress-${attempts}.png`);
      }
    }

    // Wait for animations to complete
    await page.waitForTimeout(2000);

    // Take final screenshot
    await page.screenshot({ path: 'screenshots/05-final-response.png', fullPage: true });
    console.log('📸 Captured: screenshots/05-final-response.png');

    // Try to find the deep link element and highlight it
    const deepLinkSelectors = [
      'a[href*="marketplace.avinode.com"]',
      'a[href*="avinode"]',
      'text=/atrip-\\d+/',
      'button:has-text("Open in Avinode")',
      '[class*="deep-link"]',
    ];

    for (const selector of deepLinkSelectors) {
      try {
        const deepLink = await page.$(selector);
        if (deepLink) {
          await deepLink.scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);

          // Highlight with red border
          await page.evaluate((el) => {
            if (el) {
              (el as HTMLElement).style.border = '3px solid red';
              (el as HTMLElement).style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
              (el as HTMLElement).style.padding = '5px';
            }
          }, deepLink);

          await page.screenshot({ path: 'screenshots/06-deep-link-highlighted.png', fullPage: true });
          console.log('📸 Captured: screenshots/06-deep-link-highlighted.png');

          const href = await deepLink.getAttribute('href');
          const text = await deepLink.textContent();
          console.log(`\n✅ Deep Link Found!`);
          console.log(`   URL: ${href || 'N/A'}`);
          console.log(`   Text: ${text || 'N/A'}`);
          break;
        }
      } catch (e) {
        // Selector didn't match
      }
    }

    // Extract any trip IDs from the page
    const pageContent = await page.textContent('body') || '';
    const tripIdMatch = pageContent.match(/atrip-\d+/g);
    if (tripIdMatch) {
      console.log(`\n✅ Trip IDs found: ${tripIdMatch.join(', ')}`);
    }

    const deepLinkMatch = pageContent.match(/https?:\/\/marketplace\.avinode\.com[^\s"')]+/g);
    if (deepLinkMatch) {
      console.log(`✅ Deep Link URLs: ${deepLinkMatch.join(', ')}`);
    }

    console.log('\n=== Screenshot Capture Complete ===\n');
    console.log('Screenshots saved to: screenshots/');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    console.log('Done. Browser left open for inspection.');
  }
}

captureDeepLinkResponse();
