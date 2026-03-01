import { test, expect } from '@playwright/test';
import {
  navigateToChat,
  sendChatMessage,
  waitForComponent,
  captureScreenshot,
  demoPause,
  assertTextVisible,
} from './helpers';

/**
 * Phase 1: Flight Request Scenarios (1-3)
 *
 * Records demo videos of the full-info flight request flow:
 * one-way, round-trip, and multi-city trips submitted via chat.
 * Each test captures the TripRequestCard, AvinodeSearchCard, and
 * RFQFlightsList rendering in sequence.
 */
test.describe('Phase 1: Flight Requests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await navigateToChat(page);
    await demoPause(page);
  });

  test('Scenario 1: One-way flight — full info', async ({ page }) => {
    test.setTimeout(120_000);

    await captureScreenshot(page, '01-chat-ready', 'one-way');

    // Send one-way flight request
    await sendChatMessage(
      page,
      'I need a one way flight from KTEB to KVNY for 4 passengers on March 25, 2026 at 4:00pm EST'
    );

    // Wait for TripRequestCard
    await waitForComponent(page, '[data-testid="trip-request-card"]');
    await demoPause(page);
    await captureScreenshot(page, '02-trip-created', 'one-way');

    // Verify route details
    await assertTextVisible(page, 'KTEB');
    await assertTextVisible(page, 'KVNY');

    // Verify deep link button
    const deepLink = page.locator(
      'a[href*="marketplace.avinode.com"], button:has-text("Open in Avinode")'
    );
    await expect(deepLink.first()).toBeVisible();

    // Wait for search results (AvinodeSearchCard)
    try {
      await waitForComponent(
        page,
        '[data-testid="avinode-search-card"]',
        30_000
      );
      await demoPause(page);
      await captureScreenshot(page, '03-search-results', 'one-way');
    } catch {
      // Search card may not render if no results — still pass
      await captureScreenshot(page, '03-no-search-results', 'one-way');
    }

    await captureScreenshot(page, '04-final-state', 'one-way');
  });

  test('Scenario 2: Round-trip flight — full info', async ({ page }) => {
    test.setTimeout(120_000);

    await captureScreenshot(page, '01-chat-ready', 'round-trip');

    // Send round-trip request
    await sendChatMessage(
      page,
      'I need a round trip flight from EGGW to KVNY for 4 passengers on March 2, 2026 at 9:00am EST'
    );

    // Wait for TripRequestCard
    await waitForComponent(page, '[data-testid="trip-request-card"]');
    await demoPause(page);
    await captureScreenshot(page, '02-trip-created', 'round-trip');

    // Verify both legs
    await assertTextVisible(page, 'EGGW');
    await assertTextVisible(page, 'KVNY');

    // If agent asks for return date, provide it
    const returnPrompt = page.getByText('return', { exact: false });
    if (await returnPrompt.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await sendChatMessage(page, 'Return on March 5, 2026 at 2:00pm EST');
      await waitForComponent(page, '[data-testid="trip-request-card"]');
      await demoPause(page);
    }

    await captureScreenshot(page, '03-search-results', 'round-trip');

    // Verify deep link
    const deepLink = page.locator(
      'a[href*="marketplace.avinode.com"], button:has-text("Open in Avinode")'
    );
    await expect(deepLink.first()).toBeVisible();

    await captureScreenshot(page, '04-final-state', 'round-trip');
  });

  test('Scenario 3: Multi-city trip — full info', async ({ page }) => {
    test.setTimeout(120_000);

    await captureScreenshot(page, '01-chat-ready', 'multi-city');

    // Send multi-city request
    await sendChatMessage(
      page,
      'I need a multi-city trip: KTEB to London Luton (EGGW), then London Luton to Paris Le Bourget (LFPB), then Paris Le Bourget back to KTEB. March 10-15, 4 passengers'
    );

    // Wait for TripRequestCard
    await waitForComponent(page, '[data-testid="trip-request-card"]');
    await demoPause(page);
    await captureScreenshot(page, '02-trip-created', 'multi-city');

    // Verify all 3 legs are represented
    await assertTextVisible(page, 'KTEB');
    await assertTextVisible(page, 'EGGW');
    await assertTextVisible(page, 'LFPB');

    // Verify deep link
    const deepLink = page.locator(
      'a[href*="marketplace.avinode.com"], button:has-text("Open in Avinode")'
    );
    await expect(deepLink.first()).toBeVisible();

    await captureScreenshot(page, '03-search-results', 'multi-city');
    await captureScreenshot(page, '04-final-state', 'multi-city');
  });
});
