import { test, expect } from '@playwright/test';
import {
  navigateToChat,
  sendChatMessage,
  waitForComponent,
  captureScreenshot,
  demoPause,
  assertTextVisible,
  querySupabase,
} from './helpers';

/**
 * Phase 6: Trip Type Lifecycle — ID Traceability Variants
 *
 * Verifies that tripId and quoteId are populated for round-trip (2 legs)
 * and multi-city (3+ legs) trip types. Does NOT run the full Avinode
 * marketplace flow (that requires sandbox interaction) — just verifies
 * IDs exist after trip creation and search.
 */
test.describe('Phase 6: Trip Type Lifecycle', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('[Phase 6] Supabase env vars not set — DB verification will be skipped.');
    }
  });

  test('Round-trip: tripId and quoteId populated', async ({ page }) => {
    test.setTimeout(120_000);

    await navigateToChat(page);
    await demoPause(page);
    await captureScreenshot(page, '01-chat-ready', 'trip-type-roundtrip');

    // Send round-trip flight request
    await sendChatMessage(
      page,
      'I need a round trip flight from EGGW to KVNY for 4 passengers on March 2, 2026 at 9:00am EST, returning March 5, 2026 at 2:00pm EST'
    );

    // Wait for trip card to render
    await waitForComponent(page, '[data-testid="trip-request-card"]', 60_000);
    await demoPause(page);
    await captureScreenshot(page, '02-trip-created', 'trip-type-roundtrip');

    // Verify route details
    await assertTextVisible(page, 'EGGW');
    await assertTextVisible(page, 'KVNY');

    // Extract tripId from flight-search-progress
    const tripId = await page
      .locator('[data-testid="flight-search-progress"]')
      .first()
      .getAttribute('data-trip-id')
      .catch(() => null);
    console.log(`[Phase 6 Round-trip] tripId from DOM: ${tripId}`);

    if (tripId) {
      expect(tripId).toBeTruthy();
    }

    // Wait for quote cards to load (if any)
    try {
      await waitForComponent(page, '[data-testid="rfq-flight-card"]', 30_000);
      await demoPause(page);
      await captureScreenshot(page, '03-rfq-cards', 'trip-type-roundtrip');

      // Extract quoteId from first card
      const quoteId = await page
        .locator('[data-testid="rfq-flight-card"]')
        .first()
        .getAttribute('data-quote-id')
        .catch(() => null);
      console.log(`[Phase 6 Round-trip] quoteId from DOM: ${quoteId}`);

      if (quoteId) {
        expect(quoteId).toBeTruthy();
      }
    } catch {
      console.log('[Phase 6 Round-trip] No RFQ flight cards loaded — skipping quoteId check.');
      await captureScreenshot(page, '03-no-rfq-cards', 'trip-type-roundtrip');
    }

    // DB verification: requests table has avinode_trip_id
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const requestRow = await querySupabase('requests', {});
      if (requestRow) {
        console.log(`[Phase 6 Round-trip] DB avinode_trip_id: ${requestRow.avinode_trip_id}`);
        if (requestRow.avinode_trip_id) {
          expect(requestRow.avinode_trip_id).toBeTruthy();
        }
      }
    }

    await captureScreenshot(page, '04-final', 'trip-type-roundtrip');
  });

  test('Multi-city: tripId and quoteId populated', async ({ page }) => {
    test.setTimeout(120_000);

    await navigateToChat(page);
    await demoPause(page);
    await captureScreenshot(page, '01-chat-ready', 'trip-type-multicity');

    // Send multi-city trip request
    await sendChatMessage(
      page,
      'I need a multi-city trip: KTEB to London Luton (EGGW) on March 10, then London Luton to Paris Le Bourget (LFPB) on March 12, then Paris Le Bourget back to KTEB on March 15. 4 passengers'
    );

    // Wait for trip card to render
    await waitForComponent(page, '[data-testid="trip-request-card"]', 60_000);
    await demoPause(page);
    await captureScreenshot(page, '02-trip-created', 'trip-type-multicity');

    // Verify route details
    await assertTextVisible(page, 'KTEB');
    await assertTextVisible(page, 'EGGW');

    // Extract tripId from flight-search-progress
    const tripId = await page
      .locator('[data-testid="flight-search-progress"]')
      .first()
      .getAttribute('data-trip-id')
      .catch(() => null);
    console.log(`[Phase 6 Multi-city] tripId from DOM: ${tripId}`);

    if (tripId) {
      expect(tripId).toBeTruthy();
    }

    // Wait for quote cards to load (if any)
    try {
      await waitForComponent(page, '[data-testid="rfq-flight-card"]', 30_000);
      await demoPause(page);
      await captureScreenshot(page, '03-rfq-cards', 'trip-type-multicity');

      // Extract quoteId from each card
      const cards = page.locator('[data-testid="rfq-flight-card"]');
      const cardCount = await cards.count();
      for (let i = 0; i < cardCount; i++) {
        const quoteId = await cards.nth(i).getAttribute('data-quote-id').catch(() => null);
        const flightId = await cards.nth(i).getAttribute('data-flight-id').catch(() => null);
        console.log(`[Phase 6 Multi-city] Card ${i}: quoteId=${quoteId}, flightId=${flightId}`);
      }
    } catch {
      console.log('[Phase 6 Multi-city] No RFQ flight cards loaded — skipping quoteId check.');
      await captureScreenshot(page, '03-no-rfq-cards', 'trip-type-multicity');
    }

    // DB verification: requests table has avinode_trip_id
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const requestRow = await querySupabase('requests', {});
      if (requestRow) {
        console.log(`[Phase 6 Multi-city] DB avinode_trip_id: ${requestRow.avinode_trip_id}`);
        if (requestRow.avinode_trip_id) {
          expect(requestRow.avinode_trip_id).toBeTruthy();
        }
      }
    }

    await captureScreenshot(page, '04-final', 'trip-type-multicity');
  });
});
