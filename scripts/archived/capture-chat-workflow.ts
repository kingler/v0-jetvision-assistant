/**
 * Connect to existing Chrome instance and capture the FlightSearchProgress
 * component within the main chat interface message thread.
 */
import { chromium, Browser, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.join(process.cwd(), 'reports/ux-screenshots/chat-workflow');

async function ensureDir(dir: string): Promise<void> {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureChatWorkflow(): Promise<void> {
  console.log('🔗 Connecting to existing Chrome instance...\n');

  await ensureDir(SCREENSHOT_DIR);

  let browser: Browser | null = null;

  try {
    // Connect to existing Chrome via CDP
    browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Connected to Chrome\n');

    // Get existing contexts and pages
    const contexts = browser.contexts();

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
    for (const page of allPages) {
      const url = page.url();
      console.log(`   - ${url}`);
      if (url.includes('localhost:3000')) {
        targetPage = page;
      }
    }

    if (!targetPage) {
      console.log('\n⚠️  No localhost:3000 page found');
      return;
    }

    console.log(`\n🎯 Using page: ${targetPage.url()}\n`);

    // Navigate to main page
    console.log('📍 Navigating to main chat interface...');
    await targetPage.goto('http://localhost:3000/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await targetPage.waitForTimeout(2000);

    // Capture initial state
    console.log('📸 Capturing initial chat state...');
    await targetPage.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-initial-chat.png'),
      fullPage: true
    });

    // Look for the landing page input or the quick action button
    const landingInput = targetPage.locator('input[placeholder*="Type your message"]').first();
    const flightButton = targetPage.locator('text=I want to help book a flight').first();

    if (await flightButton.isVisible().catch(() => false)) {
      console.log('✅ Found quick action button - clicking to start flight booking...');
      await flightButton.click();
      await targetPage.waitForTimeout(3000);

      await targetPage.screenshot({
        path: path.join(SCREENSHOT_DIR, '02-after-quick-action.png'),
        fullPage: true
      });
    } else if (await landingInput.isVisible().catch(() => false)) {
      console.log('✅ Found landing input - typing flight request...');
      await landingInput.fill('I need a flight from Teterboro (KTEB) to Palm Beach (KPBI) on December 25th for 6 passengers');
      await targetPage.waitForTimeout(500);

      await targetPage.screenshot({
        path: path.join(SCREENSHOT_DIR, '02-message-typed.png'),
        fullPage: true
      });

      // Press Enter to submit
      await landingInput.press('Enter');
      await targetPage.waitForTimeout(3000);

      await targetPage.screenshot({
        path: path.join(SCREENSHOT_DIR, '03-after-submit.png'),
        fullPage: true
      });
    }

    // Wait for response and capture progress
    console.log('⏳ Waiting for API response and FlightSearchProgress...');

    for (let i = 0; i < 20; i++) {
      await targetPage.waitForTimeout(2000);

      // Check for FlightSearchProgress component
      const flightProgress = targetPage.locator('[data-testid="flight-search-progress"]').first();

      if (await flightProgress.isVisible().catch(() => false)) {
        console.log(`✅ FlightSearchProgress component visible at iteration ${i + 1}!`);

        await targetPage.screenshot({
          path: path.join(SCREENSHOT_DIR, `04-workflow-visible.png`),
          fullPage: true
        });

        // Capture just the component
        await flightProgress.screenshot({
          path: path.join(SCREENSHOT_DIR, `04a-component-only.png`)
        });

        // Wait a bit more to see full workflow
        await targetPage.waitForTimeout(5000);

        await targetPage.screenshot({
          path: path.join(SCREENSHOT_DIR, `05-workflow-complete.png`),
          fullPage: true
        });

        if (await flightProgress.isVisible().catch(() => false)) {
          await flightProgress.screenshot({
            path: path.join(SCREENSHOT_DIR, `05a-component-complete.png`)
          });
        }

        break;
      }

      // Check for agent message
      const agentMessage = targetPage.locator('[data-testid="agent-message"]').first();
      if (await agentMessage.isVisible().catch(() => false)) {
        console.log(`   Agent message visible at iteration ${i + 1}`);

        if (i % 3 === 0) {
          await targetPage.screenshot({
            path: path.join(SCREENSHOT_DIR, `03-progress-${i + 1}.png`),
            fullPage: true
          });
        }
      } else {
        console.log(`   Waiting for response... (${i + 1}/20)`);
      }
    }

    // Final full page screenshot
    await targetPage.screenshot({
      path: path.join(SCREENSHOT_DIR, '06-final-state.png'),
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
    console.error('❌ Error:', error);
    throw error;
  } finally {
    console.log('\n🔌 Script complete (browser remains open)');
  }
}

// Run the script
captureChatWorkflow().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});

export {};
