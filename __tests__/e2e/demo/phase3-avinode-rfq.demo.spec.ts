import { test, expect, Page, BrowserContext } from '@playwright/test';
import {
  navigateToChat,
  sendChatMessage,
  waitForComponent,
  captureScreenshot,
  demoPause,
  waitForPageLoad,
} from './helpers';

/**
 * Phase 3: Avinode RFQ Scenarios (7-8)
 *
 * Records demo videos of the Avinode Marketplace interaction:
 * opening the deep link, sending an RFQ, switching to the
 * Operator role, and approving a quote.
 *
 * NOTE: These tests interact with the live Avinode Sandbox.
 * They require valid sandbox credentials and a running dev server.
 */
test.describe('Phase 3: Avinode RFQ & Operator Quote', () => {
  test.describe.configure({ mode: 'serial' });

  let jetvisionPage: Page;

  test.beforeAll(async ({ browser }) => {
    // Create a persistent context for Jetvision
    const context = await browser.newContext();
    jetvisionPage = await context.newPage();
  });

  test('Scenario 7: Send RFQ via Avinode Marketplace', async ({ page, context }) => {
    test.setTimeout(180_000);

    // Step 1: Create a trip in Jetvision first
    await navigateToChat(page);
    await sendChatMessage(
      page,
      'I need a one way flight from KTEB to KVNY for 4 passengers on March 25, 2026 at 4:00pm EST'
    );

    // Wait for trip card with deep link
    await waitForComponent(page, '[data-testid="trip-request-card"]');
    await demoPause(page);
    await captureScreenshot(page, '01-trip-card-marketplace-button', 'avinode-rfq');

    // Step 2: Click the "Open in Avinode Marketplace" button
    const deepLinkButton = page.locator(
      'a[href*="marketplace.avinode.com"], button:has-text("Open in Avinode")'
    ).first();

    // Get the deep link URL for potential fallback
    const deepLinkUrl = await deepLinkButton.getAttribute('href');

    // Open in new tab via context
    const [avinodePage] = await Promise.all([
      context.waitForEvent('page'),
      deepLinkButton.click(),
    ]).catch(async () => {
      // Fallback: open manually if click doesn't create new tab
      const newPage = await context.newPage();
      if (deepLinkUrl) {
        await newPage.goto(deepLinkUrl);
      }
      return [newPage];
    });

    await avinodePage.waitForLoadState('load');
    await demoPause(avinodePage, 2000);
    await captureScreenshot(avinodePage, '02-marketplace-flights-loaded', 'avinode-rfq');

    // Step 3: Check if login is needed (session should be pre-authenticated)
    const isLoginPage = await avinodePage
      .locator('input[type="password"], input[name="password"]')
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    if (isLoginPage) {
      // Fallback: login with sandbox credentials
      await avinodePage.fill('input[name="email"], input[type="email"]', 'kingler@me.com');
      await avinodePage.fill('input[type="password"]', '2FRhgGZK3wSy8SY');
      await avinodePage.click('button[type="submit"]');
      await avinodePage.waitForLoadState('load');
      await demoPause(avinodePage, 2000);
    }

    // Step 4: Filter by Sandbox Dev Operator (if filter is available)
    try {
      const sellerFilter = avinodePage.locator(
        'select:has-text("Sandbox"), [data-testid="seller-filter"], input[placeholder*="filter" i]'
      );
      if (await sellerFilter.isVisible({ timeout: 5_000 })) {
        await sellerFilter.click();
        await demoPause(avinodePage);
      }
    } catch {
      // Filter may not be available — continue
    }

    await captureScreenshot(avinodePage, '03-seller-filtered', 'avinode-rfq');

    // Step 5: Select flights
    try {
      const flightCheckbox = avinodePage.locator(
        'input[type="checkbox"], .flight-select, tr:has-text("Sandbox")'
      ).first();
      if (await flightCheckbox.isVisible({ timeout: 5_000 })) {
        await flightCheckbox.click();
        await demoPause(avinodePage);
      }
    } catch {
      // Selection method varies by Avinode UI version
    }

    await captureScreenshot(avinodePage, '04-flights-selected', 'avinode-rfq');

    // Step 6: Add message and send RFQ
    try {
      const messageField = avinodePage.locator(
        'textarea, input[placeholder*="message" i]'
      ).first();
      if (await messageField.isVisible({ timeout: 5_000 })) {
        await messageField.fill(
          'Requesting Flight Availability and price quote for these flights'
        );
      }
    } catch {
      // Message field is optional
    }

    // Click Send RFQ
    try {
      await avinodePage
        .locator('button:has-text("Send"), button:has-text("Send RFQ")')
        .first()
        .click();
      await demoPause(avinodePage, 2000);
      await captureScreenshot(avinodePage, '05-rfq-sent-modal', 'avinode-rfq');
    } catch {
      await captureScreenshot(avinodePage, '05-rfq-send-attempted', 'avinode-rfq');
    }

    // Step 7: Click "View in Trips" if confirmation modal appears
    try {
      await avinodePage
        .locator('button:has-text("View in Trips"), a:has-text("View in Trips")')
        .first()
        .click({ timeout: 5_000 });
      await avinodePage.waitForLoadState('load');
      await demoPause(avinodePage, 2000);
    } catch {
      // May auto-navigate
    }

    await captureScreenshot(avinodePage, '06-flight-board', 'avinode-rfq');
    await avinodePage.close();
  });

  test('Scenario 8: Operator approves quote', async ({ page, context }) => {
    test.setTimeout(180_000);

    // Navigate to Avinode Marketplace
    await page.goto('https://marketplace.avinode.com');
    await page.waitForLoadState('load');
    await demoPause(page, 2000);

    // Check login state
    const isLoginPage = await page
      .locator('input[type="password"]')
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    if (isLoginPage) {
      await page.fill('input[name="email"], input[type="email"]', 'kingler@me.com');
      await page.fill('input[type="password"]', '2FRhgGZK3wSy8SY');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('load');
      await demoPause(page, 2000);
    }

    // Step 1: Click avatar/profile to switch account
    try {
      await page
        .locator(
          '[data-testid="account-switcher"], .profile-menu, .user-menu, .avatar, img[alt*="profile" i]'
        )
        .first()
        .click();
      await demoPause(page);
      await captureScreenshot(page, '01-profile-dropdown', 'operator-quote');
    } catch {
      await captureScreenshot(page, '01-profile-area', 'operator-quote');
    }

    // Step 2: Click "Switch Account"
    try {
      await page
        .locator('a:has-text("Switch"), button:has-text("Switch Account")')
        .first()
        .click();
      await page.waitForLoadState('load');
      await demoPause(page, 2000);
      await captureScreenshot(page, '02-account-selection', 'operator-quote');
    } catch {
      await captureScreenshot(page, '02-switch-attempted', 'operator-quote');
    }

    // Step 3: Select Sandbox Dev Operator
    try {
      await page
        .locator(
          'a:has-text("Sandbox"), [data-account*="seller"], li:has-text("Seller"), button:has-text("Sandbox")'
        )
        .first()
        .click();
      await page.waitForLoadState('load');
      await demoPause(page, 2000);
      await captureScreenshot(page, '03-operator-view', 'operator-quote');
    } catch {
      await captureScreenshot(page, '03-operator-selection-attempted', 'operator-quote');
    }

    // Step 4: Navigate to Trips > Selling
    try {
      await page
        .locator('a:has-text("Trips"), [data-nav="trips"]')
        .first()
        .click();
      await demoPause(page);

      await page
        .locator('a:has-text("Selling"), [data-nav="selling"]')
        .first()
        .click();
      await page.waitForLoadState('load');
      await demoPause(page, 2000);
      await captureScreenshot(page, '04-selling-list', 'operator-quote');
    } catch {
      await captureScreenshot(page, '04-selling-navigation', 'operator-quote');
    }

    // Step 5: Find and approve the RFQ
    try {
      await page
        .locator('button:has-text("Approve"), button:has-text("Accept"), button:has-text("Quote")')
        .first()
        .click();
      await demoPause(page, 2000);
      await captureScreenshot(page, '05-approve-confirmation', 'operator-quote');
    } catch {
      await captureScreenshot(page, '05-approve-attempted', 'operator-quote');
    }

    // Step 6: Confirm the response if dialog appears
    try {
      await page
        .locator('button:has-text("Confirm"), button:has-text("Yes")')
        .first()
        .click({ timeout: 5_000 });
      await demoPause(page, 2000);
    } catch {
      // May auto-confirm
    }

    await captureScreenshot(page, '06-quote-approved', 'operator-quote');
  });
});
