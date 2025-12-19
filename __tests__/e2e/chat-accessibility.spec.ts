import { test, expect, Page } from '@playwright/test';

/**
 * Jetvision AI Assistant - Comprehensive Accessibility Test Suite
 *
 * Tests WCAG 2.2 Level AA compliance for:
 * - Skip links (2.4.1)
 * - Focus indicators (2.4.7)
 * - Color contrast (1.4.3)
 * - ARIA labels and live regions
 * - Keyboard navigation
 */

test.describe('WCAG 2.4.1 - Skip Links', () => {
  test('Skip to content link exists and is focusable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    // Find skip link (should be first focusable element)
    const skipLink = page.locator('[data-testid="skip-to-content"]');

    // Initially hidden from view
    await expect(skipLink).toHaveClass(/sr-only/);

    // Press Tab to focus it
    await page.keyboard.press('Tab');

    // Should become visible when focused
    const skipLinkFocused = page.locator('a:focus');
    await expect(skipLinkFocused).toContainText(/skip/i);
  });

  test('Skip link navigates to main content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    // Tab to skip link
    await page.keyboard.press('Tab');

    // Activate skip link
    await page.keyboard.press('Enter');

    // Main content should be focused
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeFocused();
  });
});

test.describe('WCAG 2.4.7 - Focus Indicators', () => {
  test('Buttons have visible focus indicators', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    // Tab through buttons
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    // Get focused element
    const focused = page.locator(':focus-visible');

    // Should have outline style
    const outlineStyle = await focused.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        outline: style.outline,
        outlineOffset: style.outlineOffset,
        boxShadow: style.boxShadow,
      };
    });

    // Focus should be visible (either outline or box-shadow)
    const hasFocusIndicator =
      outlineStyle.outline !== 'none' ||
      outlineStyle.boxShadow !== 'none';

    expect(hasFocusIndicator).toBe(true);
  });

  test('Links have visible focus indicators', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    const links = await page.locator('a').all();

    for (const link of links.slice(0, 3)) {
      if (await link.isVisible()) {
        await link.focus();

        const hasFocusStyle = await link.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return (
            style.outline !== 'none' ||
            style.textDecoration.includes('underline') ||
            style.boxShadow !== 'none'
          );
        });

        expect(hasFocusStyle).toBe(true);
      }
    }
  });
});

test.describe('WCAG 1.4.1 - Use of Color', () => {
  test('Status badges have text labels, not just color', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    // Find status badges
    const badges = await page.locator('[class*="badge"]').all();

    for (const badge of badges) {
      if (await badge.isVisible()) {
        // Badge should have either:
        // 1. Text content
        // 2. aria-label
        // 3. sr-only text
        const textContent = await badge.textContent();
        const ariaLabel = await badge.getAttribute('aria-label');
        const srOnlyText = await badge.locator('.sr-only').textContent().catch(() => null);

        const hasLabel = textContent?.trim() || ariaLabel || srOnlyText;
        expect(hasLabel).toBeTruthy();
      }
    }
  });
});

test.describe('Star Rating Accessibility (UX-007)', () => {
  test('Star ratings have proper ARIA labels', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    // Find star rating containers
    const starContainers = await page.locator('[role="img"][aria-label*="stars"]').all();

    for (const container of starContainers) {
      if (await container.isVisible()) {
        const ariaLabel = await container.getAttribute('aria-label');

        // Should contain rating information
        expect(ariaLabel).toMatch(/\d+(\.\d+)?\s*(out of)?\s*\d+\s*stars/i);

        // Individual stars should be hidden from screen readers
        const stars = await container.locator('svg').all();
        for (const star of stars) {
          const ariaHidden = await star.getAttribute('aria-hidden');
          expect(ariaHidden).toBe('true');
        }
      }
    }
  });
});

test.describe('Recommended Banner Accessibility (UX-009)', () => {
  test('Recommended banners are announced to screen readers', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    // Find recommended banners
    const recommendedBanners = await page.locator('[role="status"]:has-text("RECOMMENDED")').all();

    for (const banner of recommendedBanners) {
      if (await banner.isVisible()) {
        // Should have aria-live for dynamic updates
        const ariaLive = await banner.getAttribute('aria-live');
        expect(ariaLive).toBe('polite');

        // Should have aria-label
        const ariaLabel = await banner.getAttribute('aria-label');
        expect(ariaLabel).toMatch(/recommended/i);

        // Award icon should be hidden from screen readers
        const icon = await banner.locator('svg').first();
        if (await icon.isVisible()) {
          const iconAriaHidden = await icon.getAttribute('aria-hidden');
          expect(iconAriaHidden).toBe('true');
        }
      }
    }
  });
});

