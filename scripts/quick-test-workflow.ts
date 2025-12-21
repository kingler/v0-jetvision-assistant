import { chromium } from 'playwright';

async function main() {
  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    const page = context.pages()[0];

    console.log('Page URL:', page.url());

    // Reload the page to clear any error state
    console.log('Reloading page...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Find and fill the input
    const input = await page.$('input[placeholder*="Type your message"]');
    if (input) {
      await input.fill('I need a private jet from KTEB to KLAX for 6 passengers on January 25, 2025');
      await input.press('Enter');
      console.log('Submitted via input');
    } else {
      // Try clicking a suggestion
      const suggestion = await page.$('button:has-text("book a flight")');
      if (suggestion) {
        await suggestion.click();
        console.log('Clicked suggestion');
      }
    }

    console.log('Waiting for response...');

    // Take screenshots at intervals
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'workflow-2s.png', fullPage: true });
    console.log('Screenshot at 2s');

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'workflow-5s.png', fullPage: true });
    console.log('Screenshot at 5s');

    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'workflow-10s.png', fullPage: true });
    console.log('Screenshot at 10s');

    // Check for deep link
    const deepLink = await page.$('button:has-text("Open in Avinode"), a[href*="marketplace.avinode.com"]');
    console.log('Deep Link found:', deepLink ? 'YES' : 'NO');

    // Check for date display
    const dateText = await page.textContent('body');
    const hasDate = dateText?.includes('January 25, 2025') || dateText?.includes('January 25');
    console.log('Date displayed:', hasDate ? 'YES' : 'NO');

    await browser.close();
  } catch (err) {
    console.error('Error:', (err as Error).message);
  }
}

main();
