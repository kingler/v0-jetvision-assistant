/**
 * UX Testing Script with Persistent Authentication
 *
 * This script uses Playwright persistent context to maintain
 * authentication state across sessions. On first run, sign in
 * manually. Subsequent runs will reuse the session.
 *
 * Usage: npx tsx scripts/ux-auth-testing.ts
 */

import { chromium, Page, BrowserContext } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots/ux-analysis/authenticated');
const USER_DATA_DIR = path.join(process.cwd(), '.playwright-auth');
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const AUTH_TIMEOUT = 300000; // 5 minutes for manual auth

// Ensure directories exist
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}
if (!fs.existsSync(USER_DATA_DIR)) {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}

async function takeScreenshot(page: Page, name: string, fullPage = true): Promise<void> {
  const filename = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filename, fullPage });
  console.log(`📸 Screenshot saved: ${filename}`);
}

async function waitForAuthentication(page: Page, context: BrowserContext): Promise<boolean> {
  console.log('🔐 Checking authentication status...');

  // Wait a moment for any redirects
  await page.waitForTimeout(2000);

  // Check if we're on the app and already authenticated
  const url = page.url();
  if (url.includes('localhost:3000') && !url.includes('sign-in')) {
    // Look for authenticated UI elements
    const hasAuthUI = await page.locator('[data-testid="user-button"], [class*="UserButton"], button[aria-label*="user"], .cl-userButtonTrigger').count() > 0;
    if (hasAuthUI) {
      console.log('✅ Already authenticated (found user button)!');
      return true;
    }

    // Check if there's a chat interface (authenticated view)
    const hasChatUI = await page.locator('textarea, [data-testid="chat-input"], input[placeholder*="message"]').count() > 0;
    if (hasChatUI) {
      console.log('✅ Already authenticated (found chat interface)!');
      return true;
    }
  }

  // Check if we're on a sign-in page
  const isSignInPage = url.includes('clerk') ||
                       url.includes('sign-in') ||
                       await page.locator('text=Sign in to Jetvision').count() > 0;

  if (isSignInPage) {
    console.log('⏳ Sign-in page detected. Attempting authentication...');

    // Check if we're on Clerk's sign-in page
    const clerkEmailInput = page.locator('input[name="identifier"], input[placeholder*="email"]').first();
    if (await clerkEmailInput.count() > 0) {
      console.log('📧 Found Clerk sign-in form, entering email...');
      await clerkEmailInput.fill('kinglerbercy@gmail.com');

      // Click continue button
      const continueBtn = page.locator('button:has-text("Continue")').first();
      if (await continueBtn.count() > 0) {
        await continueBtn.click();
        console.log('   Clicked Continue, waiting for redirect...');
        await page.waitForTimeout(3000);
      }
    }

    // Check if we're now on Google's sign-in page (redirected from Clerk)
    let currentUrl = page.url();
    if (currentUrl.includes('accounts.google.com') || currentUrl.includes('google.com/')) {
      console.log('🔵 Google sign-in page detected...');

      // Look for email input on Google
      const googleEmailInput = page.locator('input[type="email"]').first();
      if (await googleEmailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('   Entering email on Google...');
        await googleEmailInput.fill('kinglerbercy@gmail.com');

        // Click Next button
        const nextBtn = page.locator('#identifierNext button, button:has-text("Next")').first();
        if (await nextBtn.count() > 0) {
          await nextBtn.click();
          await page.waitForTimeout(3000);
        }
      }

      // Check for passkey verification page and click "Try another way"
      const tryAnotherWay = page.locator('text=Try another way').first();
      if (await tryAnotherWay.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('   Passkey page detected, clicking "Try another way"...');
        await tryAnotherWay.click();
        await page.waitForTimeout(3000);

        // Select password option - look for various text patterns
        const passwordOption = page.locator('[data-challengetype="12"], li:has-text("password"), div[role="link"]:has-text("password"), button:has-text("password")').first();
        if (await passwordOption.isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log('   Selecting password option...');
          await passwordOption.click();
          await page.waitForTimeout(2000);
        } else {
          // Try clicking on "Enter your password" text
          const enterPassword = page.locator('text=Enter your password').first();
          if (await enterPassword.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('   Clicking "Enter your password"...');
            await enterPassword.click();
            await page.waitForTimeout(2000);
          }
        }
      }

      // Look for password input on Google
      const googlePasswordInput = page.locator('input[type="password"][name="Passwd"], input[type="password"]:visible').first();
      if (await googlePasswordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('   Entering password on Google...');
        await googlePasswordInput.fill('kuxbEw-zixwut-pinzi2');

        // Click Next button for password
        const passNextBtn = page.locator('#passwordNext button, button:has-text("Next")').first();
        if (await passNextBtn.count() > 0) {
          await passNextBtn.click();
          console.log('   Submitted password, waiting for redirect...');
        }
      }
    }

    // Wait for redirect back to app
    console.log('   Waiting for authentication redirect to app...');
    try {
      await page.waitForFunction(
        () => {
          const loc = window.location.href;
          return loc.includes('localhost:3000') &&
                 !loc.includes('sign-in') &&
                 !loc.includes('clerk');
        },
        { timeout: AUTH_TIMEOUT }
      );
      console.log('✅ Authentication successful!');
      await page.waitForTimeout(3000);
      return true;
    } catch (e) {
      console.log('❌ Authentication timeout.');
      return false;
    }
  }

  console.log('⚠️ Authentication status unclear. Please verify in browser.');
  return true;
}

