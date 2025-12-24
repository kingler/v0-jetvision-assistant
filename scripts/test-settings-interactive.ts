import { chromium } from 'playwright-core';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Screenshots directory path for settings dropdown test screenshots
 */
const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots', 'settings-dropdown');

/**
 * Ensures the screenshots directory exists before saving screenshots.
 * Creates parent directories if needed (mkdir -p style).
 * 
 * @throws {Error} If directory creation fails due to permission issues
 */
function ensureScreenshotsDirectory(): void {
  try {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  } catch (error) {
    // Log error but allow script to continue - screenshot will fail with clearer error
    console.error(`❌ Failed to create screenshots directory: ${SCREENSHOTS_DIR}`, error);
    throw new Error(`Cannot create screenshots directory: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  // Ensure screenshots directory exists before starting browser operations
  console.log('📁 Ensuring screenshots directory exists...');
  ensureScreenshotsDirectory();
  console.log(`✅ Screenshots will be saved to: ${SCREENSHOTS_DIR}\n`);

  console.log('🚀 Launching browser...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
    channel: 'chrome'
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();

  console.log('📍 Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000');

  console.log('\n⏸️  PAUSED - Please sign in manually in the browser window');
  console.log('   After signing in, press Enter in this terminal to continue...\n');

  // Wait for user to sign in
  await page.pause();

  console.log('✅ Continuing after authentication...');

  // Wait for the main page to load after auth - wait for Settings button to be visible
  // This is more reliable than a fixed timeout as it waits for the actual element
  // The Settings button is in the header, so waiting for it ensures the page is fully loaded
  console.log('⏳ Waiting for page to be ready (looking for Settings button)...');
  try {
    // Try to find Settings button using Playwright's getByRole (most reliable)
    const settingsButton = page.getByRole('button', { name: /settings/i });
    await settingsButton.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Settings button found - page is ready!');
  } catch (error) {
    // Fallback: wait for header to be visible if Settings button not found
    // This handles cases where user might not be admin (Settings button hidden)
    console.log('   Settings button not found, waiting for header instead...');
    await page.waitForSelector('header', { state: 'visible', timeout: 5000 });
    console.log('✅ Header found - page is ready!');
  }

  // Take screenshot of authenticated state
  await page.screenshot({ path: 'screenshots/settings-dropdown/02_authenticated_main_page.png', fullPage: true });
  console.log('📸 Screenshot saved: 02_authenticated_main_page.png');

  // Look for the chat input to test a trip search
  console.log('\n🔍 Looking for chat input...');
  const chatInput = page.locator('textarea, input[type="text"]').first();

  if (await chatInput.isVisible()) {
    console.log('✍️  Entering trip search query...');
    await chatInput.fill('I need a flight from New York (KTEB) to Miami (KOPF) for 4 passengers on January 15th, 2025');
    await page.screenshot({ path: 'screenshots/settings-dropdown/03_trip_search_query.png', fullPage: true });
    console.log('📸 Screenshot saved: 03_trip_search_query.png');
  }

  // Click the Settings button
  console.log('\n⚙️  Looking for Settings button...');

  // Try multiple selectors for Settings button
  let settingsClicked = false;

  // Try by text
  const settingsByText = page.getByRole('button', { name: /settings/i });
  if (await settingsByText.isVisible()) {
    console.log('✅ Found Settings button by text');
    await settingsByText.click();
    settingsClicked = true;
  }

  if (!settingsClicked) {
    // Try by aria-label or title
    const settingsByLabel = page.locator('button[aria-label*="settings" i], button[title*="settings" i]');
    if (await settingsByLabel.count() > 0) {
      console.log('✅ Found Settings button by aria-label');
      await settingsByLabel.first().click();
      settingsClicked = true;
    }
  }

  if (!settingsClicked) {
    // Try finding any button with Settings text
    const allButtons = page.locator('button');
    const count = await allButtons.count();
    console.log(`Found ${count} buttons total`);

    for (let i = 0; i < count; i++) {
      const btn = allButtons.nth(i);
      const text = await btn.textContent();
      if (text?.toLowerCase().includes('settings')) {
        console.log(`✅ Found Settings button: "${text}"`);
        await btn.click();
        settingsClicked = true;
        break;
      }
    }
  }

  if (settingsClicked) {
    // Wait for dropdown menu to appear explicitly instead of using fixed delay
    console.log('⏳ Waiting for dropdown menu to appear...');
    const dropdown = page.locator('[data-slot="dropdown-menu-content"], [role="menu"]').first();
    await dropdown.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ Dropdown menu is visible');
    await page.screenshot({ path: 'screenshots/settings-dropdown/04_settings_dropdown_open.png', fullPage: true });
    console.log('📸 Screenshot saved: 04_settings_dropdown_open.png');

    // Test dropdown interactions
    console.log('\n🎛️  Testing dropdown interactions...');

    // Take a screenshot of just the dropdown area (reuse dropdown variable from above)
    if (await dropdown.isVisible()) {
      await dropdown.screenshot({ path: 'screenshots/settings-dropdown/05_dropdown_content.png' });
      console.log('📸 Screenshot saved: 05_dropdown_content.png');
    }
  } else {
    console.log('❌ Could not find Settings button');
    await page.screenshot({ path: 'screenshots/settings-dropdown/error_no_settings_button.png', fullPage: true });
  }

  console.log('\n⏸️  Browser will stay open. Press Enter to close...');
  await page.pause();

  await browser.close();
  console.log('🏁 Done!');
}

main().catch(console.error);
