/**
 * Playwright script to capture screenshots of the updated FlightSearchProgress component
 * across all 4 workflow states using the demo page.
 */
import { chromium, Browser, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.join(process.cwd(), 'reports/ux-screenshots');
const DEMO_URL = 'http://localhost:3000/component-demo/flight-search-progress';

async function ensureDir(dir: string): Promise<void> {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureScreenshots(): Promise<void> {
  console.log('🎬 Starting Playwright screenshot capture...\n');
  console.log(`📍 Demo URL: ${DEMO_URL}\n`);

  await ensureDir(SCREENSHOT_DIR);

  let browser: Browser | null = null;

  try {
    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    const page: Page = await context.newPage();

    // Navigate to the demo page
    console.log('📍 Navigating to demo page...');
    await page.goto(DEMO_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Check if redirected to sign-in
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    if (currentUrl.includes('sign-in')) {
      console.log('⚠️  Redirected to sign-in. Demo page may require auth bypass.');
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '00-sign-in-redirect.png'),
        fullPage: true
      });
    }

    // Capture Step 1: Create Request
    console.log('\n📸 Step 1: Create Trip Request');
    const step1Btn = page.locator('button:has-text("Step 1")').first();
    if (await step1Btn.isVisible().catch(() => false)) {
      await step1Btn.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-step1-create-request.png'),
      fullPage: true
    });

    // Capture the component only
    const componentPreview = page.locator('[data-testid="flight-search-progress"]').first();
    if (await componentPreview.isVisible().catch(() => false)) {
      await componentPreview.screenshot({
        path: path.join(SCREENSHOT_DIR, '01a-step1-component.png')
      });
    }

    // Capture Step 2: Deep Link Ready
    console.log('📸 Step 2: Generate Avinode Deep Link');
    const step2Btn = page.locator('button:has-text("Step 2")').first();
    if (await step2Btn.isVisible().catch(() => false)) {
      await step2Btn.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-step2-deep-link.png'),
      fullPage: true
    });

    if (await componentPreview.isVisible().catch(() => false)) {
      await componentPreview.screenshot({
        path: path.join(SCREENSHOT_DIR, '02a-step2-component.png')
      });
    }

    // Capture Step 3: Awaiting Selection
    console.log('📸 Step 3: Awaiting Selection');
    const step3Btn = page.locator('button:has-text("Step 3")').first();
    if (await step3Btn.isVisible().catch(() => false)) {
      await step3Btn.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-step3-awaiting-selection.png'),
      fullPage: true
    });

    if (await componentPreview.isVisible().catch(() => false)) {
      await componentPreview.screenshot({
        path: path.join(SCREENSHOT_DIR, '03a-step3-component.png')
      });
    }

    // Try entering a Trip ID
    const tripIdInput = page.locator('input[placeholder*="Trip ID"], input[placeholder*="trip"]').first();
    if (await tripIdInput.isVisible().catch(() => false)) {
      console.log('   Entering Trip ID...');
      await tripIdInput.fill('trp123456789');
      await page.waitForTimeout(300);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '03b-step3-trip-id-entered.png'),
        fullPage: true
      });
    }

    // Capture Step 4: Processing (without flights)
    console.log('📸 Step 4: Processing');
    const step4Btn = page.locator('button:has-text("Step 4: Processing")').first();
    if (await step4Btn.isVisible().catch(() => false)) {
      await step4Btn.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-step4-processing.png'),
      fullPage: true
    });

    if (await componentPreview.isVisible().catch(() => false)) {
      await componentPreview.screenshot({
        path: path.join(SCREENSHOT_DIR, '04a-step4-processing-component.png')
      });
    }

    // Capture Step 4: With Flights (stepper hidden, flights displayed)
    console.log('📸 Step 4: With Flights (Selected Flights Display)');
    const step4WithFlightsBtn = page.locator('button:has-text("Step 4: With Flights")').first();
    if (await step4WithFlightsBtn.isVisible().catch(() => false)) {
      await step4WithFlightsBtn.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04b-step4-with-flights.png'),
      fullPage: true
    });

    if (await componentPreview.isVisible().catch(() => false)) {
      await componentPreview.screenshot({
        path: path.join(SCREENSHOT_DIR, '04c-step4-flights-component.png')
      });
    }

    // Capture Error State
    console.log('📸 Error State');
    const errorBtn = page.locator('button:has-text("Show Error")').first();
    if (await errorBtn.isVisible().catch(() => false)) {
      await errorBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '05-error-state.png'),
        fullPage: true
      });

      if (await componentPreview.isVisible().catch(() => false)) {
        await componentPreview.screenshot({
          path: path.join(SCREENSHOT_DIR, '05a-error-component.png')
        });
      }
    }

    // Mobile viewport
    console.log('\n📱 Capturing mobile viewport...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);

    // Step 1 mobile
    if (await step1Btn.isVisible().catch(() => false)) {
      await step1Btn.click();
      await page.waitForTimeout(300);
    }
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06-mobile-step1.png'),
      fullPage: true
    });

    // Step 3 mobile
    if (await step3Btn.isVisible().catch(() => false)) {
      await step3Btn.click();
      await page.waitForTimeout(300);
    }
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '07-mobile-step3.png'),
      fullPage: true
    });

    // Reset to desktop
    await page.setViewportSize({ width: 1440, height: 900 });

    // Dark mode if available
    console.log('\n🌙 Attempting dark mode capture...');
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(500);

    if (await step2Btn.isVisible().catch(() => false)) {
      await step2Btn.click();
      await page.waitForTimeout(300);
    }
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '08-dark-mode-step2.png'),
      fullPage: true
    });

    if (await step3Btn.isVisible().catch(() => false)) {
      await step3Btn.click();
      await page.waitForTimeout(300);
    }
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '09-dark-mode-step3.png'),
      fullPage: true
    });

    console.log(`\n✅ Screenshots saved to: ${SCREENSHOT_DIR}`);

    // List all captured files
    const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png')).sort();
    console.log('\n📁 Captured files:');
    files.forEach(file => {
      const stats = fs.statSync(path.join(SCREENSHOT_DIR, file));
      console.log(`   - ${file} (${Math.round(stats.size / 1024)}KB)`);
    });

  } catch (error) {
    console.error('❌ Error capturing screenshots:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the script
captureScreenshots().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});

export {};
