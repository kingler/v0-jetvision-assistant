/**
 * Connect to existing Chrome instance and capture the main chat interface
 * with FlightSearchProgress component - NOT the demo page
 */
import { chromium, Browser, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.join(process.cwd(), 'reports/ux-screenshots/main-chat');

async function ensureDir(dir: string): Promise<void> {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureMainChat(): Promise<void> {
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

    // Find the localhost:3000 page that is NOT on sign-in or demo
    let targetPage: Page | null = null;
    for (let i = 0; i < allPages.length; i++) {
      const page = allPages[i];
      const url = page.url();
      console.log(`   Page ${i + 1}: ${url}`);

      if (url.includes('localhost:3000') && !url.includes('sign-in') && !url.includes('component-demo')) {
        targetPage = page;
      }
    }

    if (!targetPage) {
      // If no main page, try to find localhost:3000 page that's authenticated
      for (let i = 0; i < allPages.length; i++) {
        const page = allPages[i];
        const url = page.url();
        if (url.includes('localhost:3000')) {
          targetPage = page;
          break;
        }
      }
    }

    if (!targetPage) {
      console.log('\n⚠️  No localhost:3000 page found');
      return;
    }

    console.log(`\n🎯 Using page: ${targetPage.url()}\n`);

    // Capture current state
    console.log('📸 Capturing current page state...');
    await targetPage.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-current-state.png'),
      fullPage: true,
    });

    // Check for FlightSearchProgress in current view
    const flightSearchProgress = targetPage.locator('[data-testid="flight-search-progress"]').first();
    if (await flightSearchProgress.isVisible().catch(() => false)) {
      console.log('✅ FlightSearchProgress component found!');

      await flightSearchProgress.screenshot({
        path: path.join(SCREENSHOT_DIR, '02-flight-search-progress-component.png'),
      });
      console.log('📸 Captured FlightSearchProgress component');

      // Check for the deep link button
      const deepLinkButton = targetPage.locator('button:has-text("Open in Avinode"), a:has-text("Open in Avinode")').first();
      if (await deepLinkButton.isVisible().catch(() => false)) {
        console.log('✅ Deep link button found');

        // Get the href/onclick to verify URL format
        const buttonText = await deepLinkButton.textContent().catch(() => 'N/A');
        console.log(`   Button text: ${buttonText}`);

        // Try to get href if it's a link
        const href = await deepLinkButton.getAttribute('href').catch(() => null);
        if (href) {
          console.log(`   Deep link URL: ${href}`);
        }
      }
    } else {
      console.log('ℹ️  FlightSearchProgress component not visible on current page');
    }

    // Check for agent messages
    const agentMessages = targetPage.locator('[data-testid="agent-message"]');
    const messageCount = await agentMessages.count();
    console.log(`\n📨 Found ${messageCount} agent message(s)`);

    // Capture the message area
    const messageArea = targetPage.locator('.flex-1.overflow-y-auto, [class*="message"], main').first();
    if (await messageArea.isVisible().catch(() => false)) {
      await messageArea.screenshot({
        path: path.join(SCREENSHOT_DIR, '03-message-area.png'),
      });
      console.log('📸 Captured message area');
    }

    // Check for sidebar
    const sidebar = targetPage.locator('[class*="sidebar"], aside, [class*="ChatSidebar"]').first();
    if (await sidebar.isVisible().catch(() => false)) {
      console.log('✅ Sidebar visible');
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
    console.log('\n🔌 Script complete (browser remains open)');
  }
}

// Run the script
captureMainChat().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});

export {};
