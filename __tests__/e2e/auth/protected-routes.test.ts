import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Protected Routes and Session Management
 *
 * TDD RED PHASE: These tests verify route protection and session handling
 * Expected behavior: ALL tests should FAIL initially
 *
 * Tests:
 * - Protected route access control
 * - Middleware redirects
 * - Session persistence
 * - Sign-out functionality
 */

test.describe('Protected Routes', () => {
  describe('Unauthenticated Access', () => {
    test('should redirect to sign-in when accessing dashboard unauthenticated', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard')

      // Should redirect to sign-in
      await expect(page).toHaveURL(/sign-in/)
      await expect(page).toHaveURL(/redirect_url.*dashboard/)
    })

    test('should redirect to sign-in when accessing /rfp routes', async ({ page }) => {
      await page.goto('http://localhost:3000/rfp/new')

      await expect(page).toHaveURL(/sign-in/)
    })

    test('should redirect to sign-in when accessing /clients routes', async ({ page }) => {
      await page.goto('http://localhost:3000/clients')

      await expect(page).toHaveURL(/sign-in/)
    })

    test('should redirect to sign-in when accessing /proposals routes', async ({ page }) => {
      await page.goto('http://localhost:3000/proposals')

      await expect(page).toHaveURL(/sign-in/)
    })

    test('should redirect to sign-in when accessing /settings', async ({ page }) => {
      await page.goto('http://localhost:3000/settings')

      await expect(page).toHaveURL(/sign-in/)
    })
  })

  describe('Public Routes', () => {
    test('should allow access to home page', async ({ page }) => {
      await page.goto('http://localhost:3000/')

      await expect(page).toHaveURL('http://localhost:3000/')
      expect(page.url()).not.toContain('sign-in')
    })

    test('should allow access to sign-in page', async ({ page }) => {
      await page.goto('http://localhost:3000/sign-in')

      await expect(page).toHaveURL(/sign-in/)
    })

    test('should allow access to sign-up page', async ({ page }) => {
      await page.goto('http://localhost:3000/sign-up')

      await expect(page).toHaveURL(/sign-up/)
    })

    test('should allow access to public webhook endpoints', async ({ page }) => {
      const response = await page.request.post('http://localhost:3000/api/webhooks/clerk', {
        data: { type: 'test' },
      })

      // Should not return 302 redirect
      expect(response.status()).not.toBe(302)
    })
  })

  describe('Authenticated Access', () => {
    test.beforeEach(async ({ page }) => {
      // Sign in before each test
      await page.goto('http://localhost:3000/sign-in')
      await page.fill('input[name="identifier"]', 'test@example.com')
      await page.fill('input[name="password"]', 'TestPassword123!')
      await page.click('button[type="submit"]')
      await page.waitForURL(/dashboard/)
    })

    test('should access dashboard when authenticated', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard')

      await expect(page).toHaveURL(/dashboard/)
      await expect(page.locator('h1')).toContainText(/dashboard/i)
    })

    test('should access /rfp routes when authenticated', async ({ page }) => {
      await page.goto('http://localhost:3000/rfp/new')

      await expect(page).toHaveURL(/rfp\/new/)
      expect(page.url()).not.toContain('sign-in')
    })

    test('should access /clients routes when authenticated', async ({ page }) => {
      await page.goto('http://localhost:3000/clients')

      await expect(page).toHaveURL(/clients/)
    })

    test('should access /proposals routes when authenticated', async ({ page }) => {
      await page.goto('http://localhost:3000/proposals')

      await expect(page).toHaveURL(/proposals/)
    })

    test('should access /settings when authenticated', async ({ page }) => {
      await page.goto('http://localhost:3000/settings')

      await expect(page).toHaveURL(/settings/)
    })

    test('should display user menu when authenticated', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard')

      // Should show user menu/avatar
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    })

    test('should display user email in profile section', async ({ page }) => {
      await page.goto('http://localhost:3000/settings')

      await expect(page.locator('text=/test@example\\.com/i')).toBeVisible()
    })
  })

  describe('Return URL After Login', () => {
    test('should redirect to originally requested page after login', async ({ page }) => {
      // Try to access protected page
      await page.goto('http://localhost:3000/rfp/new')

      // Should redirect to sign-in with return URL
      await expect(page).toHaveURL(/sign-in/)

      // Complete sign-in
      await page.fill('input[name="identifier"]', 'test@example.com')
      await page.fill('input[name="password"]', 'TestPassword123!')
      await page.click('button[type="submit"]')

      // Should redirect back to originally requested page
      await expect(page).toHaveURL('http://localhost:3000/rfp/new')
    })

    test('should preserve query parameters in return URL', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard?view=analytics&period=30d')

      await expect(page).toHaveURL(/sign-in/)

      // Sign in
      await page.fill('input[name="identifier"]', 'test@example.com')
      await page.fill('input[name="password"]', 'TestPassword123!')
      await page.click('button[type="submit"]')

      // Should redirect with query params preserved
      await expect(page).toHaveURL(/dashboard\?view=analytics&period=30d/)
    })
  })
})

