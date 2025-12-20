/**
 * Comprehensive UX Testing Script
 *
 * Captures extensive screenshots of the authenticated Jetvision app
 * including chat interactions, navigation, and all UI states.
 *
 * Usage: npx tsx scripts/ux-comprehensive-testing.ts
 */

import { chromium, Page, BrowserContext } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots/ux-analysis/comprehensive');
const USER_DATA_DIR = path.join(process.cwd(), '.playwright-auth');
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Screenshot counter for ordering
let screenshotCounter = 1;

// Screenshot index for documentation
const screenshotIndex: Array<{ name: string; description: string; category: string }> = [];

// Ensure directories exist
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function takeScreenshot(
  page: Page,
  name: string,
  description: string,
  category: string,
  fullPage = true
): Promise<void> {
  const paddedCounter = String(screenshotCounter).padStart(2, '0');
  const filename = `${paddedCounter}_${name}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage });
  console.log(`📸 [${paddedCounter}] ${description}`);
  screenshotIndex.push({ name: filename, description, category });
  screenshotCounter++;
}

async function generateIndex(): Promise<void> {
  let markdown = `# Jetvision UX Screenshot Index

Generated: ${new Date().toISOString()}

## Screenshots by Category

`;

  const categories = [...new Set(screenshotIndex.map((s) => s.category))];

  for (const category of categories) {
    markdown += `### ${category}\n\n`;
    const categoryScreenshots = screenshotIndex.filter((s) => s.category === category);
    for (const screenshot of categoryScreenshots) {
      markdown += `- **${screenshot.name}**: ${screenshot.description}\n`;
    }
    markdown += '\n';
  }

  markdown += `## Summary

- **Total Screenshots**: ${screenshotIndex.length}
- **Categories**: ${categories.join(', ')}
`;

  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'INDEX.md'), markdown);
  console.log(`\n📄 Index saved to: ${path.join(SCREENSHOT_DIR, 'INDEX.md')}`);
}

async function testDashboardStates(page: Page): Promise<void> {
  console.log('\n📊 Testing Dashboard States...');

  // Main dashboard view
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await takeScreenshot(page, 'dashboard_main', 'Main dashboard view with sidebar and chat', 'Dashboard');

  // Sidebar interactions
  const sidebar = page.locator('.sidebar, [class*="sidebar"], aside').first();
  if (await sidebar.isVisible().catch(() => false)) {
    await takeScreenshot(page, 'sidebar_open', 'Sidebar with flight requests list', 'Navigation');
  }

  // Flight request cards
  const flightCards = page.locator('[class*="Flight Request"], [class*="flight-request"]');
  const cardCount = await flightCards.count();
  if (cardCount > 0) {
    // Hover on first card
    await flightCards.first().hover();
    await page.waitForTimeout(300);
    await takeScreenshot(page, 'flight_card_hover', 'Flight request card on hover', 'Navigation');

    // Click first card
    await flightCards.first().click();
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'flight_card_selected', 'Selected flight request details', 'Navigation');
  }

  // New button
  const newButton = page.locator('button:has-text("New"), [class*="New"]').first();
  if (await newButton.isVisible().catch(() => false)) {
    await newButton.hover();
    await page.waitForTimeout(200);
    await takeScreenshot(page, 'new_button_hover', 'New button hover state', 'Navigation');
  }
}

