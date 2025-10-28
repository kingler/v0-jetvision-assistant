import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should redirect unauthenticated user to sign-in', async ({ page }) => {
    // Navigate to root
    await page.goto('http://localhost:3000');

    // Should redirect to sign-in
    await page.waitForURL('**/sign-in**', { timeout: 5000 });

    // Verify we're on sign-in page
    expect(page.url()).toContain('/sign-in');

    // Verify sign-in page content
    await expect(page.getByText('Welcome to JetVision')).toBeVisible();
    await expect(page.getByText('AI-powered private jet booking assistant')).toBeVisible();
  });

  test('sign-in page should load correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/sign-in');

    // Check page loads
    await expect(page.getByText('Welcome to JetVision')).toBeVisible();

    // Check Clerk form is present (look for email input or sign-in button)
    const clerkForm = page.locator('[data-clerk-element]').first();
    await expect(clerkForm).toBeVisible({ timeout: 10000 });
  });

  test('sign-up page should load correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/sign-up');

    // Check page loads
    await expect(page.getByText('Join JetVision')).toBeVisible();
    await expect(page.getByText('Create your account')).toBeVisible();

    // Check Clerk form is present
    const clerkForm = page.locator('[data-clerk-element]').first();
    await expect(clerkForm).toBeVisible({ timeout: 10000 });
  });

  test('should have correct page titles and metadata', async ({ page }) => {
    await page.goto('http://localhost:3000/sign-in');

    // Check page title
    await expect(page).toHaveTitle('JetVision Agent');
  });
});
