/**
 * Playwright script to test FlightSearchProgress in main chat-interface
 * Launches its own browser and controls the full workflow
 */
import { chromium, Browser, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.join(process.cwd(), 'reports/ux-screenshots/chat-workflow-test');
const BASE_URL = 'http://localhost:3000';

async function ensureDir(dir: string): Promise<void> {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function testChatWorkflow(): Promise<void> {
  console.log('🚀 Starting Playwright controlled test...\n');

  await ensureDir(SCREENSHOT_DIR);

  let browser: Browser | null = null;

  try {
    // Launch browser in non-headless mode for visibility
    browser = await chromium.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    const page: Page = await context.newPage();

    // Navigate to sign-in page first
    console.log('📍 Navigating to app...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Capture sign-in page
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-sign-in-page.png'),
      fullPage: true,
    });
    console.log('📸 Captured sign-in page');

    // Check current URL
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    if (currentUrl.includes('sign-in')) {
      console.log('\n⚠️  Authentication required. Testing with demo/component page instead...');

      // Navigate to demo page which should be public
      await page.goto(`${BASE_URL}/component-demo/flight-search-progress`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await page.waitForTimeout(2000);

      const demoUrl = page.url();
      console.log(`   Demo URL: ${demoUrl}`);

      if (demoUrl.includes('sign-in')) {
        console.log('❌ Demo page also requires auth. Please check middleware settings.');
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '02-demo-redirect.png'),
          fullPage: true,
        });
        return;
      }

      // We're on the demo page - capture all states
      console.log('\n📸 Capturing demo page workflow states...\n');

      // Capture initial state
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '02-demo-initial.png'),
        fullPage: true,
      });

      // Step 1: Request
      const step1Btn = page.locator('button:has-text("Step 1")').first();
      if (await step1Btn.isVisible().catch(() => false)) {
        await step1Btn.click();
        await page.waitForTimeout(500);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '03-step1-request.png'),
          fullPage: true,
        });
        console.log('📸 Step 1: Create Trip Request');
      }

      // Step 2: Select Flight & RFQ
      const step2Btn = page.locator('button:has-text("Step 2")').first();
      if (await step2Btn.isVisible().catch(() => false)) {
        await step2Btn.click();
        await page.waitForTimeout(500);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '04-step2-select-flight.png'),
          fullPage: true,
        });

        // Capture just the component
        const component = page.locator('[data-testid="flight-search-progress"]').first();
        if (await component.isVisible().catch(() => false)) {
          await component.screenshot({
            path: path.join(SCREENSHOT_DIR, '04a-step2-component.png'),
          });
        }
        console.log('📸 Step 2: Select Flight & RFQ (with instructions)');
      }

      // Step 3: Retrieve Flight Details (Trip ID input)
      const step3Btn = page.locator('button:has-text("Step 3")').first();
      if (await step3Btn.isVisible().catch(() => false)) {
        await step3Btn.click();
        await page.waitForTimeout(500);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '05-step3-tripid.png'),
          fullPage: true,
        });

        // Try entering a Trip ID
        const tripInput = page.locator('input[placeholder*="Trip ID"], input[placeholder*="trip"]').first();
        if (await tripInput.isVisible().catch(() => false)) {
          await tripInput.fill('trp123456789');
          await page.waitForTimeout(300);
          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '05a-step3-tripid-entered.png'),
            fullPage: true,
          });
          console.log('📸 Step 3: Trip ID entered');
        }

        // Capture component only
        const component = page.locator('[data-testid="flight-search-progress"]').first();
        if (await component.isVisible().catch(() => false)) {
          await component.screenshot({
            path: path.join(SCREENSHOT_DIR, '05b-step3-component.png'),
          });
        }
        console.log('📸 Step 3: Retrieve Flight Details');
      }

      // Step 4: Processing
      const step4ProcessingBtn = page.locator('button:has-text("Step 4: Processing")').first();
      if (await step4ProcessingBtn.isVisible().catch(() => false)) {
        await step4ProcessingBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '06-step4-processing.png'),
          fullPage: true,
        });
        console.log('📸 Step 4: Processing');
      }

      // Step 4: With Flights (stepper hidden)
      const step4FlightsBtn = page.locator('button:has-text("Step 4: With Flights")').first();
      if (await step4FlightsBtn.isVisible().catch(() => false)) {
        await step4FlightsBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '07-step4-with-flights.png'),
          fullPage: true,
        });

        // Capture component only
        const component = page.locator('[data-testid="flight-search-progress"]').first();
        if (await component.isVisible().catch(() => false)) {
          await component.screenshot({
            path: path.join(SCREENSHOT_DIR, '07a-step4-flights-component.png'),
          });
        }
        console.log('📸 Step 4: With Flights (stepper hidden, flights displayed)');
      }

      // Mobile viewport
      console.log('\n📱 Testing mobile viewport...');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(300);

      if (await step3Btn.isVisible().catch(() => false)) {
        await step3Btn.click();
        await page.waitForTimeout(300);
      }
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '08-mobile-step3.png'),
        fullPage: true,
      });
      console.log('📸 Mobile: Step 3');

      if (await step4FlightsBtn.isVisible().catch(() => false)) {
        await step4FlightsBtn.click();
        await page.waitForTimeout(300);
      }
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '09-mobile-step4-flights.png'),
        fullPage: true,
      });
      console.log('📸 Mobile: Step 4 with flights');

      // Dark mode test
      console.log('\n🌙 Testing dark mode...');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(500);

      if (await step2Btn.isVisible().catch(() => false)) {
        await step2Btn.click();
        await page.waitForTimeout(300);
      }
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '10-dark-mode-step2.png'),
        fullPage: true,
      });
      console.log('📸 Dark mode: Step 2');

      if (await step4FlightsBtn.isVisible().catch(() => false)) {
        await step4FlightsBtn.click();
        await page.waitForTimeout(300);
      }
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '11-dark-mode-step4-flights.png'),
        fullPage: true,
      });
      console.log('📸 Dark mode: Step 4 with flights');
    }

    console.log(`\n✅ Screenshots saved to: ${SCREENSHOT_DIR}`);

    // List all captured files
    const files = fs.readdirSync(SCREENSHOT_DIR).filter((f) => f.endsWith('.png')).sort();
    console.log('\n📁 Captured files:');
    files.forEach((file) => {
      const stats = fs.statSync(path.join(SCREENSHOT_DIR, file));
      console.log(`   - ${file} (${Math.round(stats.size / 1024)}KB)`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
    console.log('\n🔌 Browser closed');
  }
}

// Run the script
testChatWorkflow().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});

export {};