async function testChatInteraction(page: Page): Promise<void> {
  console.log('\n💬 Testing Chat Interaction...');

  // Navigate to clean state (landing page)
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Find chat input on landing page
  const chatInput = page.locator('input[placeholder*="message"], input[placeholder*="chat"], textarea').first();

  if (await chatInput.isVisible().catch(() => false)) {
    // Landing page with suggested prompts
    await takeScreenshot(page, 'chat_empty', 'Landing page with chat suggestions', 'Chat');

    // Focus on input
    await chatInput.click();
    await page.waitForTimeout(300);
    await takeScreenshot(page, 'chat_input_focused', 'Chat input with focus indicator', 'Chat');

    // Type a realistic RFP message
    const rfpMessage = 'I need a private jet from Los Angeles to New York for 6 passengers on December 15th';
    await chatInput.fill(rfpMessage);
    await page.waitForTimeout(500);
    await takeScreenshot(page, 'chat_message_typed', 'Chat with typed RFP message', 'Chat');

    // Submit the form to start a new chat
    console.log('   📝 Submitting message to start new chat...');

    // Press Enter to submit the form (more reliable than clicking)
    await chatInput.press('Enter');
    console.log('   ✉️ Form submitted via Enter key!');

    // Wait for transition to chat interface
    console.log('   ⏳ Waiting for chat interface to load...');
    await page.waitForTimeout(2000);

    // Capture the state right after submission
    await takeScreenshot(page, 'chat_sending', 'State after message submitted', 'Chat');

    // Check if we're now in chat view (look for ChatInterface elements)
    const chatMessages = page.locator('[class*="message-bubble"], [class*="chat-message"], [class*="MessageBubble"]');
    const messageCount = await chatMessages.count();
    console.log(`   📊 Messages found in chat: ${messageCount}`);

    if (messageCount > 0) {
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'chat_ai_response', 'Chat conversation with AI response', 'Chat');
      console.log('   ✅ Chat response captured!');

      // Scroll to show the full conversation
      await page.evaluate(() => {
        const scrollContainer = document.querySelector('[class*="overflow-y-auto"]');
        if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
      });
      await page.waitForTimeout(500);
      await takeScreenshot(page, 'chat_conversation_full', 'Full chat conversation scrolled', 'Chat');
    } else {
      // Maybe we need different selectors - try broader search
      console.log('   🔍 Looking for any chat-like content...');
      const anyText = await page.locator('main').innerText().catch(() => '');
      console.log(`   📄 Main content preview: ${anyText.substring(0, 200)}...`);
      await takeScreenshot(page, 'chat_current_state', 'Current chat state', 'Chat');
    }
  } else {
    console.log('   ⚠️ Chat input not found on landing page');
    await takeScreenshot(page, 'chat_input_missing', 'Landing page without chat input', 'Chat');
  }

  // Navigate back to landing to test quick action buttons
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Test suggested prompt buttons
  const suggestedPrompts = page.locator('button:has-text("book a flight"), button:has-text("I want to help")');
  if ((await suggestedPrompts.count()) > 0) {
    await suggestedPrompts.first().hover();
    await page.waitForTimeout(200);
    await takeScreenshot(page, 'quick_action_hover', 'Suggested prompt hover state', 'Chat');

    // Click the suggested prompt to start a chat
    await suggestedPrompts.first().click();
    await page.waitForTimeout(2000);
    await takeScreenshot(page, 'quick_action_chat', 'Chat started from suggested prompt', 'Chat');
  }
}

async function testUserMenu(page: Page): Promise<void> {
  console.log('\n👤 Testing User Menu...');

  await page.goto(APP_URL, { waitUntil: 'networkidle' });

  // Find and click user button
  const userButton = page.locator('[class*="UserButton"], [class*="user-button"], button[aria-label*="user"], .cl-userButtonTrigger').first();
  if (await userButton.isVisible().catch(() => false)) {
    await userButton.hover();
    await page.waitForTimeout(200);
    await takeScreenshot(page, 'user_button_hover', 'User button hover state', 'User Menu');

    await userButton.click();
    await page.waitForTimeout(500);
    await takeScreenshot(page, 'user_menu_open', 'User menu dropdown open', 'User Menu');

    // Close menu by clicking elsewhere
    await page.keyboard.press('Escape');
  }

  // Test settings
  const settingsButton = page.locator('button:has-text("Settings"), a:has-text("Settings"), [aria-label*="settings"]').first();
  if (await settingsButton.isVisible().catch(() => false)) {
    await settingsButton.click();
    await page.waitForTimeout(500);
    await takeScreenshot(page, 'settings_panel', 'Settings panel/page', 'User Menu');
  }
}

async function testAccessibility(page: Page): Promise<void> {
  console.log('\n♿ Testing Accessibility Features...');

  await page.goto(APP_URL, { waitUntil: 'networkidle' });

  // Skip link
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  const skipLink = page.locator('[data-testid="skip-to-content"]');
  if (await skipLink.isVisible().catch(() => false)) {
    await takeScreenshot(page, 'skip_link_visible', 'Skip to content link on Tab focus', 'Accessibility');
  }

  // Tab through focusable elements
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
  }
  await takeScreenshot(page, 'focus_navigation', 'Focus indicators during keyboard navigation', 'Accessibility');

  // High contrast check (emulated)
  await page.emulateMedia({ forcedColors: 'active' });
  await page.waitForTimeout(500);
  await takeScreenshot(page, 'high_contrast_mode', 'UI in high contrast mode', 'Accessibility');

  // Reset to normal
  await page.emulateMedia({ forcedColors: 'none' });
}

