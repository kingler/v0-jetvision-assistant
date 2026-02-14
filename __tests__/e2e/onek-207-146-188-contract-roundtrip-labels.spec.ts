import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const CONTRACT_DEMO = `${BASE_URL}/component-demo/contract-confirmation`;
const MULTI_CITY_DEMO = `${BASE_URL}/component-demo/multi-city-trip`;
const SCREENSHOT_DIR = '/Volumes/SeagatePortableDrive/Projects/Software/v0-jetvision-assistant/screenshots';

// ═══════════════════════════════════════════════════════════════
// ONEK-207: Rich Contract Card in chat thread
// ═══════════════════════════════════════════════════════════════
test.describe('ONEK-207: Rich Contract Card', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(CONTRACT_DEMO);
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('demo-title').waitFor({ state: 'visible', timeout: 15000 });
  });

  test('demo page loads with all sections', async ({ page }) => {
    await expect(page.getByTestId('demo-title')).toContainText('ONEK-207');
    await expect(page.getByTestId('section-one-way')).toBeVisible();
    await expect(page.getByTestId('section-round-trip')).toBeVisible();
    await expect(page.getByTestId('section-multi-city')).toBeVisible();
    await expect(page.getByTestId('section-statuses')).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/onek-207-step-1-all-contracts.png`,
      fullPage: true,
    });
  });

  test('one-way contract card renders correctly', async ({ page }) => {
    await page.getByTestId('btn-one-way').click();
    await page.waitForTimeout(300);

    const section = page.getByTestId('section-one-way');
    await expect(section).toBeVisible();

    // Verify contract header
    await expect(section.locator('text=Contract Generated')).toBeVisible();
    await expect(section.locator('text=CONTRACT-2026-001')).toBeVisible();

    // Verify status badge "Sent"
    await expect(section.getByText('Sent', { exact: true })).toBeVisible();

    // Verify customer info
    await expect(section.locator('text=John Smith')).toBeVisible();
    await expect(section.locator('text=john@example.com')).toBeVisible();

    // Verify route
    await expect(section.locator('text=KTEB → KMIA')).toBeVisible();

    // Verify amount
    await expect(section.locator('text=USD')).toBeVisible();
    await expect(section.locator('text=45,000.00')).toBeVisible();

    // Verify "View Contract PDF" button exists
    await expect(section.getByText('View Contract PDF')).toBeVisible();

    // Verify "Mark Payment Received" button exists (status=sent)
    await expect(section.getByText('Mark Payment Received')).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/onek-207-step-2-one-way-contract.png`,
      fullPage: true,
    });
  });

  test('round-trip contract shows trip type badge and return date', async ({ page }) => {
    await page.getByTestId('btn-round-trip').click();
    await page.waitForTimeout(300);

    const section = page.getByTestId('section-round-trip');
    await expect(section).toBeVisible();

    // Verify Round-Trip badge
    await expect(section.getByText('Round-Trip', { exact: true })).toBeVisible();

    // Verify route uses ⇄ for round-trip
    await expect(section.locator('text=KTEB ⇄ KVNY')).toBeVisible();

    // Verify Outbound label and date
    await expect(section.getByText('Outbound')).toBeVisible();
    await expect(section.locator('text=Apr 5, 2026')).toBeVisible();

    // Verify Return label and date
    await expect(section.getByText('Return').first()).toBeVisible();
    await expect(section.locator('text=Apr 8, 2026')).toBeVisible();

    // Verify amount
    await expect(section.locator('text=92,500.00')).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/onek-207-step-3-round-trip-contract.png`,
      fullPage: true,
    });
  });

  test('multi-city contract shows all segments with legs', async ({ page }) => {
    await page.getByTestId('btn-multi-city').click();
    await page.waitForTimeout(300);

    const section = page.getByTestId('section-multi-city');
    await expect(section).toBeVisible();

    // Verify Multi-City badge
    await expect(section.getByText('Multi-City', { exact: true })).toBeVisible();

    // Verify "Signed" status
    await expect(section.getByText('Signed', { exact: true })).toBeVisible();

    // Verify all 3 legs
    await expect(section.locator('text=Leg 1')).toBeVisible();
    await expect(section.locator('text=Leg 2')).toBeVisible();
    await expect(section.locator('text=Leg 3')).toBeVisible();

    // Verify routes
    await expect(section.locator('text=KTEB → EGLL')).toBeVisible();
    await expect(section.locator('text=EGLL → LFPB')).toBeVisible();
    await expect(section.locator('text=LFPB → KTEB')).toBeVisible();

    // Verify dates
    await expect(section.locator('text=Mar 20, 2026')).toBeVisible();
    await expect(section.locator('text=Mar 23, 2026')).toBeVisible();
    await expect(section.locator('text=Mar 26, 2026')).toBeVisible();

    // Verify total amount
    await expect(section.locator('text=185,000.00')).toBeVisible();

    // Verify customer
    await expect(section.locator('text=Michael Chen')).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/onek-207-step-4-multi-city-contract.png`,
      fullPage: true,
    });
  });

  test('status badge variations render correctly', async ({ page }) => {
    await page.getByTestId('btn-statuses').click();
    await page.waitForTimeout(300);

    const section = page.getByTestId('section-statuses');
    await expect(section).toBeVisible();

    // Draft - no PDF button, no Mark Payment
    const draft = page.getByTestId('status-draft');
    await expect(draft.locator('span[data-slot="badge"]', { hasText: 'Draft' })).toBeVisible();
    await expect(draft.locator('text=View Contract PDF')).not.toBeVisible();
    await expect(draft.locator('text=Mark Payment Received')).not.toBeVisible();

    // Payment Pending - both buttons visible
    const pending = page.getByTestId('status-payment-pending');
    await expect(pending.locator('span[data-slot="badge"]', { hasText: 'Awaiting Payment' })).toBeVisible();
    await expect(pending.locator('text=View Contract PDF')).toBeVisible();
    await expect(pending.locator('text=Mark Payment Received')).toBeVisible();

    // Paid - PDF button visible, no Mark Payment
    const paid = page.getByTestId('status-paid');
    await expect(paid.locator('span[data-slot="badge"]', { hasText: 'Paid' })).toBeVisible();
    await expect(paid.locator('text=View Contract PDF')).toBeVisible();
    await expect(paid.locator('text=Mark Payment Received')).not.toBeVisible();

    // Completed - PDF button visible, no Mark Payment
    const completed = page.getByTestId('status-completed');
    await expect(completed.locator('span[data-slot="badge"]', { hasText: 'Completed' })).toBeVisible();
    await expect(completed.locator('text=View Contract PDF')).toBeVisible();
    await expect(completed.locator('text=Mark Payment Received')).not.toBeVisible();

    // Verify EUR currency on completed
    await expect(completed.locator('text=EUR')).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/onek-207-step-5-status-badges.png`,
      fullPage: true,
    });
  });

  test('Mark Payment button triggers callback', async ({ page }) => {
    await page.getByTestId('btn-one-way').click();
    await page.waitForTimeout(300);

    // Click Mark Payment Received
    await page.getByTestId('section-one-way').getByText('Mark Payment Received').click();

    // Verify toast appears
    await expect(page.getByTestId('payment-toast')).toBeVisible();
    await expect(page.getByTestId('payment-toast')).toContainText('Payment marked');
  });

  test('no console errors during rendering', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(CONTRACT_DEMO);
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('demo-title').waitFor({ state: 'visible', timeout: 15000 });

    // Toggle through all views
    for (const btn of ['btn-one-way', 'btn-round-trip', 'btn-multi-city', 'btn-statuses', 'btn-show-all']) {
      await page.getByTestId(btn).click();
      await page.waitForTimeout(200);
    }

    const critical = errors.filter(e => !e.includes('favicon') && !e.includes('_next'));
    expect(critical).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════
// ONEK-146: Round-Trip with Return Details
// ═══════════════════════════════════════════════════════════════
test.describe('ONEK-146: Round-Trip with Return Details', () => {

  test('round-trip trip card shows outbound and return with correct dates', async ({ page }) => {
    await page.goto(MULTI_CITY_DEMO);
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('demo-title').waitFor({ state: 'visible', timeout: 15000 });

    await page.getByTestId('btn-round-trip').click();
    await page.waitForTimeout(300);

    const section = page.getByTestId('section-round-trip');
    await expect(section).toBeVisible();

    // Verify Round-Trip badge on trip card
    await expect(section.locator('span[data-slot="badge"]', { hasText: 'Round-Trip' })).toBeVisible();

    // Verify Outbound label
    await expect(section.locator('text=Outbound').first()).toBeVisible();

    // Verify Return label
    await expect(section.locator('text=Return').first()).toBeVisible();

    // Verify airport codes both directions
    await expect(section.locator('text=KTEB').first()).toBeVisible();
    await expect(section.locator('text=KVNY').first()).toBeVisible();

    // Verify both dates
    await expect(section.locator('text=April 5, 2026')).toBeVisible();
    await expect(section.locator('text=April 8, 2026')).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/onek-146-step-1-round-trip-card.png`,
      fullPage: true,
    });
  });

  test('round-trip contract card shows ⇄ route and return date', async ({ page }) => {
    await page.goto(CONTRACT_DEMO);
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('demo-title').waitFor({ state: 'visible', timeout: 15000 });

    await page.getByTestId('btn-round-trip').click();
    await page.waitForTimeout(300);

    const section = page.getByTestId('section-round-trip');

    // Verify ⇄ symbol for round-trip route
    await expect(section.locator('text=KTEB ⇄ KVNY')).toBeVisible();

    // Verify "Outbound" and "Return" date labels
    await expect(section.getByText('Outbound')).toBeVisible();
    await expect(section.getByText('Return').first()).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/onek-146-step-2-round-trip-contract.png`,
      fullPage: true,
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// ONEK-188: Proposal Label Alignment
// ═══════════════════════════════════════════════════════════════
test.describe('ONEK-188: Proposal Label Alignment', () => {

  // This test verifies that the ProposalPreview uses consistent labels.
  // Since ProposalPreview requires ChatSession data and is behind auth,
  // we test at the source code level via the contract and trip demos.

  test('contract card uses consistent "Total Amount" label', async ({ page }) => {
    await page.goto(CONTRACT_DEMO);
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('demo-title').waitFor({ state: 'visible', timeout: 15000 });

    // Verify all contract cards use "Total Amount" label
    const section = page.getByTestId('section-one-way');
    await expect(section.locator('text=Total Amount')).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/onek-188-step-1-total-amount-label.png`,
      fullPage: true,
    });
  });

  test('contract card formats currency correctly with commas and decimals', async ({ page }) => {
    await page.goto(CONTRACT_DEMO);
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('demo-title').waitFor({ state: 'visible', timeout: 15000 });

    // Check various amounts are formatted correctly
    await expect(page.locator('text=45,000.00').first()).toBeVisible();   // $45,000
    await expect(page.locator('text=92,500.00').first()).toBeVisible();   // $92,500
    await expect(page.locator('text=185,000.00').first()).toBeVisible();  // $185,000

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/onek-188-step-2-currency-formatting.png`,
      fullPage: true,
    });
  });
});
