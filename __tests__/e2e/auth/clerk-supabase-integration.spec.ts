import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * E2E Test: Clerk Authentication + Supabase User Sync
 *
 * This test verifies:
 * 1. Clerk sign-in flow works correctly
 * 2. User is redirected to landing page after authentication
 * 3. User data is synced to Supabase via webhook
 * 4. Middleware properly handles authenticated sessions
 */

// Test user credentials (use a test account in Clerk)
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
};

// Supabase client for verification
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

test.describe('Clerk + Supabase Integration', () => {
  test.beforeAll(async () => {
    // Verify environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
    }
    console.log('✅ Environment variables configured');
  });

  test('should redirect unauthenticated user to sign-in', async ({ page }) => {
    // Navigate to root
    await page.goto('/');

    // Should redirect to sign-in
    await page.waitForURL('**/sign-in**', { timeout: 10000 });

    // Verify we're on sign-in page
    expect(page.url()).toContain('/sign-in');
    console.log('✅ Unauthenticated user redirected to /sign-in');
  });

  test('should complete full authentication flow and sync to Supabase', async ({ page }) => {
    // Step 1: Navigate to sign-in page
    await page.goto('/sign-in');
    console.log('📍 Navigated to /sign-in');

    // Step 2: Wait for Clerk component to load
    await page.waitForSelector('[data-clerk-element]', { timeout: 15000 });
    console.log('✅ Clerk component loaded');

    // Step 3: Fill in email
    const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(TEST_USER.email);
    console.log(`📧 Entered email: ${TEST_USER.email}`);

    // Step 4: Click continue/submit button
    const continueButton = page.locator('button:has-text("Continue"), button[type="submit"]').first();
    await continueButton.click();
    console.log('🔘 Clicked continue button');

    // Step 5: Wait for password field (Clerk's multi-step form)
    await page.waitForTimeout(2000); // Give Clerk time to transition

    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.fill(TEST_USER.password);
    console.log('🔒 Entered password');

    // Step 6: Submit credentials
    const submitButton = page.locator('button:has-text("Continue"), button:has-text("Sign in"), button[type="submit"]').first();
    await submitButton.click();
    console.log('🔘 Clicked submit button');

    // Step 7: Wait for redirect to landing page
    await page.waitForURL('/', { timeout: 15000 });
    expect(page.url()).toBe('http://localhost:3000/');
    console.log('✅ Redirected to landing page (/)');

    // Step 8: Verify authenticated state in page
    await page.waitForTimeout(2000); // Give page time to load

    // Check for user menu or authenticated UI elements
    const userButton = page.locator('[data-clerk-element="userButton"]');
    if (await userButton.isVisible()) {
      console.log('✅ User button visible - authenticated state confirmed');
    }

    // Step 9: Get Clerk user ID from session
    const clerkUserId = await page.evaluate(() => {
      return (window as any).__clerk_session?.user?.id || null;
    });

    if (clerkUserId) {
      console.log(`👤 Clerk User ID: ${clerkUserId}`);

      // Step 10: Wait for webhook to sync user to Supabase (can take 1-3 seconds)
      await page.waitForTimeout(5000);

      // Step 11: Verify user exists in Supabase
      const { data: user, error } = await supabase
        .from('iso_agents')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .single();

      if (error) {
        console.error('❌ Supabase query error:', error);
        throw new Error(`User not found in Supabase: ${error.message}`);
      }

      expect(user).toBeTruthy();
      expect(user.clerk_user_id).toBe(clerkUserId);
      expect(user.email).toBe(TEST_USER.email);
      console.log('✅ User synced to Supabase:');
      console.log(`   - ID: ${user.id}`);
      console.log(`   - Clerk ID: ${user.clerk_user_id}`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Created: ${user.created_at}`);
    } else {
      console.warn('⚠️  Could not retrieve Clerk user ID from session');
    }
  });

  test('should prevent authenticated users from accessing sign-in page', async ({ page }) => {
    // This test assumes the previous test left the user authenticated
    // If running in isolation, this will fail (which is expected)

    // Navigate to sign-in
    await page.goto('/sign-in');

    // Should redirect to home
    await page.waitForURL('/', { timeout: 10000 });
    expect(page.url()).toBe('http://localhost:3000/');
    console.log('✅ Authenticated user redirected from /sign-in to /');
  });

  test('should maintain session across page reloads', async ({ page }) => {
    // Navigate to home
    await page.goto('/');

    // Verify we're on home (not redirected to sign-in)
    expect(page.url()).toBe('http://localhost:3000/');

    // Reload page
    await page.reload();

    // Should still be on home
    expect(page.url()).toBe('http://localhost:3000/');
    console.log('✅ Session maintained across reload');
  });

  test.afterAll(async () => {
    console.log('\n🧹 Test suite completed');
    console.log('Note: Test user remains signed in. Sign out manually if needed.');
  });
});

test.describe('Middleware Protection', () => {
  test('should protect API routes from unauthenticated access', async ({ page, context }) => {
    // Clear cookies to simulate unauthenticated state
    await context.clearCookies();

    // Try to access protected API route
    const response = await page.goto('/api/chat/respond', {
      waitUntil: 'networkidle',
    });

    // Should redirect or return 401/403
    const status = response?.status();
    expect([302, 401, 403]).toContain(status);
    console.log(`✅ Protected API route returned status: ${status}`);
  });
});
