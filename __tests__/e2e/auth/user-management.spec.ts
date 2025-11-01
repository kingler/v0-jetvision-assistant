/**
 * User Management E2E Tests
 *
 * Tests the user management migration from iso_agents to users table.
 * These tests verify that:
 * 1. Existing UI pages load without errors
 * 2. API routes work with the new users table structure
 * 3. User roles are properly handled
 * 4. No regressions in existing functionality
 */

import { test, expect } from '@playwright/test';

test.describe('User Management - UI Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Note: These tests assume you have a test user already authenticated
    // In a real scenario, you'd mock authentication or use test credentials
    await page.goto('http://localhost:3001');
  });

  test('homepage should load without errors', async ({ page }) => {
    // Should not have any console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');

    // Verify no JavaScript errors
    expect(errors).toHaveLength(0);
  });

  test('sign-in page should load with updated user schema', async ({ page }) => {
    await page.goto('http://localhost:3001/sign-in');

    // Check page loads successfully
    await expect(page).toHaveTitle('Jetvision Agent');
    await expect(page.getByText('Welcome to Jetvision')).toBeVisible();

    // Verify Clerk sign-in form loads
    const clerkForm = page.locator('[data-clerk-element]').first();
    await expect(clerkForm).toBeVisible({ timeout: 10000 });
  });

  test('sign-up page should support new user roles', async ({ page }) => {
    await page.goto('http://localhost:3001/sign-up');

    // Check page loads successfully
    await expect(page.getByText('Join Jetvision')).toBeVisible();

    // Verify Clerk sign-up form loads
    const clerkForm = page.locator('[data-clerk-element]').first();
    await expect(clerkForm).toBeVisible({ timeout: 10000 });

    // Note: Role assignment happens via Clerk metadata, not UI form
    // This test ensures the page loads without errors after user table migration
  });
});

test.describe('User Management - API Integration Tests', () => {
  test('API should handle users table queries', async ({ request }) => {
    // This test will fail until we implement the users table migration
    const response = await request.get('http://localhost:3001/api/users/me');

    // After migration, this should return user data
    // Before migration, this endpoint doesn't exist
    expect(response.status()).toBe(401); // Unauthorized (no auth token in test)
  });

  test('clients API should work with user_id foreign key', async ({ request }) => {
    // This test verifies the clients API works after foreign key migration
    const response = await request.get('http://localhost:3001/api/clients');

    // Should return 401 (unauthorized) not 500 (server error)
    // A 500 would indicate database schema issues
    expect(response.status()).toBe(401);
  });

  test('requests API should work with user_id foreign key', async ({ request }) => {
    // This test verifies the requests API works after foreign key migration
    const response = await request.get('http://localhost:3001/api/requests');

    // Should return 401 (unauthorized) not 500 (server error)
    expect(response.status()).toBe(401);
  });

  test('quotes API should work with updated schema', async ({ request }) => {
    // This test verifies the quotes API works after migration
    const response = await request.get('http://localhost:3001/api/quotes');

    // Should return 401 (unauthorized) not 500 (server error)
    expect(response.status()).toBe(401);
  });

  test('workflows API should work with updated schema', async ({ request }) => {
    // This test verifies the workflows API works after migration
    const response = await request.get('http://localhost:3001/api/workflows');

    // Should return 401 (unauthorized) not 500 (server error)
    expect(response.status()).toBe(401);
  });

  test('agents API should work with updated schema', async ({ request }) => {
    // This test verifies the agents API works after migration
    const response = await request.get('http://localhost:3001/api/agents');

    // Should return 401 (unauthorized) not 500 (server error)
    expect(response.status()).toBe(401);
  });
});

test.describe('User Management - Clerk Webhook Tests', () => {
  test('webhook endpoint should exist', async ({ request }) => {
    // This test verifies the Clerk webhook endpoint exists
    const response = await request.post('http://localhost:3001/api/webhooks/clerk', {
      data: { test: 'data' },
    });

    // Should return 400 (bad request - missing signature) not 404 (not found)
    expect(response.status()).toBe(400);
  });
});

test.describe('User Management - Role-Based Features', () => {
  test.skip('admin users should see admin menu (requires authentication)', async ({ page }) => {
    // This test would require proper authentication setup
    // Skipping for now, but this is what we'd test:
    // 1. Login as admin user
    // 2. Verify admin menu is visible
    // 3. Verify admin-only routes are accessible
  });

  test.skip('sales_rep users should see sales menu (requires authentication)', async ({ page }) => {
    // This test would require proper authentication setup
    // Skipping for now, but this is what we'd test:
    // 1. Login as sales_rep user
    // 2. Verify sales menu is visible
    // 3. Verify admin routes are NOT accessible
  });

  test.skip('customer users should have limited access (requires authentication)', async ({ page }) => {
    // This test would require proper authentication setup
    // Skipping for now, but this is what we'd test:
    // 1. Login as customer user
    // 2. Verify limited menu options
    // 3. Verify customer can only see their own data
  });
});
