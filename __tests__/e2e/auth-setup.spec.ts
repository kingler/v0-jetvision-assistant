import { test, expect } from '@playwright/test';
import * as path from 'path';

const AUTH_STATE_PATH = path.join(process.cwd(), '.auth', 'user.json');

/**
 * Authentication Setup Test
 *
 * This test will:
 * 1. Open the browser (visible, not headless)
 * 2. Navigate to the sign-in page
 * 3. PAUSE and wait for you to manually log in
 * 4. Once logged in, press 'Resume' in Playwright Inspector
 * 5. Save the authentication state for reuse
 *
 * Run with: npx playwright test auth-setup --headed --debug
 */
test('Manual authentication and state capture', async ({ page, context }) => {
  console.log('\n🔐 Authentication Setup\n');
  console.log('Instructions:');
  console.log('1. Browser will open to the sign-in page');
  console.log('2. Log in manually using Google OAuth');
  console.log('3. Wait until you see the main app page');
  console.log('4. Press the "Resume" button in Playwright Inspector\n');

  // Navigate directly to sign-in page
  console.log('📍 Navigating to sign-in page...');
  await page.goto('/sign-in', { waitUntil: 'load', timeout: 60000 });

  // Give page time to fully load Clerk components
  await page.waitForTimeout(3000);

  console.log(`📍 Current URL: ${page.url()}`);

  // Take a screenshot to see what's showing
  await page.screenshot({ path: 'debug-before-login.png', fullPage: true });
  console.log('📸 Debug screenshot saved to: debug-before-login.png');

  console.log('\n⏸️  PAUSED: Please log in manually now');
  console.log('   1. Complete the Google OAuth login in the browser');
  console.log('   2. Wait until you see the main chat interface');
  console.log('   3. Then click "Resume" (▶️) in the Playwright Inspector window\n');

  // Pause for manual authentication
  await page.pause();

  // Verify authentication succeeded
  console.log('\n✓ Checking authentication status...');

  // Wait for redirect to main app (not sign-in page)
  await page.waitForFunction(() => {
    return !window.location.href.includes('sign-in') &&
           !window.location.href.includes('sign-up');
  }, { timeout: 5000 });

  // Verify we're authenticated by checking for user-specific elements
  const isAuthSuccessful = !page.url().includes('sign-in');
  expect(isAuthSuccessful).toBeTruthy();

  console.log('✓ Authentication verified!');
  console.log('✓ Saving authentication state...\n');

  // Save the authenticated state
  await context.storageState({ path: AUTH_STATE_PATH });

  console.log(`✅ Authentication state saved to: ${AUTH_STATE_PATH}`);
  console.log('   This state will be reused for automated screenshot capture\n');
});
