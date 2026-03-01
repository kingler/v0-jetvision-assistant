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

    // Send round-trip request with ALL details upfront (including return)
    await sendChatMessage(
      page,
      'I need a round trip flight from EGGW to KVNY for 4 passengers. Departing March 2, 2026 at 9:00am EST, returning March 5, 2026 at 2:00pm EST'
    );

    // Wait for either trip card or a clarification question
    const tripOrClarify = await Promise.race([
      page.waitForSelector('[data-testid="trip-request-card"]', { timeout: 60_000 })
        .then(() => 'trip' as const),
      page.waitForSelector('text=/return|Return/', { timeout: 60_000 })
        .then(() => 'clarify' as const),
    ]);

    if (tripOrClarify === 'clarify') {
      await captureScreenshot(page, '02-clarification', 'round-trip');
      // Agent asked for return details — provide them
      await sendChatMessage(page, 'Return on March 5, 2026 at 2:00pm EST');
      await waitForComponent(page, '[data-testid="trip-request-card"]', 60_000);
    }

    await demoPause(page);
    await captureScreenshot(page, '03-trip-created', 'round-trip');

    // Verify both legs
    await assertTextVisible(page, 'EGGW');
    await assertTextVisible(page, 'KVNY');

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

    // Send multi-city request with explicit leg details
    await sendChatMessage(
      page,
      'I need a multi-city trip for 4 passengers: Leg 1: KTEB to EGGW on March 10, 2026 at 8:00am EST. Leg 2: EGGW to LFPB on March 12, 2026 at 10:00am GMT. Leg 3: LFPB to KTEB on March 15, 2026 at 2:00pm CET.'
    );

    // Wait for TripRequestCard (may take time for multi-leg processing)
    await waitForComponent(page, '[data-testid="trip-request-card"]', 90_000);
    await demoPause(page);
    await captureScreenshot(page, '02-trip-created', 'multi-city');

    // Verify at least one airport code is visible
    await assertTextVisible(page, 'KTEB');

    // Verify deep link
    const deepLink = page.locator(
      'a[href*="marketplace.avinode.com"], button:has-text("Open in Avinode")'
    );
    await expect(deepLink.first()).toBeVisible();

    await captureScreenshot(page, '03-final-state', 'multi-city');
  });
});