async function testDashboard(page: Page): Promise<void> {
  console.log('\n📊 Testing Dashboard...');
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await takeScreenshot(page, '01_dashboard_main');

  // Check for main UI elements
  const chatInput = page.locator('[data-testid="chat-input"], input[placeholder*="message"], textarea');
  if (await chatInput.count() > 0) {
    console.log('   ✓ Chat input found');
    await takeScreenshot(page, '02_chat_interface');
  }
}

async function testWorkflowVisualization(page: Page): Promise<void> {
  console.log('\n🔄 Testing Workflow Visualization...');

  // Look for workflow elements
  const workflow = page.locator('[data-testid="workflow-progress"], .workflow-visualization, [role="list"][aria-label*="Workflow"]');
  if (await workflow.count() > 0) {
    await workflow.scrollIntoViewIfNeeded();
    await takeScreenshot(page, '03_workflow_visualization');
    console.log('   ✓ Workflow visualization captured');
  }
}

async function testQuoteCards(page: Page): Promise<void> {
  console.log('\n💰 Testing Quote Cards...');

  const quoteCards = page.locator('[data-testid="quote-card"], .quote-card');
  if (await quoteCards.count() > 0) {
    await takeScreenshot(page, '04_quote_cards');
    console.log(`   ✓ Found ${await quoteCards.count()} quote cards`);

    // Click on first quote card if available
    const firstCard = quoteCards.first();
    await firstCard.click();
    await page.waitForTimeout(500);
    await takeScreenshot(page, '05_quote_card_selected');
  }
}

async function testAccessibilityFeatures(page: Page): Promise<void> {
  console.log('\n♿ Testing Accessibility Features...');

  // Test skip link
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  const skipLink = page.locator('[data-testid="skip-to-content"]');
  if (await skipLink.isVisible()) {
    await takeScreenshot(page, '06_skip_link_visible');
    console.log('   ✓ Skip-to-content link working');
  }

  // Test focus indicators
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await takeScreenshot(page, '07_focus_indicators');
  console.log('   ✓ Focus indicators captured');
}