async function testResponsiveViews(page: Page): Promise<void> {
  console.log('\n📱 Testing Responsive Views...');

  await page.goto(APP_URL, { waitUntil: 'networkidle' });

  // Mobile - iPhone SE
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(500);
  await takeScreenshot(page, 'responsive_mobile_se', 'Mobile view (iPhone SE - 375x667)', 'Responsive');

  // Mobile - iPhone 14
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await takeScreenshot(page, 'responsive_mobile_14', 'Mobile view (iPhone 14 - 390x844)', 'Responsive');

  // Tablet portrait
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);
  await takeScreenshot(page, 'responsive_tablet_portrait', 'Tablet portrait view (768x1024)', 'Responsive');

  // Tablet landscape
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(500);
  await takeScreenshot(page, 'responsive_tablet_landscape', 'Tablet landscape view (1024x768)', 'Responsive');

  // Desktop
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(500);
  await takeScreenshot(page, 'responsive_desktop', 'Desktop view (1440x900)', 'Responsive');

  // Wide desktop
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(500);
  await takeScreenshot(page, 'responsive_wide', 'Wide desktop view (1920x1080)', 'Responsive');
}

async function testButtonStates(page: Page): Promise<void> {
  console.log('\n🔘 Testing Button States...');

  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Find all buttons
  const buttons = page.locator('button:visible');
  const buttonCount = await buttons.count();

  console.log(`   Found ${buttonCount} visible buttons`);

  // Capture default state
  await takeScreenshot(page, 'buttons_default', `All buttons in default state (${buttonCount} buttons)`, 'UI States');

  // Test hover on primary buttons
  const primaryButton = page.locator('button[class*="primary"], button[class*="bg-primary"]').first();
  if (await primaryButton.isVisible().catch(() => false)) {
    await primaryButton.hover();
    await page.waitForTimeout(200);
    await takeScreenshot(page, 'button_primary_hover', 'Primary button hover state', 'UI States');
  }

  // Test focus state
  const anyButton = buttons.first();
  if (await anyButton.isVisible().catch(() => false)) {
    await anyButton.focus();
    await page.waitForTimeout(200);
    await takeScreenshot(page, 'button_focus', 'Button focus state with ring', 'UI States');
  }
}

async function testExistingRequests(page: Page): Promise<void> {
  console.log('\n📋 Testing Existing Flight Requests...');

  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Find flight request cards in sidebar
  const requests = page.locator('[class*="Flight Request"]');
  const requestCount = await requests.count();

  if (requestCount > 0) {
    console.log(`   Found ${requestCount} flight requests`);

    // Click on different request types
    const proposalReady = page.locator('text=Proposal Ready').first();
    if (await proposalReady.isVisible().catch(() => false)) {
      await proposalReady.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'request_proposal_ready', 'Flight request with Proposal Ready status', 'Flight Requests');
    }

    const quotesRequest = page.locator('text=Quotes').first();
    if (await quotesRequest.isVisible().catch(() => false)) {
      await quotesRequest.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'request_quotes', 'Flight request with quotes received', 'Flight Requests');
    }

    const pendingRequest = page.locator('text=Pending').first();
    if (await pendingRequest.isVisible().catch(() => false)) {
      await pendingRequest.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'request_pending', 'Flight request with Pending status', 'Flight Requests');
    }
  }
}

async function main(): Promise<void> {
  console.log('🚀 Starting Comprehensive UX Testing\n');
  console.log(`📍 Target URL: ${APP_URL}`);
  console.log(`📁 Screenshots: ${SCREENSHOT_DIR}`);
  console.log(`🔑 Auth data: ${USER_DATA_DIR}\n`);

  const context: BrowserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    slowMo: 30,
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    args: ['--disable-blink-features=AutomationControlled'],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const page: Page = context.pages()[0] || await context.newPage();

  try {
    // Quick auth check
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const isAuthenticated =
      (await page.locator('.cl-userButtonTrigger, [class*="UserButton"]').count()) > 0 ||
      (await page.locator('textarea, [data-testid="chat-input"]').count()) > 0;

    if (!isAuthenticated) {
      console.log('❌ Not authenticated. Please run basic test first to set up auth.');
      await context.close();
      return;
    }

    console.log('✅ Authenticated!\n');

    // Run all test suites
    await testDashboardStates(page);
    await testChatInteraction(page);
    await testUserMenu(page);
    await testExistingRequests(page);
    await testButtonStates(page);
    await testAccessibility(page);
    await testResponsiveViews(page);

    // Generate index
    await generateIndex();

    console.log(`\n✅ Comprehensive UX Testing Complete!`);
    console.log(`📸 Total screenshots: ${screenshotIndex.length}`);
    console.log(`📁 Saved to: ${SCREENSHOT_DIR}`);

    // Brief pause to review
    console.log('\n⏳ Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ Error:', error);
    await takeScreenshot(page, 'error_state', 'Error state capture', 'Errors');
  } finally {
    await context.close();
  }
}

main().catch(console.error);
