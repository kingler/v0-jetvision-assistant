/**
 * Debug workflow state by checking the DOM and React state
 */
import { chromium } from 'playwright';

async function debugWorkflow() {
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
    console.log('No page found');
    await browser.close();
    return;
  }

  console.log('Checking current state...');

  // Check the workflow step icons
  const stepInfo = await page.evaluate(() => {
    const steps = document.querySelectorAll('[class*="space-y-1"]');
    const stepData: any[] = [];

    // Look for step titles and their status icons
    document.querySelectorAll('button').forEach(button => {
      const text = button.textContent || '';
      if (text.includes('Step')) {
        const hasSpinner = button.innerHTML.includes('animate-spin');
        const hasCheck = button.innerHTML.includes('text-green');
        const hasClock = button.innerHTML.includes('text-muted');

        stepData.push({
          text: text.substring(0, 50),
          hasSpinner,
          hasCheck,
          hasClock,
        });
      }
    });

    return stepData;
  });

  console.log('Step states:', JSON.stringify(stepInfo, null, 2));

  // Get the message content
  const messages = await page.evaluate(() => {
    const msgDivs = document.querySelectorAll('.max-w-4xl > div');
    return Array.from(msgDivs).map(div => {
      const text = div.textContent?.substring(0, 100) || '';
      return text;
    });
  });

  console.log('Messages:', messages);

  // Check for deep link
  const deepLinkInfo = await page.evaluate(() => {
    const hasDeepLinkButton = document.querySelector('button')?.textContent?.includes('Open in Avinode');
    const hasMarketplaceLink = document.querySelector('a[href*="marketplace"]');
    const hasTripId = document.body.innerHTML.includes('atrip-');

    // Look for the DeepLinkPrompt component
    const deepLinkPrompt = document.querySelector('[class*="deep-link"]');

    return {
      hasDeepLinkButton,
      hasMarketplaceLink: !!hasMarketplaceLink,
      hasTripId,
      hasDeepLinkPrompt: !!deepLinkPrompt,
    };
  });

  console.log('Deep link info:', deepLinkInfo);

  await browser.close();
}

debugWorkflow().catch(console.error);

export {};
