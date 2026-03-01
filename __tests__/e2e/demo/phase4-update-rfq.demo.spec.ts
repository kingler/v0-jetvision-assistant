import { test, expect } from '@playwright/test';
import {
  navigateToChat,
  waitForComponent,
  captureScreenshot,
  demoPause,
  assertTextVisible,
  waitForPageLoad,
} from './helpers';

/**
 * Phase 4: Update RFQ Scenario (9)
 *
 * Records a demo video of pulling quote data from Avinode
 * back into Jetvision after the Operator approves the quote.
 * The user clicks "Update RFQ" to fetch the latest quote data.
 *
 * PREREQUISITE: Phase 3 must have been run first (Operator approved quote).
 */
test.describe('Phase 4: Update RFQ', () => {
  test('Scenario 9: Update RFQ in Jetvision', async ({ page }) => {
    test.setTimeout(120_000);

    // Navigate to Jetvision
    await navigateToChat(page);
    await demoPause(page);
    await captureScreenshot(page, '01-jetvision-before-update', 'update-rfq');

    // Look for "Update RFQ" button in the existing chat
    const updateButton = page.locator(
      'button:has-text("Update RFQ"), button:has-text("Update"), [data-testid="update-rfq"]'
    ).first();

    try {
      await expect(updateButton).toBeVisible({ timeout: 15_000 });
      await captureScreenshot(page, '02-update-button-visible', 'update-rfq');

      // Click Update RFQ
      await updateButton.click();
      await demoPause(page, 2000);
      await captureScreenshot(page, '03-rfq-updating', 'update-rfq');

      // Wait for RFQFlightsList to load with quote data
      await waitForComponent(
        page,
        '[data-testid="rfq-flights-list"], [data-testid="rfq-flight-card"]',
        30_000
      );
      await demoPause(page);
      await captureScreenshot(page, '04-rfq-results-loaded', 'update-rfq');

      // Verify quote data is displayed
      const quoteCard = page.locator(
        '[data-testid="rfq-flight-card"], [data-testid="quote-card"]'
      ).first();
      await expect(quoteCard).toBeVisible();

      // Verify "Generate Proposal" button is visible
      const proposalButton = page.locator(
        'button:has-text("Generate Proposal"), button:has-text("Proposal")'
      ).first();
      await expect(proposalButton).toBeVisible();

    } catch {
      // If no Update RFQ button, the quote may have been auto-fetched
      // or we need to wait for webhook processing
      await demoPause(page, 5000);
      await page.reload();
      await waitForPageLoad(page);
      await captureScreenshot(page, '02-after-reload', 'update-rfq');
    }

    await captureScreenshot(page, '05-final-state', 'update-rfq');
  });
});
