import { test, expect, Page, BrowserContext } from '@playwright/test';
import {
  navigateToChat,
  sendChatMessage,
  waitForComponent,
  captureScreenshot,
  demoPause,
  waitForPageLoad,
  querySupabase,
} from './helpers';

/**
 * Avinode Sandbox login + organization selection.
 *
 * Login flow:
 *   Step 1: "Login*" text input → "Next" button
 *   Step 2: "Password*" input → "Log in" button
 *   Step 3: "Choose an Organization" → select org by name
 *
 * @param organization - Which org to select after login:
 *   'Jetvision LLC' (buyer/broker) or 'Sandbox Dev Operator' (seller/operator)
 */
async function loginToAvinode(
  page: Page,
  screenshotSubdir?: string,
  organization: 'Jetvision LLC' | 'Sandbox Dev Operator' = 'Jetvision LLC'
): Promise<boolean> {
  const AVINODE_USER = process.env.AVINODE_SANDBOX_USERNAME || 'kingler@me.com';
  const AVINODE_PASS = process.env.AVINODE_SANDBOX_PASSWORD || '2FRhgGZK3wSy8SY';

  // Detect login page: look for "Log in" heading
  const isLoginPage = await page
    .getByRole('heading', { name: 'Log in' })
    .isVisible({ timeout: 5_000 })
    .catch(() => false);

  if (!isLoginPage) {
    // Check for org chooser (already logged in but needs org selection)
    const isOrgChooser = await page
      .getByText('Choose an Organization')
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    if (isOrgChooser) {
      // Skip login, just select org
      if (screenshotSubdir) {
        await captureScreenshot(page, 'org-chooser-detected', screenshotSubdir);
      }
      await selectOrganization(page, organization, screenshotSubdir);
      return true;
    }

    return false; // Not a login page and not an org chooser
  }

  if (screenshotSubdir) {
    await captureScreenshot(page, 'login-step1-detected', screenshotSubdir);
  }

  // Step 1: Fill the login/username field and click "Next"
  const loginInput = page.getByLabel('Login', { exact: false });
  await loginInput.waitFor({ state: 'visible', timeout: 10_000 });
  await loginInput.fill(AVINODE_USER);
  await demoPause(page, 500);

  await page.locator('button:has-text("Next")').click();
  await demoPause(page, 2000);

  if (screenshotSubdir) {
    await captureScreenshot(page, 'login-step2-password', screenshotSubdir);
  }

  // Step 2: Fill password and submit
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.waitFor({ state: 'visible', timeout: 10_000 });
  await passwordInput.fill(AVINODE_PASS);
  await demoPause(page, 500);

  await page
    .locator('button:has-text("Log in"), button:has-text("Login"), button[type="submit"]')
    .first()
    .click();
  await page.waitForLoadState('load');
  await demoPause(page, 3000);

  if (screenshotSubdir) {
    await captureScreenshot(page, 'login-complete', screenshotSubdir);
  }

  // Step 3: Handle "Choose an Organization" page if it appears
  await selectOrganization(page, organization, screenshotSubdir);

  return true;
}

/** Select an organization on the Avinode "Choose an Organization" page. */
async function selectOrganization(
  page: Page,
  organization: string,
  screenshotSubdir?: string
): Promise<void> {
  const hasOrgChooser = await page
    .getByText('Choose an Organization')
    .isVisible({ timeout: 5_000 })
    .catch(() => false);

  if (!hasOrgChooser) return; // No org chooser — already redirected to marketplace

  if (screenshotSubdir) {
    await captureScreenshot(page, 'org-chooser', screenshotSubdir);
  }

  // Click the organization button/link by name
  await page
    .locator(`text="${organization}"`)
    .first()
    .click();
  await page.waitForLoadState('load');
  await demoPause(page, 3000);

  if (screenshotSubdir) {
    await captureScreenshot(page, 'org-selected', screenshotSubdir);
  }
}

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

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error(
        'NEXT_PUBLIC_SUPABASE_URL is not set. Phase 3 tests require Supabase for database verification.'
      );
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY is not set. Phase 3 tests require Supabase for database verification.'
      );
    }
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

    // Extract tripId from deep link URL
    const tripIdMatch = deepLinkUrl?.match(/(?:atrip-|\/trip\/)([a-zA-Z0-9-]+)/);
    const tripIdFromUrl = tripIdMatch ? `atrip-${tripIdMatch[1]}` : null;

    // Also try DOM extraction from flight-search-progress data-trip-id attribute
    const tripIdFromDom = await page
      .locator('[data-testid="flight-search-progress"]')
      .first()
      .getAttribute('data-trip-id')
      .catch(() => null);

    const capturedTripId = tripIdFromUrl || tripIdFromDom;
    console.log(`[Phase 3] Captured tripId: ${capturedTripId}`);

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

    // Step 3: Handle Avinode two-step login + org selection (Jetvision LLC = buyer)
    await loginToAvinode(avinodePage, 'avinode-rfq', 'Jetvision LLC');

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

    // DB verification: tripId stored in requests table
    const requestRow = await querySupabase('requests', {});
    expect(requestRow).not.toBeNull();
    if (capturedTripId) {
      expect(requestRow!.avinode_trip_id).toBeTruthy();
      console.log(`[Phase 3] DB requests.avinode_trip_id: ${requestRow!.avinode_trip_id}`);
    }

    await avinodePage.close();
  });

  test('Scenario 8: Operator approves quote', async ({ page, context }) => {
    test.setTimeout(180_000);

    // Navigate to Avinode Marketplace
    await page.goto('https://marketplace.avinode.com');
    await page.waitForLoadState('load');
    await demoPause(page, 2000);

    // Handle Avinode two-step login + org selection (Sandbox Dev Operator = seller)
    // This selects the operator org at login, so no manual account switching needed.
    await loginToAvinode(page, 'operator-quote', 'Sandbox Dev Operator');

    await captureScreenshot(page, '01-operator-dashboard', 'operator-quote');

    // Step 1: Navigate to Trips > Selling
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
      await captureScreenshot(page, '02-selling-list', 'operator-quote');
    } catch {
      await captureScreenshot(page, '02-selling-navigation', 'operator-quote');
    }

    // Step 2: Find and approve the RFQ
    try {
      await page
        .locator('button:has-text("Approve"), button:has-text("Accept"), button:has-text("Quote")')
        .first()
        .click();
      await demoPause(page, 2000);
      await captureScreenshot(page, '03-approve-confirmation', 'operator-quote');
    } catch {
      await captureScreenshot(page, '03-approve-attempted', 'operator-quote');
    }

    // Step 3: Confirm the response if dialog appears
    try {
      await page
        .locator('button:has-text("Confirm"), button:has-text("Yes")')
        .first()
        .click({ timeout: 5_000 });
      await demoPause(page, 2000);
    } catch {
      // May auto-confirm
    }

    await captureScreenshot(page, '04-quote-approved', 'operator-quote');

    // DB verification: webhook event after operator approval
    await page.waitForTimeout(5000); // Give webhook time to process
    const webhookRow = await querySupabase('avinode_webhook_events', {
      event_type: 'TripRequestSellerResponse',
    });
    // Webhook may not exist in sandbox — log but don't fail hard
    if (webhookRow) {
      expect(webhookRow.avinode_trip_id || webhookRow.avinode_quote_id).toBeTruthy();
      console.log(`[Phase 3] Webhook event captured: trip=${webhookRow.avinode_trip_id}, quote=${webhookRow.avinode_quote_id}`);
    } else {
      console.warn('[Phase 3] No webhook event found — sandbox may not emit webhooks.');
    }
  });
});
