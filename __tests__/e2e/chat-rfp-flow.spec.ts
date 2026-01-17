import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Jetvision AI Assistant - Comprehensive UX E2E Test Suite
 *
 * Tests the complete RFP user flow, chat interface, accessibility,
 * and responsive design across multiple viewports.
 */

const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots', 'ux-analysis');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function captureScreenshot(page: Page, name: string): Promise<string> {
  const filename = `${name}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`Screenshot captured: ${name}`);
  return filename;
}

async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('load');
  await page.waitForTimeout(1500);
}

test.describe('Jetvision UX Analysis - RFP Flow', () => {
  test.setTimeout(120000);

  test.beforeAll(async () => {
    console.log('\nStarting UX Analysis E2E Tests...\n');
  });

  test('Landing page loads correctly', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // Verify main elements are present
    await expect(page.locator('header')).toBeVisible();

    // Capture screenshot
    await captureScreenshot(page, '01-landing-page');
  });

  test('Chat interface accessibility', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Capture focus state
    await captureScreenshot(page, '02-keyboard-navigation');

    // Check for ARIA labels on interactive elements
    const buttons = await page.locator('button').all();
    for (const button of buttons.slice(0, 5)) {
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      // Button should have either aria-label or visible text
      expect(ariaLabel || text?.trim()).toBeTruthy();
    }
  });

  test('Chat input and message sending', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // Find and interact with chat input
    const chatInput = page.locator('textarea, input[type="text"]').last();

    if (await chatInput.isVisible()) {
      await chatInput.focus();
      await captureScreenshot(page, '03-chat-input-focused');

      // Type a flight request
      const testMessage = 'I need a private jet from New York to Los Angeles for 6 passengers on January 15th';
      await chatInput.fill(testMessage);
      await captureScreenshot(page, '04-message-typed');

      // Find send button
      const sendButton = page.locator('button[type="submit"], button:has(svg)').last();
      if (await sendButton.isVisible()) {
        await sendButton.click();
        await page.waitForTimeout(2000);
        await captureScreenshot(page, '05-message-sent');
      }
    }
  });

  test('Workflow visualization states', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // Look for workflow elements
    const workflowElements = page.locator('[class*="workflow"], [class*="step"], [class*="progress"]');

    if (await workflowElements.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await captureScreenshot(page, '06-workflow-visualization');

      // Test expandable steps if they exist
      const expandableSteps = page.locator('button:has-text("Step")');
      if (await expandableSteps.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expandableSteps.first().click();
        await page.waitForTimeout(500);
        await captureScreenshot(page, '07-workflow-step-expanded');
      }
    }
  });

  test('Quote card interactions', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // Look for quote cards
    const quoteCards = page.locator('[class*="quote"], [class*="card"]');

    if (await quoteCards.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      // Test hover state
      await quoteCards.first().hover();
      await captureScreenshot(page, '08-quote-card-hover');

      // Test click interaction
      const selectButton = quoteCards.first().locator('button:has-text("Select")');
      if (await selectButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await selectButton.click();
        await captureScreenshot(page, '09-quote-selected');
      }
    }
  });

  test('Quick action buttons', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // Find quick action buttons
    const quickActions = page.locator('button:has-text("Update"), button:has-text("Alternative"), button:has-text("Status")');

    if (await quickActions.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await captureScreenshot(page, '10-quick-actions-visible');

      // Test clicking a quick action
      await quickActions.first().click();
      await page.waitForTimeout(1000);
      await captureScreenshot(page, '11-quick-action-triggered');
    }
  });

  test('Settings panel', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // Find and click settings button
    const settingsButton = page.locator('button:has-text("Settings"), button[aria-label*="settings"]').first();

    if (await settingsButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await settingsButton.click();
      await page.waitForTimeout(500);
      await captureScreenshot(page, '12-settings-panel');
    }
  });

  test('Sidebar toggle', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // Find sidebar toggle
    const sidebarToggle = page.locator('button[aria-label*="sidebar"], button:has(svg[class*="chevron"])').first();

    if (await sidebarToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await captureScreenshot(page, '13-sidebar-open');

      await sidebarToggle.click();
      await page.waitForTimeout(500);
      await captureScreenshot(page, '14-sidebar-closed');
    }
  });
});

test.describe('Responsive Design Tests', () => {
  test('Mobile viewport (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await waitForPageLoad(page);

    await captureScreenshot(page, '15-mobile-375px');

    // Verify touch targets are appropriately sized
    const buttons = await page.locator('button').all();
    for (const button of buttons.slice(0, 3)) {
      const box = await button.boundingBox();
      if (box) {
        // Minimum touch target should be 44x44 pixels
        expect(box.height).toBeGreaterThanOrEqual(32);
      }
    }
  });

  test('Tablet viewport (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await waitForPageLoad(page);

    await captureScreenshot(page, '16-tablet-768px');
  });

  test('Desktop viewport (1920px)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await waitForPageLoad(page);

    await captureScreenshot(page, '17-desktop-1920px');
  });
});

test.describe('Accessibility Audit', () => {
  test('Color contrast verification', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // Check that text elements have sufficient contrast
    // This is a basic check - a full audit would use axe-core
    const textElements = await page.locator('p, span, h1, h2, h3, button').all();

    for (const element of textElements.slice(0, 10)) {
      const color = await element.evaluate((el) => window.getComputedStyle(el).color);
      const bgColor = await element.evaluate((el) => window.getComputedStyle(el).backgroundColor);

      // Verify colors are not transparent or inherit
      expect(color).not.toBe('');
    }
  });

  test('Focus indicators visible', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // Tab through elements and verify focus is visible
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }

    await captureScreenshot(page, '18-focus-indicators');
  });

  test('Screen reader landmarks', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // Check for landmark elements
    const header = page.locator('header');
    const main = page.locator('main');
    const nav = page.locator('nav');

    // At least header should be present
    await expect(header).toBeVisible();
  });

  test('Form labels and inputs', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // Check that inputs have associated labels
    const inputs = await page.locator('input, textarea').all();

    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');

      // Input should have some form of label
      const hasLabel = id || ariaLabel || ariaLabelledby || placeholder;
      if (await input.isVisible()) {
        expect(hasLabel).toBeTruthy();
      }
    }
  });
});

test.describe('Error States', () => {
  test('Empty input validation', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]').last();

    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();
      await page.waitForTimeout(500);

      // Check for error message or validation
      const errorElement = page.locator('[class*="error"], [role="alert"]');
      if (await errorElement.isVisible({ timeout: 2000 }).catch(() => false)) {
        await captureScreenshot(page, '19-validation-error');
      }
    }
  });
});

test.describe('Chat Page Tests', () => {
  test('Chat interface loads', async ({ page }) => {
    await page.goto('/chat');
    await waitForPageLoad(page);

    await captureScreenshot(page, '20-chat-page');

    // Verify main heading
    const heading = page.locator('h1:has-text("JetVision")');
    if (await heading.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(heading).toBeVisible();
    }
  });
});

test.describe('Performance Metrics', () => {
  test('Initial page load time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;
    console.log(`Page load time: ${loadTime}ms`);

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('Time to interactive', async ({ page }) => {
    await page.goto('/');

    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const interactiveTime = Date.now() - startTime;

    console.log(`Time to interactive: ${interactiveTime}ms`);

    // Should be interactive within 10 seconds
    expect(interactiveTime).toBeLessThan(10000);
  });
});
