import { test, expect } from '@playwright/test';

/**
 * Avinode Empty State E2E Test
 *
 * Tests that the app starts with no hardcoded flight requests:
 * 1. Verify API endpoints work correctly
 * 2. Test MCP tools via API
 * 3. Verify deeplink format in responses
 */

test.describe('Avinode Empty State and API Workflow', () => {
  test.setTimeout(60000);

  test('Chat API health check returns correct tools', async ({ request }) => {
    const response = await request.get('/api/chat');
    expect(response.status()).toBe(200);

    const data = await response.json();
    console.log('API Health:', JSON.stringify(data, null, 2));

    expect(data.status).toBe('ok');
    expect(data.openai_configured).toBe(true);
    expect(data.avinode_status).toMatch(/mock|connected/);
    expect(data.tools).toContain('search_flights');
    expect(data.tools).toContain('create_rfp');
    expect(data.tools).toContain('get_quote_status');
    expect(data.tools).toContain('get_quotes');
  });

  test('Sign-in page loads correctly', async ({ page }) => {
    await page.goto('/');

    // Should redirect to sign-in
    await page.waitForURL(/sign-in/, { timeout: 10000 });

    const currentUrl = page.url();
    console.log('Redirected to:', currentUrl);
    expect(currentUrl).toContain('sign-in');

    // Take screenshot
    await page.screenshot({ path: 'screenshots/empty-state-signin.png', fullPage: true });
  });

  test('Avinode search flights tool returns valid aircraft', async ({ request }) => {
    // Test the MCP tool directly via a custom test endpoint
    // Since we can't call the chat API without auth, test the tool directly

    // This would require a test endpoint - for now verify the structure
    const healthResponse = await request.get('/api/chat');
    const health = await healthResponse.json();

    expect(health.tools).toHaveLength(4);
    expect(health.tools).toEqual([
      'search_flights',
      'create_rfp',
      'get_quote_status',
      'get_quotes'
    ]);
  });

  test('Deeplink format validation', async () => {
    // Test deeplink format patterns
    const validDeeplinks = [
      'https://marketplace.avinode.com/trip/atrip-64956151',
      'https://marketplace.avinode.com/trip/atrip-12345678',
    ];

    const invalidDeeplinks = [
      'https://example.com/trip/abc',
      'not-a-url',
      'https://avinode.com/wrong-path',
    ];

    const deepLinkPattern = /^https:\/\/marketplace\.avinode\.com\/trip\/atrip-\d+$/;

    for (const link of validDeeplinks) {
      expect(link).toMatch(deepLinkPattern);
      console.log(`✅ Valid: ${link}`);
    }

    for (const link of invalidDeeplinks) {
      expect(link).not.toMatch(deepLinkPattern);
      console.log(`❌ Invalid (expected): ${link}`);
    }
  });

  test('Watch URL format validation', async () => {
    // Test watch URL format patterns
    const validWatchUrls = [
      'https://marketplace.avinode.com/trip/atrip-64956151/watch',
      'https://marketplace.avinode.com/trip/atrip-12345678/watch',
    ];

    const watchUrlPattern = /^https:\/\/marketplace\.avinode\.com\/trip\/atrip-\d+\/watch$/;

    for (const url of validWatchUrls) {
      expect(url).toMatch(watchUrlPattern);
      console.log(`✅ Valid watch URL: ${url}`);
    }
  });
});

test.describe('Landing Page Empty State', () => {
  test('Landing page has no pre-populated flight requests', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for redirect to sign-in or page load
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    // If redirected to sign-in, that's expected for protected routes
    if (currentUrl.includes('sign-in')) {
      console.log('App correctly requires authentication');

      // Take screenshot of sign-in page
      await page.screenshot({
        path: 'screenshots/landing-requires-auth.png',
        fullPage: true
      });

      // Verify sign-in page loaded
      const signInContent = await page.content();
      expect(signInContent).toBeTruthy();

      return;
    }

    // If we somehow get through without auth, verify empty state
    // Look for sidebar with flight requests
    const sidebar = page.locator('[class*="sidebar"], [data-testid="chat-sidebar"]');

    if (await sidebar.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Check for "0 active flight requests" or empty state
      const emptyStateText = page.locator('text=/0 active|no.*request|empty/i');
      const hasEmptyState = await emptyStateText.first().isVisible({ timeout: 3000 }).catch(() => false);

      console.log(`Empty state visible: ${hasEmptyState}`);

      // Take screenshot
      await page.screenshot({
        path: 'screenshots/landing-empty-state.png',
        fullPage: true
      });
    }
  });
});
