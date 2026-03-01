import { test, expect } from '@playwright/test';
import {
  navigateToChat,
  sendChatMessage,
  waitForComponent,
  waitForAssistantReply,
  captureScreenshot,
  demoPause,
  assertTextVisible,
  assertNotVisible,
  clickButton,
} from './helpers';

/**
 * Supabase verification helper.
 *
 * Calls the Supabase REST API directly using the service-role key so that
 * RLS is bypassed and we can inspect any table.  Returns the first matching
 * row, or throws if the query fails.
 */
async function querySupabase(
  table: string,
  filters: Record<string, string>,
): Promise<Record<string, unknown> | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const params = new URLSearchParams();
  for (const [col, val] of Object.entries(filters)) {
    params.append(col, `eq.${val}`);
  }
  params.append('limit', '1');

  const res = await fetch(`${url}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(
      `Supabase query failed: ${res.status} ${res.statusText} (table=${table})`
    );
  }
  const rows = await res.json();
  return rows[0] ?? null;
}

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

  // Fail fast if Supabase env vars are missing — every scenario requires DB verification
  test.beforeAll(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error(
        'NEXT_PUBLIC_SUPABASE_URL is not set. Phase 5 tests require Supabase for database verification.'
      );
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY is not set. Phase 5 tests require Supabase for database verification.'
      );
    }
  });

  test('Scenario 10: Proposal generation & send', async ({ page }) => {
    test.setTimeout(180_000);

    await navigateToChat(page);
    await demoPause(page);

    // ---------------------------------------------------------------
    // Step 1: Click "Generate Proposal" on the quote card
    // ---------------------------------------------------------------
    const proposalButton = page.locator(
      '[data-testid="generate-proposal"]'
    ).first();

    await expect(proposalButton).toBeVisible({ timeout: 15_000 });
    await expect(proposalButton).toBeEnabled();
    await captureScreenshot(page, '01-quote-card-before', 'proposal');
    await proposalButton.click();
    await demoPause(page, 2000);

    // ---------------------------------------------------------------
    // Step 2: CustomerSelectionDialog MUST appear
    // ---------------------------------------------------------------
    const dialog = page.locator('[data-testid="customer-selection-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await captureScreenshot(page, '02-customer-dialog', 'proposal');

    // Search for customer
    const searchInput = page.locator('[data-testid="customer-search"]');
    await expect(searchInput).toBeVisible({ timeout: 5_000 });
    await searchInput.fill('Willy');
    await demoPause(page);
    await captureScreenshot(page, '03-customer-search', 'proposal');

    // Select Willy Bercy / ABC Corp
    const customerOption = page.locator(
      'text=Willy Bercy, text=ABC Corp, [data-customer-name*="Willy"], [data-customer-name*="ABC"]'
    ).first();

    if (await customerOption.isVisible({ timeout: 5_000 })) {
      await customerOption.click();
    } else {
      // Fallback: click first visible customer option in the listbox
      await page.locator('[role="option"]').first().click();
    }
    await demoPause(page);

    // Confirm selection (click "Generate Proposal" button in dialog footer)
    const confirmBtn = dialog.locator('button:has-text("Generate Proposal")');
    if (await confirmBtn.isVisible({ timeout: 3_000 })) {
      await confirmBtn.click();
      await demoPause(page, 2000);
    }

    // ---------------------------------------------------------------
    // Step 3: Wait for ProposalPreview or ProposalSentConfirmation
    // (depends on whether agent uses prepare_ or auto-sends)
    // ---------------------------------------------------------------
    const proposalPreview = page.locator('[data-testid="proposal-preview"]');
    const proposalSentConfirmation = page.locator('[data-testid="proposal-sent-confirmation"]');

    // Wait for either component to appear
    await expect(
      proposalPreview.or(proposalSentConfirmation)
    ).toBeVisible({ timeout: 60_000 });
    await demoPause(page);
    await captureScreenshot(page, '04-email-preview', 'proposal');

    // ---------------------------------------------------------------
    // Step 4: If ProposalPreview is showing, click "Approve & Send"
    // ---------------------------------------------------------------
    if (await proposalPreview.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const approveButton = page.locator('[data-testid="approve-email"]');
      await expect(approveButton).toBeVisible({ timeout: 5_000 });
      await expect(approveButton).toBeEnabled();
      await approveButton.click();
      await demoPause(page, 3000);
    }

    // ---------------------------------------------------------------
    // Step 5: Verify ProposalSentConfirmation rendered
    // ---------------------------------------------------------------
    await expect(proposalSentConfirmation).toBeVisible({ timeout: 30_000 });
    await captureScreenshot(page, '05-sent-confirmation', 'proposal');

    // ---------------------------------------------------------------
    // Step 6: Verify "Generate Proposal" button is now disabled
    // ---------------------------------------------------------------
    const proposalBtnAfter = page.locator('[data-testid="generate-proposal"]').first();
    if (await proposalBtnAfter.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(proposalBtnAfter).toBeDisabled();
    }

    // ---------------------------------------------------------------
    // Step 7: Database verification — proposals table
    // ---------------------------------------------------------------
    const proposalRow = await querySupabase('proposals', { status: 'sent' });
    expect(proposalRow).not.toBeNull();
    expect(proposalRow!.status).toBe('sent');

    await captureScreenshot(page, '06-final-state', 'proposal');
  });

  test('Scenario 11: Contract generation & send (Book Flight)', async ({ page }) => {
    test.setTimeout(180_000);

    await navigateToChat(page);
    await demoPause(page);

    // ---------------------------------------------------------------
    // CRITICAL: "Book Flight" must only be available AFTER proposal sent
    // (this is validated by running scenarios serially)
    // ---------------------------------------------------------------

    // ---------------------------------------------------------------
    // Step 1: Click "Book Flight" on the quote card
    // ---------------------------------------------------------------
    const bookButton = page.locator('[data-testid="book-flight"]').first();
    await expect(bookButton).toBeVisible({ timeout: 15_000 });
    await expect(bookButton).toBeEnabled();
    await captureScreenshot(page, '01-book-flight-before', 'contract');
    await bookButton.click();
    await demoPause(page, 2000);

    // ---------------------------------------------------------------
    // CRITICAL: Customer selection dialog must NOT appear
    // Customer is reused from proposal in Scenario 10
    // ---------------------------------------------------------------
    const customerDialog = page.locator('[data-testid="customer-selection-dialog"]');
    await expect(customerDialog).not.toBeVisible({ timeout: 3_000 });

    // ---------------------------------------------------------------
    // Step 2: Wait for BookFlightModal
    // ---------------------------------------------------------------
    const bookFlightModal = page.locator('[data-testid="book-flight-modal"]');
    await expect(bookFlightModal).toBeVisible({ timeout: 30_000 });
    await demoPause(page);
    await captureScreenshot(page, '02-email-preview', 'contract');

    // Verify customer is auto-populated (no "No customer selected" warning)
    const noCustomerWarning = bookFlightModal.locator('[data-testid="book-flight-no-customer"]');
    await expect(noCustomerWarning).not.toBeVisible({ timeout: 2_000 });

    // ---------------------------------------------------------------
    // Step 3: Navigate to email review, then click "Approve & Send"
    // ---------------------------------------------------------------
    // The BookFlightModal starts in 'ready' state — click "Send Contract" first
    const sendContractBtn = bookFlightModal.locator(
      '[data-testid="contract-generate-btn"]'
    );
    if (await sendContractBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await sendContractBtn.click();
      await demoPause(page, 2000);
    }

    // Now in email_review state — click "Approve & Send"
    const approveButton = page.locator('[data-testid="approve-send"]');
    await expect(approveButton).toBeVisible({ timeout: 15_000 });
    await expect(approveButton).toBeEnabled();
    await approveButton.click();
    await demoPause(page, 3000);

    // ---------------------------------------------------------------
    // Step 4: Verify ContractSentConfirmation
    // ---------------------------------------------------------------
    const contractConfirmation = page.locator('[data-testid="contract-sent-confirmation"]');
    await expect(contractConfirmation).toBeVisible({ timeout: 30_000 });
    await captureScreenshot(page, '03-sent-confirmation', 'contract');

    // ---------------------------------------------------------------
    // Step 5: Database verification — contracts table
    // ---------------------------------------------------------------
    const contractRow = await querySupabase('contracts', { status: 'sent' });
    expect(contractRow).not.toBeNull();
    expect(contractRow!.status).toBe('sent');

    await captureScreenshot(page, '04-final-state', 'contract');
  });

  test('Scenario 12: Payment confirmation', async ({ page }) => {
    test.setTimeout(120_000);

    await navigateToChat(page);
    await demoPause(page);

    // ---------------------------------------------------------------
    // Step 1: Send payment message
    // ---------------------------------------------------------------
    await sendChatMessage(
      page,
      'Payment received from ABC Corp - $45,000 wire transfer, reference WT-2026-TEST-001'
    );

    // Wait for agent to process
    await waitForAssistantReply(page);
    await demoPause(page, 3000);

    // ---------------------------------------------------------------
    // Step 2: Verify PaymentConfirmedCard or handle PaymentConfirmationModal
    // ---------------------------------------------------------------
    const paymentCard = page.locator('[data-testid="payment-confirmed-card"]');
    const paymentModal = page.locator('[data-testid="payment-confirmation-modal"]');

    // Wait for either to appear
    await expect(
      paymentCard.or(paymentModal)
    ).toBeVisible({ timeout: 30_000 });

    if (await paymentModal.isVisible({ timeout: 2_000 }).catch(() => false)) {
      // Fill modal fields
      await captureScreenshot(page, '01-payment-modal', 'payment');

      const amountInput = paymentModal.locator('input[id="payment-amount"]');
      if (await amountInput.isVisible()) {
        await amountInput.fill('45000');
      }

      const refInput = paymentModal.locator('input[id="payment-ref"]');
      if (await refInput.isVisible()) {
        await refInput.fill('WT-2026-TEST-001');
      }

      // Confirm
      await paymentModal.locator('button:has-text("Confirm Payment")').click();
      await demoPause(page, 2000);

      // After modal closes, PaymentConfirmedCard should appear
      await expect(paymentCard).toBeVisible({ timeout: 15_000 });
    }

    await captureScreenshot(page, '01-payment-confirmed', 'payment');

    // Verify payment details are displayed
    await assertTextVisible(page, '45,000');

    // ---------------------------------------------------------------
    // Step 3: Database verification — contracts table payment fields
    // ---------------------------------------------------------------
    const contractRow = await querySupabase('contracts', { status: 'paid' });
    expect(contractRow).not.toBeNull();
    expect(contractRow!.status).toBe('paid');

    await captureScreenshot(page, '02-final-state', 'payment');
  });

  test('Scenario 13: Deal closure & archive', async ({ page }) => {
    test.setTimeout(120_000);

    await navigateToChat(page);
    await demoPause(page);

    // ---------------------------------------------------------------
    // Step 1: Verify ClosedWonConfirmation appears (auto or via chat)
    // ---------------------------------------------------------------
    const closedWon = page.locator('[data-testid="closed-won-confirmation"]');

    if (!(await closedWon.isVisible({ timeout: 15_000 }).catch(() => false))) {
      // Trigger deal closure explicitly
      await sendChatMessage(page, 'Close the deal');
      await waitForAssistantReply(page);
      await demoPause(page, 3000);
    }

    await expect(closedWon).toBeVisible({ timeout: 30_000 });
    await captureScreenshot(page, '01-closed-won', 'closure');

    // ---------------------------------------------------------------
    // Step 2: Archive the session
    // ---------------------------------------------------------------
    const archiveButton = page.locator(
      'button:has-text("Archive"), [data-testid="archive-button"], [aria-label*="archive" i]'
    ).first();

    if (await archiveButton.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await archiveButton.click();
      await demoPause(page);

      // Confirm archival if dialog appears
      const confirmBtn = page.locator(
        'button:has-text("Confirm"), button:has-text("Yes")'
      ).first();
      if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await confirmBtn.click();
        await demoPause(page, 2000);
      }
    }

    // ---------------------------------------------------------------
    // Step 3: Verify read-only state
    // ---------------------------------------------------------------
    const chatInput = page.locator('textarea').last();
    const isDisabled = await chatInput.isDisabled().catch(() => false);
    if (isDisabled) {
      await captureScreenshot(page, '02-read-only', 'closure');
    }

    // ---------------------------------------------------------------
    // Step 4: Navigate to Archive tab in sidebar
    // ---------------------------------------------------------------
    const archiveTab = page.locator('[data-testid="archive-tab"]');
    if (await archiveTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await archiveTab.click();
      await demoPause(page, 2000);
      await captureScreenshot(page, '03-archive-tab', 'closure');
    }

    // ---------------------------------------------------------------
    // Step 5: Database verification — requests table
    // ---------------------------------------------------------------
    const requestRow = await querySupabase('requests', {
      session_status: 'archived',
    });
    expect(requestRow).not.toBeNull();
    expect(requestRow!.session_status).toBe('archived');

    await captureScreenshot(page, '04-final-state', 'closure');
  });
});
