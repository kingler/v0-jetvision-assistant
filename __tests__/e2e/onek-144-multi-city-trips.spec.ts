import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const DEMO_URL = `${BASE_URL}/component-demo/multi-city-trip`;
const SCREENSHOT_DIR = '/Volumes/SeagatePortableDrive/Projects/Software/v0-jetvision-assistant/screenshots';

test.describe('ONEK-144: Multi-City Trips & Trip Card Display', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(DEMO_URL);
    await page.waitForLoadState('domcontentloaded');
    // Wait for React hydration
    await page.getByTestId('demo-title').waitFor({ state: 'visible', timeout: 15000 });
  });

  // ── TEST 1: Demo page loads correctly ───────────────────────
  test('demo page loads with all sections visible', async ({ page }) => {
    // Verify title
    const title = page.getByTestId('demo-title');
    await expect(title).toBeVisible();
    await expect(title).toContainText('ONEK-144');

    // Verify view controls
    await expect(page.getByTestId('view-controls')).toBeVisible();
    await expect(page.getByTestId('btn-show-all')).toBeVisible();
    await expect(page.getByTestId('btn-one-way')).toBeVisible();
    await expect(page.getByTestId('btn-round-trip')).toBeVisible();
    await expect(page.getByTestId('btn-multi-city')).toBeVisible();

    // Take full page screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/onek-144-step-1-demo-page-loaded.png`,
      fullPage: true,
    });
  });

  // ── TEST 2: One-Way trip card renders correctly ─────────────
  test('one-way trip card shows correct badge and route', async ({ page }) => {
    await page.getByTestId('btn-one-way').click();
    await page.waitForTimeout(300);

    const section = page.getByTestId('section-one-way');
    await expect(section).toBeVisible();

    // Verify One-Way badge (use exact text match on badge element)
    await expect(section.getByText('One-Way', { exact: true })).toBeVisible();

    // Verify airport codes
    await expect(section.locator('text=KTEB')).toBeVisible();
    await expect(section.locator('text=KMIA')).toBeVisible();

    // Verify airport names
    await expect(section.locator('text=Teterboro Airport')).toBeVisible();
    await expect(section.locator('text=Miami International Airport')).toBeVisible();

    // Verify trip ID
    await expect(section.locator('text=trp-oneway-001')).toBeVisible();

    // Verify passengers
    await expect(section.locator('text=3')).toBeVisible();

    // Verify departure date
    await expect(section.locator('text=March 15, 2026')).toBeVisible();

    // Should NOT show "Outbound" or "Return" labels
    await expect(section.locator('text=Outbound')).not.toBeVisible();
    await expect(section.locator('text=Return')).not.toBeVisible();

    // Should NOT show Leg labels
    await expect(section.locator('text=Leg 1')).not.toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/onek-144-step-2-one-way-trip.png`,
      fullPage: true,
    });
  });

  // ── TEST 3: Round-trip card renders correctly ───────────────
  test('round-trip card shows outbound and return routes with badge', async ({ page }) => {
    await page.getByTestId('btn-round-trip').click();
    await page.waitForTimeout(300);

    const section = page.getByTestId('section-round-trip');
    await expect(section).toBeVisible();

    // Verify Round-Trip badge (target the badge span element specifically)
    await expect(section.locator('span[data-slot="badge"]', { hasText: 'Round-Trip' })).toBeVisible();

    // Verify "Outbound" and "Return" labels
    await expect(section.locator('text=Outbound').first()).toBeVisible();
    await expect(section.locator('text=Return').first()).toBeVisible();

    // Verify airport codes appear (outbound KTEB → KVNY)
    const ktebElements = section.locator('text=KTEB');
    await expect(ktebElements.first()).toBeVisible();

    const kvnyElements = section.locator('text=KVNY');
    await expect(kvnyElements.first()).toBeVisible();

    // Verify return date is shown
    await expect(section.locator('text=April 8, 2026')).toBeVisible();

    // Verify outbound date
    await expect(section.locator('text=April 5, 2026')).toBeVisible();

    // Verify 6 passengers (exact match to avoid matching "2026")
    await expect(section.getByText('6', { exact: true })).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/onek-144-step-3-round-trip.png`,
      fullPage: true,
    });
  });

  // ── TEST 4: Multi-city 3-leg card renders all segments ──────
  test('multi-city 3-leg card shows all segments with Multi-City badge', async ({ page }) => {
    await page.getByTestId('btn-multi-city').click();
    await page.waitForTimeout(300);

    const section = page.getByTestId('section-multi-city-3leg');
    await expect(section).toBeVisible();

    // Verify Multi-City badge (use exact text match on badge element)
    await expect(section.getByText('Multi-City', { exact: true })).toBeVisible();

    // Verify all 3 leg labels
    await expect(section.locator('text=Leg 1')).toBeVisible();
    await expect(section.locator('text=Leg 2')).toBeVisible();
    await expect(section.locator('text=Leg 3')).toBeVisible();

    // Verify route: KTEB → EGLL → LFPB → KTEB
    await expect(section.locator('text=KTEB').first()).toBeVisible();
    await expect(section.locator('text=EGLL').first()).toBeVisible();
    await expect(section.locator('text=LFPB').first()).toBeVisible();

    // Verify dates for each segment (use .first() as date appears in both leg card and summary)
    await expect(section.locator('text=March 20, 2026').first()).toBeVisible();
    await expect(section.locator('text=March 23, 2026').first()).toBeVisible();
    await expect(section.locator('text=March 26, 2026').first()).toBeVisible();

    // Verify First Leg and Last Leg labels in summary
    await expect(section.locator('text=First Leg')).toBeVisible();
    await expect(section.locator('text=Last Leg')).toBeVisible();

    // Verify passengers
    await expect(section.locator('text=5').first()).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/onek-144-step-4-multi-city-3leg.png`,
      fullPage: true,
    });
  });

  // ── TEST 5: Multi-city 4-leg card renders all segments ──────
  test('multi-city 4-leg card shows all segments correctly', async ({ page }) => {
    await page.getByTestId('btn-multi-city').click();
    await page.waitForTimeout(300);

    const section = page.getByTestId('section-multi-city-4leg');
    await expect(section).toBeVisible();

    // Verify all 4 leg labels
    await expect(section.locator('text=Leg 1')).toBeVisible();
    await expect(section.locator('text=Leg 2')).toBeVisible();
    await expect(section.locator('text=Leg 3')).toBeVisible();
    await expect(section.locator('text=Leg 4')).toBeVisible();

    // Verify 4-city route: KTEB → EGLL → LSZH → LFPG → KTEB
    await expect(section.locator('text=LSZH').first()).toBeVisible();
    await expect(section.locator('text=LFPG').first()).toBeVisible();

    // Verify Zurich and Paris airports
    await expect(section.locator('text=Zurich Airport').first()).toBeVisible();
    await expect(section.locator('text=Charles de Gaulle Airport').first()).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/onek-144-step-5-multi-city-4leg.png`,
      fullPage: true,
    });
  });

  // ── TEST 6: Deep links appear for multi-city trip ───────────
  test('avinode deep links render alongside multi-city trip card', async ({ page }) => {
    await page.getByTestId('btn-multi-city').click();
    await page.waitForTimeout(300);

    const section = page.getByTestId('section-with-deep-links');
    await expect(section).toBeVisible();

    // Verify deep link buttons are present (use first() to avoid strict mode)
    await expect(section.getByText('Search in Avinode', { exact: true }).first()).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/onek-144-step-6-multi-city-deep-links.png`,
      fullPage: true,
    });
  });

  // ── TEST 7: Edge case - airport without city name ───────────
  test('trip card handles airport without city name gracefully', async ({ page }) => {
    await page.getByTestId('btn-show-all').click();
    await page.waitForTimeout(300);

    const section = page.getByTestId('section-edge-cases');
    await expect(section).toBeVisible();

    // Verify EGGW airport is displayed
    await expect(section.locator('text=EGGW')).toBeVisible();
    await expect(section.locator('text=Luton Airport')).toBeVisible();

    // Verify cancelled status badge (use exact match to avoid heading text)
    await expect(section.getByText('Cancelled', { exact: true })).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/onek-144-step-7-edge-cases.png`,
      fullPage: true,
    });
  });

  // ── TEST 8: View toggle filtering works correctly ───────────
  test('view toggle filters show/hide correct trip types', async ({ page }) => {
    // Click "One-Way" - should only show one-way section
    await page.getByTestId('btn-one-way').click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('section-one-way')).toBeVisible();
    await expect(page.getByTestId('section-round-trip')).not.toBeVisible();
    await expect(page.getByTestId('section-multi-city-3leg')).not.toBeVisible();

    // Click "Round-Trip" - should only show round-trip section
    await page.getByTestId('btn-round-trip').click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('section-one-way')).not.toBeVisible();
    await expect(page.getByTestId('section-round-trip')).toBeVisible();
    await expect(page.getByTestId('section-multi-city-3leg')).not.toBeVisible();

    // Click "Multi-City" - should show multi-city sections
    await page.getByTestId('btn-multi-city').click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('section-one-way')).not.toBeVisible();
    await expect(page.getByTestId('section-round-trip')).not.toBeVisible();
    await expect(page.getByTestId('section-multi-city-3leg')).toBeVisible();
    await expect(page.getByTestId('section-multi-city-4leg')).toBeVisible();

    // Click "Show All" - everything visible
    await page.getByTestId('btn-show-all').click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('section-one-way')).toBeVisible();
    await expect(page.getByTestId('section-round-trip')).toBeVisible();
    await expect(page.getByTestId('section-multi-city-3leg')).toBeVisible();
    await expect(page.getByTestId('section-multi-city-4leg')).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/onek-144-step-8-all-views.png`,
      fullPage: true,
    });
  });

  // ── TEST 9: Copy Trip ID button is functional ───────────────
  test('copy trip ID button is present and clickable', async ({ page }) => {
    await page.getByTestId('btn-one-way').click();
    await page.waitForTimeout(300);

    const section = page.getByTestId('section-one-way');
    const copyBtn = section.locator('button[aria-label="Copy trip ID"]');
    await expect(copyBtn).toBeVisible();

    // Click copy button (clipboard may not work in test env but button should be clickable)
    await copyBtn.click();
  });

  // ── TEST 10: No console errors ──────────────────────────────
  test('no console errors during rendering', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(DEMO_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('demo-title').waitFor({ state: 'visible', timeout: 15000 });

    // Toggle through all views
    await page.getByTestId('btn-one-way').click();
    await page.waitForTimeout(200);
    await page.getByTestId('btn-round-trip').click();
    await page.waitForTimeout(200);
    await page.getByTestId('btn-multi-city').click();
    await page.waitForTimeout(200);
    await page.getByTestId('btn-show-all').click();
    await page.waitForTimeout(200);

    // Filter out known non-critical errors (e.g., favicon, analytics)
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes('favicon') && !err.includes('analytics') && !err.includes('_next/static')
    );

    expect(criticalErrors).toEqual([]);
  });
});
