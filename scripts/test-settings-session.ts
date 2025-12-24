import { chromium } from 'playwright-core';

async function main() {
  console.log('🚀 Launching Chrome...');

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();

  console.log('📍 Navigating to http://localhost:3001...');
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });

  await page.waitForTimeout(3000);

  const currentUrl = page.url();
  console.log(`Current URL: ${currentUrl}`);

  if (currentUrl.includes('sign-in')) {
    console.log('⚠️  Auth redirect detected - check middleware bypass');
  } else {
    console.log('✅ Auth bypassed - direct access to main page');
  }

  console.log('\n✅ Testing main page functionality...');

  await page.screenshot({ path: 'screenshots/settings-dropdown/02_main_page.png', fullPage: true });
  console.log('📸 Screenshot: 02_main_page.png');

  // Find and test the chat input
  console.log('\n🔍 Looking for chat input...');

  const chatInput = page.locator('textarea').first();

  if (await chatInput.isVisible()) {
    console.log('✅ Found textarea - entering query...');
    await chatInput.click();
    await chatInput.fill('I need a flight from New York (KTEB) to Miami (KOPF) for 4 passengers on January 15th, 2025');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/settings-dropdown/03_chat_input.png', fullPage: true });
    console.log('📸 Screenshot: 03_chat_input.png');
  } else {
    console.log('⚠️  Textarea not visible');
  }

  // Find and click Settings button
  console.log('\n⚙️  Looking for Settings button...');

  const settingsButton = page.locator('button').filter({ hasText: /settings/i }).first();

  if (await settingsButton.isVisible()) {
    console.log('✅ Found Settings button - clicking...');
    await settingsButton.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'screenshots/settings-dropdown/04_settings_open.png', fullPage: true });
    console.log('📸 Screenshot: 04_settings_open.png');

    const dropdown = page.locator('[data-slot="dropdown-menu-content"]');
    if (await dropdown.isVisible()) {
      await dropdown.screenshot({ path: 'screenshots/settings-dropdown/05_dropdown_only.png' });
      console.log('📸 Screenshot: 05_dropdown_only.png');

      console.log('\n🎛️  Dropdown is visible! Testing interactions...');

      const sliders = dropdown.locator('[role="slider"]');
      console.log(`   Sliders: ${await sliders.count()}`);

      const switches = dropdown.locator('[role="switch"]');
      console.log(`   Switches: ${await switches.count()}`);
    } else {
      console.log('⚠️  Dropdown content not found');
    }
  } else {
    console.log('❌ Settings button not found');
    const allButtons = page.locator('button');
    const count = await allButtons.count();
    console.log(`   Total buttons: ${count}`);
    for (let i = 0; i < Math.min(count, 8); i++) {
      const text = await allButtons.nth(i).textContent();
      console.log(`   [${i}]: "${text?.trim().substring(0, 30)}"`);
    }
  }

  console.log('\n✅ Test complete!');
  await page.waitForTimeout(2000);
  await browser.close();
}

main().catch(console.error);