test.describe('Session Management', () => {
  describe('Session Persistence', () => {
    test('should maintain session across page reloads', async ({ page }) => {
      // Sign in
      await page.goto('http://localhost:3000/sign-in')
      await page.fill('input[name="identifier"]', 'test@example.com')
      await page.fill('input[name="password"]', 'TestPassword123!')
      await page.click('button[type="submit"]')
      await page.waitForURL(/dashboard/)

      // Reload page
      await page.reload()

      // Should still be authenticated
      await expect(page).toHaveURL(/dashboard/)
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    })

    test('should maintain session across navigation', async ({ page }) => {
      // Sign in
      await page.goto('http://localhost:3000/sign-in')
      await page.fill('input[name="identifier"]', 'test@example.com')
      await page.fill('input[name="password"]', 'TestPassword123!')
      await page.click('button[type="submit"]')
      await page.waitForURL(/dashboard/)

      // Navigate to different protected pages
      await page.goto('http://localhost:3000/clients')
      await expect(page).toHaveURL(/clients/)

      await page.goto('http://localhost:3000/proposals')
      await expect(page).toHaveURL(/proposals/)

      await page.goto('http://localhost:3000/settings')
      await expect(page).toHaveURL(/settings/)

      // Should remain authenticated throughout
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    })

    test('should persist session with "Remember Me"', async ({ page, context }) => {
      await page.goto('http://localhost:3000/sign-in')
      await page.fill('input[name="identifier"]', 'test@example.com')
      await page.fill('input[name="password"]', 'TestPassword123!')
      await page.check('input[type="checkbox"][name*="remember"]')
      await page.click('button[type="submit"]')
      await page.waitForURL(/dashboard/)

      // Check session cookie
      const cookies = await context.cookies()
      const sessionCookie = cookies.find(c => c.name.includes('clerk') || c.name.includes('session'))

      expect(sessionCookie).toBeDefined()
      // Should have long expiration (30 days)
      const expirationDays = (sessionCookie!.expires - Date.now() / 1000) / 86400
      expect(expirationDays).toBeGreaterThan(25)
    })
  })

  describe('Session Expiration', () => {
    test('should redirect to sign-in when session expires', async ({ page, context }) => {
      // Sign in
      await page.goto('http://localhost:3000/sign-in')
      await page.fill('input[name="identifier"]', 'test@example.com')
      await page.fill('input[name="password"]', 'TestPassword123!')
      await page.click('button[type="submit"]')
      await page.waitForURL(/dashboard/)

      // Clear session cookies to simulate expiration
      await context.clearCookies()

      // Try to access protected route
      await page.goto('http://localhost:3000/dashboard')

      // Should redirect to sign-in
      await expect(page).toHaveURL(/sign-in/)
    })

    test('should show session expiration message', async ({ page, context }) => {
      // Sign in
      await page.goto('http://localhost:3000/sign-in')
      await page.fill('input[name="identifier"]', 'test@example.com')
      await page.fill('input[name="password"]', 'TestPassword123!')
      await page.click('button[type="submit"]')
      await page.waitForURL(/dashboard/)

      // Clear session
      await context.clearCookies()
      await page.goto('http://localhost:3000/dashboard')

      // Should show expiration message
      await expect(page.locator('text=/session expired|please sign in again/i')).toBeVisible()
    })
  })
})

