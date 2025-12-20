import { test, expect, Page } from '@playwright/test';
import { setupClerkTestingToken } from '@clerk/testing/playwright';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Avinode Deeplink Workflow Screenshot Test
 *
 * Captures screenshots of the Avinode deep link workflow based on
 * UX_REQUIREMENTS_AVINODE_WORKFLOW.md documentation.
 *
 * Tests:
 * 1. Flight request submission
 * 2. Deep link display (Trip ID + "Open in Avinode" button)
 * 3. Workflow visualization with pending action state
 * 4. Quote reception UI
 */

const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots', 'avinode-deeplink-workflow');
const AUTH_FILE = path.join(process.cwd(), '.auth', 'user.json');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function captureScreenshot(page: Page, name: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${name}-${timestamp}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot: ${filename}`);
  return filepath;
}

async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
}

test.describe('Avinode Deeplink Workflow Screenshots', () => {
  test.setTimeout(180000); // 3 minutes

  // Use stored auth state if available
  test.use({
    storageState: fs.existsSync(AUTH_FILE) ? AUTH_FILE : undefined,
  });

  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test('Capture complete Avinode deeplink workflow', async ({ page }) => {
    console.log('\n=== Avinode Deeplink Workflow Screenshot Capture ===\n');

    // Step 1: Navigate to app
    console.log('Step 1: Navigate to main page');
    await page.goto('/');
    await waitForPageLoad(page);

    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // Check if authenticated
    if (currentUrl.includes('sign-in')) {
      console.log('❌ Not authenticated - capturing sign-in page');
      await captureScreenshot(page, '00-sign-in-required');
      console.log('\nTo run authenticated tests:');
      console.log('1. Run: npx playwright test auth-setup.spec.ts');
      console.log('2. Or manually save auth state to .auth/user.json');
      test.skip(true, 'Authentication required');
      return;
    }

    await captureScreenshot(page, '01-authenticated-landing');

    // Step 2: Find chat input
    console.log('\nStep 2: Locate chat interface');
    const chatInput = page.locator(
      'textarea[placeholder*="Message"], textarea[placeholder*="message"], input[placeholder*="message"]'
    ).first();

    if (!(await chatInput.isVisible({ timeout: 10000 }).catch(() => false))) {
      console.log('Chat input not found on landing page');
      await captureScreenshot(page, '02-no-chat-input');
      return;
    }

    await captureScreenshot(page, '02-chat-interface-ready');

    // Step 3: Submit flight request (triggers deep link workflow)
    console.log('\nStep 3: Submit Avinode flight request');
    const flightRequest = 'I need a private jet from Teterboro (KTEB) to Los Angeles (KLAX) for 6 passengers on January 25th, 2025';

    await chatInput.focus();
    await chatInput.fill(flightRequest);
    await captureScreenshot(page, '03-flight-request-typed');

    // Submit the request
    const sendButton = page.locator('button[type="submit"], button[aria-label*="send"]').first();
    if (await sendButton.isVisible({ timeout: 3000 })) {
      await sendButton.click();
    } else {
      await chatInput.press('Enter');
    }

    console.log('Flight request submitted');
    await captureScreenshot(page, '04-request-submitted');

    // Step 4: Wait for AI processing
    console.log('\nStep 4: Wait for Avinode processing');
    await page.waitForTimeout(3000);

    // Look for workflow visualization
    const workflowViz = page.locator('[class*="workflow"], [data-testid*="workflow"]');
    if (await workflowViz.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await captureScreenshot(page, '05-workflow-visualization');
    }

    // Wait for response
    await page.waitForTimeout(5000);
    await captureScreenshot(page, '06-ai-response');

    // Step 5: Check for Avinode deep link elements
    console.log('\nStep 5: Check for Avinode deep link elements');

    // Look for Trip ID display
    const tripIdElement = page.locator(
      '[data-testid="trip-id"], [class*="trip-id"], text=/trp[0-9]+/i, text=/Trip.*ID/i'
    );

    // Look for "Open in Avinode" button/link
    const avinodeLink = page.locator(
      'a[href*="avinode"], button:has-text("Avinode"), button:has-text("Open in Avinode"), [data-testid="avinode-deep-link"]'
    );

    // Look for action required banner
    const actionRequired = page.locator(
      '[class*="action-required"], [data-testid="action-required"], text=/action required/i'
    );

    const hasTripId = await tripIdElement.first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasAvinodeLink = await avinodeLink.first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasActionRequired = await actionRequired.first().isVisible({ timeout: 3000 }).catch(() => false);

    console.log('\n=== Deep Link Elements Status ===');
    console.log(`Trip ID display: ${hasTripId ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`Avinode link/button: ${hasAvinodeLink ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`Action Required banner: ${hasActionRequired ? '✅ FOUND' : '❌ NOT FOUND'}`);

    if (hasTripId || hasAvinodeLink) {
      await captureScreenshot(page, '07-deeplink-elements-visible');

      // Extract the deep link URL if found
      if (hasAvinodeLink) {
        const href = await avinodeLink.first().getAttribute('href');
        console.log(`\n🔗 Deep Link URL: ${href}`);
      }

      // Extract Trip ID if visible
      if (hasTripId) {
        const tripIdText = await tripIdElement.first().textContent();
        console.log(`🎫 Trip ID: ${tripIdText}`);
      }
    }

    // Step 6: Check sidebar for trip info
    console.log('\nStep 6: Check sidebar for trip information');
    const sidebar = page.locator('[class*="sidebar"], aside').first();

    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Look for trip badge in sidebar
      const tripBadge = sidebar.locator('[class*="trip"], [class*="avinode"], text=/trp/i');
      if (await tripBadge.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await captureScreenshot(page, '08-sidebar-with-trip');
      }
    }

    // Step 7: Check for quote/proposal cards
    console.log('\nStep 7: Check for quote display elements');
    const quoteCard = page.locator(
      '[class*="quote"], [class*="proposal"], [data-testid*="quote"], text=/\\$[0-9,]+/i'
    );

    if (await quoteCard.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await captureScreenshot(page, '09-quote-card-visible');
      console.log('✅ Quote/Proposal card found');
    }

    // Step 8: Check for webhook status indicator
    console.log('\nStep 8: Check for real-time status indicators');
    const webhookStatus = page.locator(
      '[data-testid="webhook-status"], [class*="connection-status"], [role="status"]'
    );

    if (await webhookStatus.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      const statusText = await webhookStatus.first().textContent();
      console.log(`📡 Webhook Status: ${statusText}`);
      await captureScreenshot(page, '10-webhook-status');
    }

    // Final screenshot
    await captureScreenshot(page, '11-final-state');

    // Step 9: Analyze page content for deep link references
    console.log('\n=== Page Content Analysis ===');
    const pageContent = await page.content();

    const indicators = {
      'avinode': pageContent.toLowerCase().includes('avinode'),
      'deep_link': pageContent.includes('deep_link') || pageContent.includes('deepLink'),
      'trip_id': pageContent.includes('trip_id') || pageContent.includes('tripId') || /trp[0-9]+/i.test(pageContent),
      'pending_action': pageContent.toLowerCase().includes('pending') || pageContent.toLowerCase().includes('action'),
      'webhook': pageContent.toLowerCase().includes('webhook'),
    };

    console.log('Content contains:');
    for (const [key, found] of Object.entries(indicators)) {
      console.log(`  ${key}: ${found ? '✅' : '❌'}`);
    }

    console.log('\n=== Screenshot capture complete ===');
    console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);
  });

  test('Capture empty state with quick actions', async ({ page }) => {
    console.log('\n=== Empty State & Quick Actions ===\n');

    await page.goto('/');
    await waitForPageLoad(page);

    if (page.url().includes('sign-in')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Look for quick action buttons
    const quickActions = page.locator('button').filter({
      hasText: /book|flight|connect|trip|new/i,
    });

    const actionCount = await quickActions.count();
    console.log(`Found ${actionCount} quick action buttons`);

    if (actionCount > 0) {
      await captureScreenshot(page, 'quick-actions-visible');

      // Check for "Connect Trip" button specifically
      const connectTripBtn = page.locator('button:has-text("Connect Trip")');
      if (await connectTripBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('✅ Connect Trip button found');
        await connectTripBtn.click();
        await page.waitForTimeout(1000);
        await captureScreenshot(page, 'connect-trip-dialog');
      }
    }
  });

  test('Capture responsive views of deeplink UI', async ({ page }) => {
    console.log('\n=== Responsive Screenshots ===\n');

    await page.goto('/');
    await waitForPageLoad(page);

    if (page.url().includes('sign-in')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Desktop (1920x1080)
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    await captureScreenshot(page, 'responsive-desktop-1920');

    // Laptop (1366x768)
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(500);
    await captureScreenshot(page, 'responsive-laptop-1366');

    // Tablet (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await captureScreenshot(page, 'responsive-tablet-768');

    // Mobile (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await captureScreenshot(page, 'responsive-mobile-375');

    console.log('✅ Responsive screenshots captured');
  });
});
