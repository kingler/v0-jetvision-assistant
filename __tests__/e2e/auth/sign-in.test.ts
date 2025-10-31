import { test, expect } from '@playwright/test'

/**
 * E2E Tests for User Sign In Flow
 *
 * TDD RED PHASE: These tests verify user-facing authentication workflows
 * Expected behavior: ALL tests should FAIL initially
 *
 * Tests the complete user journey:
 * - Sign-in page rendering
 * - Email/password authentication
 * - OAuth authentication
 * - Error handling
 * - Post-login redirects
 */

test.describe('User Sign In Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to sign-in page before each test
    await page.goto('http://localhost:3000/sign-in')
  })

  describe('Sign In Page Rendering', () => {
    test('should display sign-in form with email and password fields', async ({ page }) => {
      // Check for form elements
      await expect(page.locator('input[name="identifier"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })

    test('should display OAuth providers (Google)', async ({ page }) => {
      // Check for Google OAuth button
      await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible()
    })

    test('should have link to sign-up page', async ({ page }) => {
      await expect(page.locator('a[href*="sign-up"]')).toBeVisible()
    })

    test('should have "Forgot Password" link', async ({ page }) => {
      await expect(page.locator('a:has-text("Forgot password")')).toBeVisible()
    })
  })

  describe('Email/Password Sign In', () => {
    test('should sign in with valid email and password', async ({ page }) => {
      // Fill in credentials
      await page.fill('input[name="identifier"]', 'test@example.com')
      await page.fill('input[name="password"]', 'TestPassword123!')

      // Submit form
      await page.click('button[type="submit"]')

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/)
      await expect(page.locator('h1')).toContainText('Dashboard')
    })

    test('should show error for invalid email', async ({ page }) => {
      await page.fill('input[name="identifier"]', 'invalid@example.com')
      await page.fill('input[name="password"]', 'WrongPassword123!')

      await page.click('button[type="submit"]')

      // Should show error message
      await expect(page.locator('[role="alert"]')).toContainText(/invalid|incorrect/i)
    })

    test('should show error for invalid password', async ({ page }) => {
      await page.fill('input[name="identifier"]', 'test@example.com')
      await page.fill('input[name="password"]', 'wrongpassword')

      await page.click('button[type="submit"]')

      await expect(page.locator('[role="alert"]')).toContainText(/invalid|incorrect/i)
    })

    test('should validate email format', async ({ page }) => {
      await page.fill('input[name="identifier"]', 'notanemail')
      await page.fill('input[name="password"]', 'Password123!')

      await page.click('button[type="submit"]')

      // Should show validation error
      await expect(page.locator('[role="alert"]')).toBeVisible()
    })

    test('should require password field', async ({ page }) => {
      await page.fill('input[name="identifier"]', 'test@example.com')
      // Leave password empty

      await page.click('button[type="submit"]')

      // Should show required field error
      await expect(page.locator('[role="alert"]')).toBeVisible()
    })
  })

  describe('OAuth Sign In', () => {
    test('should initiate Google OAuth flow', async ({ page }) => {
      // Click Google sign-in button
      await page.click('button:has-text("Continue with Google")')

      // Should redirect to Google OAuth
      await expect(page).toHaveURL(/accounts\.google\.com/)
    })

    test('should complete OAuth flow and create session', async ({ page, context }) => {
      // This would require actual OAuth credentials in test environment
      // For now, we test that the flow initiates correctly
      await page.click('button:has-text("Continue with Google")')

      // Wait for redirect
      await page.waitForURL(/accounts\.google\.com/, { timeout: 5000 })

      // In full implementation, would complete OAuth flow here
      expect(page.url()).toContain('google.com')
    })
  })

  describe('Remember Me Functionality', () => {
    test('should have "Remember me" checkbox', async ({ page }) => {
      await expect(page.locator('input[type="checkbox"][name*="remember"]')).toBeVisible()
    })

    test('should persist session when "Remember me" is checked', async ({ page, context }) => {
      await page.fill('input[name="identifier"]', 'test@example.com')
      await page.fill('input[name="password"]', 'TestPassword123!')
      await page.check('input[type="checkbox"][name*="remember"]')

      await page.click('button[type="submit"]')

      await expect(page).toHaveURL(/\/dashboard/)

      // Check for session cookie
      const cookies = await context.cookies()
      const sessionCookie = cookies.find(c => c.name.includes('clerk'))

      expect(sessionCookie).toBeDefined()
      expect(sessionCookie?.expires).toBeGreaterThan(Date.now() / 1000)
    })
  })

  describe('Loading States', () => {
    test('should show loading state during sign-in', async ({ page }) => {
      await page.fill('input[name="identifier"]', 'test@example.com')
      await page.fill('input[name="password"]', 'TestPassword123!')

      // Click submit and immediately check for loading state
      await page.click('button[type="submit"]')

      // Button should show loading state
      await expect(page.locator('button[type="submit"][disabled]')).toBeVisible()
    })

    test('should disable form inputs during submission', async ({ page }) => {
      await page.fill('input[name="identifier"]', 'test@example.com')
      await page.fill('input[name="password"]', 'TestPassword123!')

      await page.click('button[type="submit"]')

      // Form fields should be disabled
      await expect(page.locator('input[name="identifier"][disabled]')).toBeVisible()
      await expect(page.locator('input[name="password"][disabled]')).toBeVisible()
    })
  })

  describe('Post-Login Redirects', () => {
    test('should redirect to dashboard after successful login', async ({ page }) => {
      await page.fill('input[name="identifier"]', 'test@example.com')
      await page.fill('input[name="password"]', 'TestPassword123!')
      await page.click('button[type="submit"]')

      await expect(page).toHaveURL('http://localhost:3000/dashboard')
    })

    test('should redirect to originally requested page after login', async ({ page }) => {
      // Try to access protected page while logged out
      await page.goto('http://localhost:3000/rfp/new')

      // Should redirect to sign-in with return URL
      await expect(page).toHaveURL(/sign-in/)

      // Sign in
      await page.fill('input[name="identifier"]', 'test@example.com')
      await page.fill('input[name="password"]', 'TestPassword123!')
      await page.click('button[type="submit"]')

      // Should redirect back to originally requested page
      await expect(page).toHaveURL('http://localhost:3000/rfp/new')
    })
  })

  describe('Rate Limiting', () => {
    test('should show rate limit error after multiple failed attempts', async ({ page }) => {
      // Attempt sign in 5 times with wrong password
      for (let i = 0; i < 5; i++) {
        await page.fill('input[name="identifier"]', 'test@example.com')
        await page.fill('input[name="password"]', 'WrongPassword!')
        await page.click('button[type="submit"]')
        await page.waitForTimeout(500)
      }

      // Should show rate limit message
      await expect(page.locator('[role="alert"]')).toContainText(/too many attempts|rate limit/i)
    })
  })

  describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      await expect(page.locator('input[name="identifier"][aria-label]')).toBeVisible()
      await expect(page.locator('input[name="password"][aria-label]')).toBeVisible()
    })

    test('should be keyboard navigable', async ({ page }) => {
      // Tab through form elements
      await page.keyboard.press('Tab')
      await expect(page.locator('input[name="identifier"]:focus')).toBeVisible()

      await page.keyboard.press('Tab')
      await expect(page.locator('input[name="password"]:focus')).toBeVisible()

      await page.keyboard.press('Tab')
      await expect(page.locator('button[type="submit"]:focus')).toBeVisible()
    })

    test('should announce errors to screen readers', async ({ page }) => {
      await page.fill('input[name="identifier"]', 'invalid@example.com')
      await page.fill('input[name="password"]', 'wrong')
      await page.click('button[type="submit"]')

      // Error should have aria-live region
      await expect(page.locator('[role="alert"][aria-live="polite"]')).toBeVisible()
    })
  })
})