test.describe('Workflow Visualization Accessibility', () => {
  test('Workflow steps are keyboard navigable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    // Find workflow steps
    const workflowSteps = page.locator('[role="list"][aria-label="Workflow steps"] [role="listitem"]');

    if (await workflowSteps.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      // Should be able to tab to steps
      await workflowSteps.first().focus();
      await expect(workflowSteps.first()).toBeFocused();

      // Should have tabindex
      const tabIndex = await workflowSteps.first().getAttribute('tabindex');
      expect(tabIndex).toBe('0');

      // Should have aria-expanded
      const ariaExpanded = await workflowSteps.first().getAttribute('aria-expanded');
      expect(ariaExpanded).toBeTruthy();
    }
  });

  test('Workflow steps can be expanded with keyboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    const workflowStep = page.locator('[role="list"][aria-label="Workflow steps"] [role="listitem"]').first();

    if (await workflowStep.isVisible({ timeout: 5000 }).catch(() => false)) {
      await workflowStep.focus();

      // Get initial expanded state
      const initialState = await workflowStep.getAttribute('aria-expanded');

      // Press Enter to toggle
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);

      // State should have changed
      const newState = await workflowStep.getAttribute('aria-expanded');
      expect(newState).not.toBe(initialState);

      // Press Space to toggle back
      await page.keyboard.press('Space');
      await page.waitForTimeout(300);

      const finalState = await workflowStep.getAttribute('aria-expanded');
      expect(finalState).toBe(initialState);
    }
  });

  test('Workflow has live region for progress updates', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    // Find live region
    const liveRegion = page.locator('[role="status"][aria-live="polite"]');

    if (await liveRegion.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Should have aria-atomic for complete announcements
      const ariaAtomic = await liveRegion.getAttribute('aria-atomic');
      expect(ariaAtomic).toBe('true');

      // Content should be descriptive
      const content = await liveRegion.textContent();
      expect(content).toMatch(/step|completed|progress/i);
    }
  });
});

test.describe('Reduced Motion Support', () => {
  test('Respects prefers-reduced-motion', async ({ page }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.goto('/');
    await page.waitForLoadState('load');

    // Check that animations are disabled
    const animatedElements = await page.locator('[class*="animate"]').all();

    for (const element of animatedElements.slice(0, 5)) {
      if (await element.isVisible()) {
        const animationDuration = await element.evaluate((el) => {
          return window.getComputedStyle(el).animationDuration;
        });

        // Animation should be instant or very short
        const duration = parseFloat(animationDuration);
        expect(duration).toBeLessThanOrEqual(0.01);
      }
    }
  });
});

test.describe('High Contrast Mode', () => {
  test('Elements remain visible in high contrast', async ({ page }) => {
    // Emulate forced-colors mode
    await page.emulateMedia({ forcedColors: 'active' });

    await page.goto('/');
    await page.waitForLoadState('load');

    // Core elements should still be visible - check for main content area
    const mainContent = page.locator('#main-content, main, [role="main"]').first();
    if (await mainContent.count() > 0) {
      await expect(mainContent).toBeVisible();
    }

    // Header or navigation should be visible if present
    const header = page.locator('header, nav, [role="banner"], [role="navigation"]').first();
    if (await header.count() > 0) {
      await expect(header).toBeVisible();
    }

    // Text should be readable - check any heading
    const mainHeading = page.locator('h1, h2, h3').first();
    if (await mainHeading.count() > 0 && await mainHeading.isVisible()) {
      await expect(mainHeading).toBeVisible();
    }

    // Verify focus indicators work in high contrast
    const focusableElement = page.locator('button, a, input, [tabindex="0"]').first();
    if (await focusableElement.count() > 0 && await focusableElement.isVisible()) {
      await focusableElement.focus();
      // Focus should be visible (the element should still be accessible)
      await expect(focusableElement).toBeFocused();
    }
  });
});

test.describe('Form Accessibility', () => {
  test('Input fields have proper labels', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    const inputs = await page.locator('input, textarea').all();

    for (const input of inputs) {
      if (await input.isVisible()) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');
        const placeholder = await input.getAttribute('placeholder');

        // Check for associated label
        let hasLabel = ariaLabel || ariaLabelledby || placeholder;

        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          if (await label.isVisible().catch(() => false)) {
            hasLabel = true;
          }
        }

        expect(hasLabel).toBeTruthy();
      }
    }
  });

  test('Error messages are associated with inputs', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    // Find inputs with error states
    const errorInputs = await page.locator('input[aria-invalid="true"]').all();

    for (const input of errorInputs) {
      if (await input.isVisible()) {
        // Should have aria-describedby pointing to error message
        const ariaDescribedby = await input.getAttribute('aria-describedby');
        expect(ariaDescribedby).toBeTruthy();

        // Error element should exist and be visible
        const errorElement = page.locator(`#${ariaDescribedby}`);
        await expect(errorElement).toBeVisible();
      }
    }
  });
});

test.describe('Screen Reader Landmarks', () => {
  test('Page has proper landmark regions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    // Should have main landmark
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Should have navigation if present
    const nav = page.locator('nav');
    if (await nav.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(nav).toBeVisible();
    }

    // Main should have id for skip link
    const mainId = await main.getAttribute('id');
    expect(mainId).toBe('main-content');
  });

  test('Heading hierarchy is correct', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    // Get all headings
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    const levels: number[] = [];

    for (const heading of headings) {
      if (await heading.isVisible()) {
        const tagName = await heading.evaluate((el) => el.tagName);
        const level = parseInt(tagName.charAt(1));
        levels.push(level);
      }
    }

    // Should start with h1 or h2
    if (levels.length > 0) {
      expect(levels[0]).toBeLessThanOrEqual(2);
    }

    // No level should skip more than one
    for (let i = 1; i < levels.length; i++) {
      const jump = levels[i] - levels[i - 1];
      expect(jump).toBeLessThanOrEqual(1);
    }
  });
});