test.describe('Sign Out Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in before each test
    await page.goto('http://localhost:3000/sign-in')
    await page.fill('input[name="identifier"]', 'test@example.com')
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/dashboard/)
  })

  test('should have sign-out button in user menu', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard')

    // Open user menu
    await page.click('[data-testid="user-menu"]')

    // Should show sign-out option
    await expect(page.locator('button:has-text("Sign out")')).toBeVisible()
  })

  test('should sign out user when clicking sign-out button', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard')

    // Click sign-out
    await page.click('[data-testid="user-menu"]')
    await page.click('button:has-text("Sign out")')

    // Should redirect to home or sign-in
    await page.waitForURL(/sign-in|^\/$/)

    // Should not have access to protected routes
    await page.goto('http://localhost:3000/dashboard')
    await expect(page).toHaveURL(/sign-in/)
  })

  test('should clear session on sign-out', async ({ page, context }) => {
    await page.goto('http://localhost:3000/dashboard')

    // Sign out
    await page.click('[data-testid="user-menu"]')
    await page.click('button:has-text("Sign out")')

    await page.waitForURL(/sign-in|^\/$/)

    // Session cookies should be cleared
    const cookies = await context.cookies()
    const sessionCookie = cookies.find(c => c.name.includes('clerk'))

    expect(sessionCookie).toBeUndefined()
  })

  test('should show sign-out confirmation', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard')

    await page.click('[data-testid="user-menu"]')
    await page.click('button:has-text("Sign out")')

    // Should show confirmation or success message
    await expect(page.locator('text=/signed out|logged out/i')).toBeVisible()
  })

  test('should redirect all tabs on sign-out', async ({ page, context }) => {
    // Open dashboard in first tab
    await page.goto('http://localhost:3000/dashboard')

    // Open second tab
    const page2 = await context.newPage()
    await page2.goto('http://localhost:3000/clients')

    // Sign out from first tab
    await page.click('[data-testid="user-menu"]')
    await page.click('button:has-text("Sign out")')

    // Both tabs should redirect to sign-in
    await expect(page).toHaveURL(/sign-in|^\/$/)

    // Refresh second tab - should also be signed out
    await page2.reload()
    await expect(page2).toHaveURL(/sign-in/)
  })
})

test.describe('API Route Protection', () => {
  describe('Authenticated API Access', () => {
    test('should allow authenticated requests to protected APIs', async ({ page, request }) => {
      // Sign in
      await page.goto('http://localhost:3000/sign-in')
      await page.fill('input[name="identifier"]', 'test@example.com')
      await page.fill('input[name="password"]', 'TestPassword123!')
      await page.click('button[type="submit"]')
      await page.waitForURL(/dashboard/)

      // Make API request (cookies from page context)
      const response = await page.request.get('http://localhost:3000/api/requests')

      expect(response.status()).not.toBe(401)
      expect(response.status()).not.toBe(302)
    })
  })

  describe('Unauthenticated API Access', () => {
    test('should return 401 for unauthenticated API requests', async ({ request }) => {
      const response = await request.get('http://localhost:3000/api/requests')

      expect(response.status()).toBe(401)
    })

    test('should return 401 for /api/quotes without auth', async ({ request }) => {
      const response = await request.get('http://localhost:3000/api/quotes')

      expect(response.status()).toBe(401)
    })

    test('should return 401 for /api/clients without auth', async ({ request }) => {
      const response = await request.get('http://localhost:3000/api/clients')

      expect(response.status()).toBe(401)
    })
  })
})
