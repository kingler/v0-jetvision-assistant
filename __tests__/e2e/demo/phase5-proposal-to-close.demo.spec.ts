import { test, expect } from '@playwright/test';
import {
  navigateToChat,
  sendChatMessage,
  waitForComponent,
  waitForAssistantReply,
  captureScreenshot,
  demoPause,
  assertTextVisible,
  clickButton,
} from './helpers';

/**
 * Phase 5: Proposal to Close Scenarios (10-13)
 *
 * Records demo videos of the post-quote lifecycle:
 * proposal generation & send, contract/book flight,
 * payment confirmation, and deal closure with archival.
 *
 * PREREQUISITE: Phases 1-4 must have been run first
 * (trip created, RFQ sent, operator quoted, quotes pulled in).
 */
test.describe('Phase 5: Proposal to Close', () => {
  test.describe.configure({ mode: 'serial' });

  test('Scenario 10: Proposal generation & send', async ({ page }) => {
    test.setTimeout(180_000);

    await navigateToChat(page);
    await demoPause(page);

    // Step 1: Click "Generate Proposal" on the quote card
    const proposalButton = page.locator(
      'button:has-text("Generate Proposal"), [data-testid="generate-proposal"]'
    ).first();

    try {
      await expect(proposalButton).toBeVisible({ timeout: 15_000 });
      await captureScreenshot(page, '01-quote-card-before', 'proposal');
      await proposalButton.click();
      await demoPause(page, 2000);
    } catch {
      // Fallback: ask agent to generate proposal via chat
      await sendChatMessage(
        page,
        'Generate a proposal from the quote for $45,000'
      );
      await waitForAssistantReply(page);
      await demoPause(page, 2000);
    }

    // Step 2: CustomerSelectionDialog
    try {
      await waitForComponent(
        page,
        '[data-testid="customer-selection-dialog"], [role="dialog"]',
        15_000
      );
      await captureScreenshot(page, '02-customer-dialog', 'proposal');

      // Search for customer
      const searchInput = page.locator(
        '[data-testid="customer-search"], input[placeholder*="search" i], input[placeholder*="customer" i]'
      ).first();

      if (await searchInput.isVisible({ timeout: 3_000 })) {
        await searchInput.fill('Willy');
        await demoPause(page);
        await captureScreenshot(page, '03-customer-search', 'proposal');
      }

      // Select Willy Bercy / ABC Corp
      const customerOption = page.locator(
        'text=Willy Bercy, text=ABC Corp, [data-customer-name*="Willy"], [data-customer-name*="ABC"]'
      ).first();

      if (await customerOption.isVisible({ timeout: 5_000 })) {
        await customerOption.click();
        await demoPause(page);
      }
    } catch {
      // Dialog may not appear if customer is pre-selected
      await captureScreenshot(page, '02-no-customer-dialog', 'proposal');
    }

    // Step 3: Wait for ProposalPreview
    try {
      await waitForComponent(
        page,
        '[data-testid="proposal-preview"], [data-testid="email-preview"]',
        30_000
      );
      await demoPause(page);
      await captureScreenshot(page, '04-email-preview', 'proposal');
    } catch {
      await waitForAssistantReply(page);
      await captureScreenshot(page, '04-agent-response', 'proposal');
    }

    // Step 4: Click "Approve & Send"
    try {
      const approveButton = page.locator(
        'button:has-text("Approve"), button:has-text("Send"), [data-testid="approve-email"]'
      ).first();
      await approveButton.click();
      await demoPause(page, 3000);
      await captureScreenshot(page, '05-sent-confirmation', 'proposal');
    } catch {
      await captureScreenshot(page, '05-approve-attempted', 'proposal');
    }

    await captureScreenshot(page, '06-final-state', 'proposal');
  });

  test('Scenario 11: Contract generation & send (Book Flight)', async ({ page }) => {
    test.setTimeout(180_000);

    await navigateToChat(page);
    await demoPause(page);

    // Step 1: Click "Book Flight" on the quote card
    const bookButton = page.locator(
      'button:has-text("Book Flight"), [data-testid="book-flight"]'
    ).first();

    try {
      await expect(bookButton).toBeVisible({ timeout: 15_000 });
      await captureScreenshot(page, '01-book-flight-before', 'contract');
      await bookButton.click();
      await demoPause(page, 2000);
    } catch {
      // Fallback: ask via chat
      await sendChatMessage(
        page,
        'Generate a contract for this deal and send it to the client'
      );
      await waitForAssistantReply(page);
      await demoPause(page, 2000);
    }

    // Step 2: Wait for BookFlightModal (no customer dialog should appear)
    try {
      await waitForComponent(
        page,
        '[data-testid="book-flight-modal"], [data-testid="contract-preview"]',
        30_000
      );
      await demoPause(page);
      await captureScreenshot(page, '02-email-preview', 'contract');
    } catch {
      await waitForAssistantReply(page);
      await captureScreenshot(page, '02-agent-response', 'contract');
    }

    // Step 3: Click "Approve & Send"
    try {
      const approveButton = page.locator(
        'button:has-text("Approve"), button:has-text("Send"), [data-testid="approve-send"]'
      ).first();
      await approveButton.click();
      await demoPause(page, 3000);
    } catch {
      // May auto-send
    }

    // Step 4: Verify ContractSentConfirmation
    try {
      await waitForComponent(
        page,
        '[data-testid="contract-sent-confirmation"]',
        15_000
      );
      await captureScreenshot(page, '03-sent-confirmation', 'contract');
    } catch {
      await captureScreenshot(page, '03-contract-state', 'contract');
    }

    await captureScreenshot(page, '04-final-state', 'contract');
  });

  test('Scenario 12: Payment confirmation', async ({ page }) => {
    test.setTimeout(120_000);

    await navigateToChat(page);
    await demoPause(page);

    // Send payment message
    await sendChatMessage(
      page,
      'Payment received from ABC Corp - $45,000 wire transfer, reference WT-2026-TEST-001'
    );

    // Wait for agent to process
    await waitForAssistantReply(page);
    await demoPause(page, 3000);

    // Check for PaymentConfirmedCard
    try {
      await waitForComponent(
        page,
        '[data-testid="payment-confirmed-card"], [data-testid="payment-confirmation"]',
        30_000
      );
      await captureScreenshot(page, '01-payment-confirmed', 'payment');

      // Verify payment details
      await assertTextVisible(page, '45,000');
    } catch {
      // PaymentConfirmationModal may appear instead
      try {
        await waitForComponent(
          page,
          '[data-testid="payment-confirmation-modal"], [role="dialog"]',
          10_000
        );
        await captureScreenshot(page, '01-payment-modal', 'payment');

        // Fill modal fields
        const amountInput = page.locator(
          'input[name*="amount"], input[placeholder*="amount" i]'
        ).first();
        if (await amountInput.isVisible()) {
          await amountInput.fill('45000');
        }

        const refInput = page.locator(
          'input[name*="reference"], input[placeholder*="reference" i]'
        ).first();
        if (await refInput.isVisible()) {
          await refInput.fill('WT-2026-TEST-001');
        }

        // Confirm
        await page
          .locator('button:has-text("Confirm"), button[type="submit"]')
          .first()
          .click();
        await demoPause(page, 2000);
      } catch {
        // Agent handled it automatically
      }
    }

    await captureScreenshot(page, '02-final-state', 'payment');
  });

  test('Scenario 13: Deal closure & archive', async ({ page }) => {
    test.setTimeout(120_000);

    await navigateToChat(page);
    await demoPause(page);

    // Step 1: Check for ClosedWonConfirmation
    try {
      await waitForComponent(
        page,
        '[data-testid="closed-won-confirmation"]',
        15_000
      );
      await captureScreenshot(page, '01-closed-won', 'closure');
    } catch {
      // May need to explicitly close the deal
      await sendChatMessage(page, 'Close the deal');
      await waitForAssistantReply(page);
      await demoPause(page, 3000);
      await captureScreenshot(page, '01-close-requested', 'closure');
    }

    // Step 2: Archive the session
    try {
      const archiveButton = page.locator(
        'button:has-text("Archive"), [data-testid="archive-button"], [aria-label*="archive" i]'
      ).first();

      if (await archiveButton.isVisible({ timeout: 10_000 })) {
        await archiveButton.click();
        await demoPause(page);

        // Confirm archival if dialog appears
        try {
          await page
            .locator('button:has-text("Confirm"), button:has-text("Yes")')
            .first()
            .click({ timeout: 5_000 });
          await demoPause(page, 2000);
        } catch {
          // No confirmation dialog
        }
      }
    } catch {
      await captureScreenshot(page, '02-archive-not-found', 'closure');
    }

    // Step 3: Verify read-only state
    const chatInput = page.locator('textarea').last();
    const isDisabled = await chatInput.isDisabled().catch(() => false);
    if (isDisabled) {
      await captureScreenshot(page, '02-read-only', 'closure');
    }

    // Step 4: Check Archive tab in sidebar
    try {
      await page
        .locator(
          '[data-testid="archive-tab"], button:has-text("Archive"), [role="tab"]:has-text("Archive")'
        )
        .first()
        .click();
      await demoPause(page, 2000);
      await captureScreenshot(page, '03-archive-tab', 'closure');
    } catch {
      await captureScreenshot(page, '03-sidebar-state', 'closure');
    }

    await captureScreenshot(page, '04-final-state', 'closure');
  });
});
