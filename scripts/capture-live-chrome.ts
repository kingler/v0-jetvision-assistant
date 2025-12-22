/**
 * Connect to existing Chrome instance and capture screenshots of the live application
 */
import { chromium, Browser, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.join(process.cwd(), 'reports/ux-screenshots/live');

async function ensureDir(dir: string): Promise<void> {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureLiveChrome(): Promise<void> {
  console.log('🔗 Connecting to existing Chrome instance...\n');

  await ensureDir(SCREENSHOT_DIR);

  let browser: Browser | null = null;

  try {
    // Connect to existing Chrome via CDP
    browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Connected to Chrome\n');

    // Get existing contexts and pages
    const contexts = browser.contexts();
    console.log(`📑 Found ${contexts.length} browser context(s)`);

    if (contexts.length === 0) {
      console.log('❌ No browser contexts found');
      return;
    }

    // Find all pages
    let allPages: Page[] = [];
    for (const context of contexts) {
      const pages = context.pages();
      allPages = allPages.concat(pages);
    }

    console.log(`📄 Found ${allPages.length} page(s)\n`);

    // Find the localhost:3000 page
    let targetPage: Page | null = null;
    for (let i = 0; i < allPages.length; i++) {
      const page = allPages[i];
      const url = page.url();
      console.log(`   Page ${i + 1}: ${url}`);

      if (url.includes('localhost:3000')) {
        targetPage = page;
      }
    }

    if (!targetPage) {
      console.log('\n⚠️  No localhost:3000 page found. Taking screenshots of all pages...');

      for (let i = 0; i < allPages.length; i++) {
        const page = allPages[i];
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `page-${i}.png`),
          fullPage: true
        });
        console.log(`📸 Captured page ${i}: ${page.url()}`);
      }
      return;
    }

    console.log(`\n🎯 Found target page: ${targetPage.url()}\n`);

    // Capture current state
    console.log('📸 Capturing current page state...');
    await targetPage.screenshot({
      path: path.join(SCREENSHOT_DIR, '00-current-state.png'),
      fullPage: true
    });

    // Check if we're on a chat page or need to navigate
    const currentUrl = targetPage.url();

    if (currentUrl.includes('sign-in')) {
      console.log('⚠️  Currently on sign-in page. User needs to authenticate first.');
      await targetPage.screenshot({
        path: path.join(SCREENSHOT_DIR, '01-sign-in-page.png'),
        fullPage: true
      });
      return;
    }

    // If on main chat interface, look for FlightSearchProgress component
    const flightSearchProgress = targetPage.locator('[data-testid="flight-search-progress"]').first();

    if (await flightSearchProgress.isVisible().catch(() => false)) {
      console.log('✅ Found FlightSearchProgress component');

      await flightSearchProgress.screenshot({
        path: path.join(SCREENSHOT_DIR, '02-flight-search-progress.png')
      });
      console.log('📸 Captured FlightSearchProgress component');
    } else {
      console.log('ℹ️  FlightSearchProgress component not visible on current page');
    }

    // Check if we're on the demo page
    if (currentUrl.includes('component-demo')) {
      console.log('\n📋 On demo page - capturing all workflow states...\n');

      // Step 1
      const step1Btn = targetPage.locator('button:has-text("Step 1")').first();
      if (await step1Btn.isVisible().catch(() => false)) {
        await step1Btn.click();
        await targetPage.waitForTimeout(500);
        await targetPage.screenshot({
          path: path.join(SCREENSHOT_DIR, '03-step1-request.png'),
          fullPage: true
        });
        console.log('📸 Captured Step 1: Request');
      }

      // Step 2
      const step2Btn = targetPage.locator('button:has-text("Step 2")').first();
      if (await step2Btn.isVisible().catch(() => false)) {
        await step2Btn.click();
        await targetPage.waitForTimeout(500);
        await targetPage.screenshot({
          path: path.join(SCREENSHOT_DIR, '04-step2-select-flight.png'),
          fullPage: true
        });
        console.log('📸 Captured Step 2: Select Flight & RFQ');
      }

      // Step 3
      const step3Btn = targetPage.locator('button:has-text("Step 3")').first();
      if (await step3Btn.isVisible().catch(() => false)) {
        await step3Btn.click();
        await targetPage.waitForTimeout(500);
        await targetPage.screenshot({
          path: path.join(SCREENSHOT_DIR, '05-step3-enter-tripid.png'),
          fullPage: true
        });
        console.log('📸 Captured Step 3: Enter TripID');
      }

      // Step 4: Processing
      const step4Btn = targetPage.locator('button:has-text("Step 4: Processing")').first();
      if (await step4Btn.isVisible().catch(() => false)) {
        await step4Btn.click();
        await targetPage.waitForTimeout(500);
        await targetPage.screenshot({
          path: path.join(SCREENSHOT_DIR, '06-step4-processing.png'),
          fullPage: true
        });
        console.log('📸 Captured Step 4: Processing');
      }

      // Step 4: With Flights
      const step4FlightsBtn = targetPage.locator('button:has-text("Step 4: With Flights")').first();
      if (await step4FlightsBtn.isVisible().catch(() => false)) {
        await step4FlightsBtn.click();
        await targetPage.waitForTimeout(500);
        await targetPage.screenshot({
          path: path.join(SCREENSHOT_DIR, '07-step4-with-flights.png'),
          fullPage: true
        });

        // Capture just the component
        if (await flightSearchProgress.isVisible().catch(() => false)) {
          await flightSearchProgress.screenshot({
            path: path.join(SCREENSHOT_DIR, '07a-step4-flights-component.png')
          });
        }
        console.log('📸 Captured Step 4: With Flights (stepper hidden)');
      }
    }

    // Navigate to demo page if not already there
    if (!currentUrl.includes('component-demo')) {
      console.log('\n📍 Navigating to demo page...');
      await targetPage.goto('http://localhost:3000/component-demo/flight-search-progress', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      await targetPage.waitForTimeout(2000);

      console.log('✅ Navigated to demo page');
      await targetPage.screenshot({
        path: path.join(SCREENSHOT_DIR, '08-demo-page.png'),
        fullPage: true
      });
    }

    console.log(`\n✅ Screenshots saved to: ${SCREENSHOT_DIR}`);

    // List all captured files
    const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png')).sort();
    console.log('\n📁 Captured files:');
    files.forEach(file => {
      const stats = fs.statSync(path.join(SCREENSHOT_DIR, file));
      console.log(`   - ${file} (${Math.round(stats.size / 1024)}KB)`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    // Don't close the browser - it's the user's session
    console.log('\n🔌 Script complete (browser remains open)');
  }
}

// Run the script
captureLiveChrome().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});

export {};