async function testChatInteraction(page: Page): Promise<void> {
  console.log('\n💬 Testing Chat Interaction...');

  const chatInput = page.locator('[data-testid="chat-input"], input[placeholder*="message"], textarea').first();
  if (await chatInput.count() > 0) {
    await chatInput.click();
    await chatInput.fill('I need a private jet from New York to Miami for 6 passengers');
    await takeScreenshot(page, '08_chat_message_typed');
    console.log('   ✓ Chat input tested');

    // Don't submit - just capture the state
    // Clear the input
    await chatInput.clear();
  }
}

async function testResponsiveViews(page: Page): Promise<void> {
  console.log('\n📱 Testing Responsive Views...');

  // Mobile viewport
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  await takeScreenshot(page, '09_mobile_view');
  console.log('   ✓ Mobile view captured');

  // Tablet viewport
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);
  await takeScreenshot(page, '10_tablet_view');
  console.log('   ✓ Tablet view captured');

  // Desktop viewport (restore)
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(500);
  await takeScreenshot(page, '11_desktop_view');
  console.log('   ✓ Desktop view captured');
}

async function testAvinodeComponents(page: Page): Promise<void> {
  console.log('\n✈️ Testing Avinode Components...');

  // Look for Avinode-specific UI elements
  const avinodeElements = page.locator('[class*="avinode"], [data-testid*="avinode"]');
  if (await avinodeElements.count() > 0) {
    await takeScreenshot(page, '12_avinode_components');
    console.log(`   ✓ Found ${await avinodeElements.count()} Avinode elements`);
  }

  // Deep link prompt
  const deepLinkPrompt = page.locator('[data-testid="deep-link-prompt"]');
  if (await deepLinkPrompt.count() > 0) {
    await takeScreenshot(page, '13_deep_link_prompt');
    console.log('   ✓ Deep link prompt found');
  }

  // Webhook status indicator
  const webhookStatus = page.locator('[data-testid="webhook-status"]');
  if (await webhookStatus.count() > 0) {
    await takeScreenshot(page, '14_webhook_status');
    console.log('   ✓ Webhook status indicator found');
  }
}

async function main(): Promise<void> {
  console.log('🚀 Starting Jetvision UX Testing with Persistent Authentication\n');
  console.log(`📍 Target URL: ${APP_URL}`);
  console.log(`📁 Screenshots will be saved to: ${SCREENSHOT_DIR}`);
  console.log(`🔑 Auth data stored in: ${USER_DATA_DIR}\n`);

  // Use persistent context to maintain auth state across sessions
  const context: BrowserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, // Visible browser window
    slowMo: 50,
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    // Allow popups for Google OAuth
    args: ['--disable-blink-features=AutomationControlled'],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const page: Page = context.pages()[0] || await context.newPage();

  try {
    // Navigate to app
    console.log('🌐 Navigating to application...');
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Handle authentication
    const isAuthenticated = await waitForAuthentication(page, context);

    if (!isAuthenticated) {
      console.log('\n⚠️ Authentication not completed. Taking screenshot of current state.');
      await takeScreenshot(page, '00_auth_required');
      console.log('\n📝 Instructions:');
      console.log('   1. Complete sign-in in the browser window');
      console.log('   2. Once authenticated, press Ctrl+C to stop');
      console.log('   3. Run this script again - auth will be remembered!\n');
      // Keep browser open for manual interaction
      await page.waitForTimeout(300000); // 5 minutes
      return;
    }

    // Wait for app to fully load after auth
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Run all tests
    await testDashboard(page);
    await testWorkflowVisualization(page);
    await testQuoteCards(page);
    await testAccessibilityFeatures(page);
    await testChatInteraction(page);
    await testResponsiveViews(page);
    await testAvinodeComponents(page);

    console.log('\n✅ UX Testing Complete!');
    console.log(`📁 Screenshots saved to: ${SCREENSHOT_DIR}`);

    // Keep browser open briefly to review
    console.log('\n⏳ Browser will close in 10 seconds...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Error during testing:', error);
    try {
      await takeScreenshot(page, 'error_state');
    } catch {
      // Ignore screenshot errors if page is closed
    }
  } finally {
    await context.close();
  }
}

main().catch(console.error);
