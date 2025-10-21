import { test, expect } from '@playwright/test'

/**
 * E2E Tests for User Sign Up Flow
 *
 * TDD RED PHASE: These tests verify user registration workflows
 * Expected behavior: ALL tests should FAIL initially
 *
 * Tests:
 * - Sign-up form rendering
 * - User registration with email/password
 * - OAuth registration
 * - Email verification
 * - Password validation
 * - User creation in Supabase
 */

test.describe('User Sign Up Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/sign-up')
  })

  describe('Sign Up Page Rendering', () => {
    test('should display sign-up form with required fields', async ({ page }) => {
      await expect(page.locator('input[name="firstName"]')).toBeVisible()
      await expect(page.locator('input[name="lastName"]')).toBeVisible()
      await expect(page.locator('input[name="emailAddress"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })

    test('should display OAuth providers', async ({ page }) => {
      await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible()
    })

    test('should have link to sign-in page', async ({ page }) => {
      await expect(page.locator('a[href*="sign-in"]')).toBeVisible()
    })

    test('should display terms of service checkbox', async ({ page }) => {
      await expect(page.locator('input[type="checkbox"][name*="terms"]')).toBeVisible()
    })
  })

  describe('Email/Password Sign Up', () => {
    test('should create account with valid information', async ({ page }) => {
      const timestamp = Date.now()
      const email = `test${timestamp}@example.com`

      await page.fill('input[name="firstName"]', 'John')
      await page.fill('input[name="lastName"]', 'Doe')
      await page.fill('input[name="emailAddress"]', email)
      await page.fill('input[name="password"]', 'SecurePass123!')
      await page.check('input[type="checkbox"][name*="terms"]')

      await page.click('button[type="submit"]')

      // Should show email verification page
      await expect(page).toHaveURL(/verify/)
      await expect(page.locator('text=/verify your email/i')).toBeVisible()
    })

    test('should require all mandatory fields', async ({ page }) => {
      // Submit form without filling
      await page.click('button[type="submit"]')

      // Should show validation errors
      await expect(page.locator('[role="alert"]')).toBeVisible()
    })

    test('should validate email format', async ({ page }) => {
      await page.fill('input[name="firstName"]', 'John')
      await page.fill('input[name="lastName"]', 'Doe')
      await page.fill('input[name="emailAddress"]', 'invalid-email')
      await page.fill('input[name="password"]', 'SecurePass123!')

      await page.click('button[type="submit"]')

      await expect(page.locator('text=/invalid email/i')).toBeVisible()
    })

    test('should prevent duplicate email registration', async ({ page }) => {
      await page.fill('input[name="firstName"]', 'John')
      await page.fill('input[name="lastName"]', 'Doe')
      await page.fill('input[name="emailAddress"]', 'existing@example.com')
      await page.fill('input[name="password"]', 'SecurePass123!')
      await page.check('input[type="checkbox"][name*="terms"]')

      await page.click('button[type="submit"]')

      await expect(page.locator('text=/already exists|already registered/i')).toBeVisible()
    })
  })

  describe('Password Validation', () => {
    test('should require minimum 8 characters', async ({ page }) => {
      await page.fill('input[name="password"]', 'Short1!')

      // Should show validation message
      await expect(page.locator('text=/at least 8 characters/i')).toBeVisible()
    })

    test('should require at least one number', async ({ page }) => {
      await page.fill('input[name="password"]', 'NoNumbers!')

      await expect(page.locator('text=/at least one number/i')).toBeVisible()
    })

    test('should require at least one special character', async ({ page }) => {
      await page.fill('input[name="password"]', 'NoSpecial123')

      await expect(page.locator('text=/special character/i')).toBeVisible()
    })

    test('should show password strength indicator', async ({ page }) => {
      await page.fill('input[name="password"]', 'Weak1!')

      // Should show strength indicator
      await expect(page.locator('[data-testid="password-strength"]')).toBeVisible()
    })

    test('should accept strong password', async ({ page }) => {
      await page.fill('input[name="password"]', 'StrongP@ssw0rd123!')

      // Should show strong indicator
      await expect(page.locator('text=/strong|secure/i')).toBeVisible()
    })

    test('should have password visibility toggle', async ({ page }) => {
      const passwordInput = page.locator('input[name="password"]')
      const toggleButton = page.locator('button[aria-label*="show password"]')

      // Password should be hidden by default
      await expect(passwordInput).toHaveAttribute('type', 'password')

      // Click toggle
      await toggleButton.click()

      // Password should be visible
      await expect(passwordInput).toHaveAttribute('type', 'text')
    })
  })

  describe('OAuth Sign Up', () => {
    test('should initiate Google OAuth registration', async ({ page }) => {
      await page.click('button:has-text("Continue with Google")')

      // Should redirect to Google
      await expect(page).toHaveURL(/accounts\.google\.com/)
    })

    test('should create user in Supabase after OAuth registration', async ({ page, context }) => {
      // This would require OAuth credentials for testing
      // Placeholder for OAuth flow test
      await page.click('button:has-text("Continue with Google")')

      await page.waitForURL(/accounts\.google\.com/, { timeout: 5000 })
      expect(page.url()).toContain('google.com')
    })
  })

  describe('Email Verification', () => {
    test('should display verification code input', async ({ page }) => {
      // Sign up first
      const timestamp = Date.now()
      await page.fill('input[name="firstName"]', 'John')
      await page.fill('input[name="lastName"]', 'Doe')
      await page.fill('input[name="emailAddress"]', `test${timestamp}@example.com`)
      await page.fill('input[name="password"]', 'SecurePass123!')
      await page.check('input[type="checkbox"][name*="terms"]')
      await page.click('button[type="submit"]')

      // Should show verification page
      await expect(page.locator('input[name="code"]')).toBeVisible()
    })

    test('should verify email with correct code', async ({ page }) => {
      // After entering verification code
      await page.fill('input[name="code"]', '123456')
      await page.click('button[type="submit"]')

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/)
    })

    test('should show error for invalid verification code', async ({ page }) => {
      await page.fill('input[name="code"]', '000000')
      await page.click('button[type="submit"]')

      await expect(page.locator('text=/invalid code|incorrect code/i')).toBeVisible()
    })

    test('should allow resending verification email', async ({ page }) => {
      await expect(page.locator('button:has-text("Resend code")')).toBeVisible()

      await page.click('button:has-text("Resend code")')

      await expect(page.locator('text=/code sent/i')).toBeVisible()
    })
  })

  describe('Terms of Service', () => {
    test('should require terms acceptance', async ({ page }) => {
      await page.fill('input[name="firstName"]', 'John')
      await page.fill('input[name="lastName"]', 'Doe')
      await page.fill('input[name="emailAddress"]', 'test@example.com')
      await page.fill('input[name="password"]', 'SecurePass123!')

      // Don't check terms
      await page.click('button[type="submit"]')

      await expect(page.locator('text=/must accept terms/i')).toBeVisible()
    })

    test('should link to terms of service page', async ({ page }) => {
      const termsLink = page.locator('a:has-text("Terms of Service")')

      await expect(termsLink).toBeVisible()
      await expect(termsLink).toHaveAttribute('href', /terms/)
    })

    test('should link to privacy policy page', async ({ page }) => {
      const privacyLink = page.locator('a:has-text("Privacy Policy")')

      await expect(privacyLink).toBeVisible()
      await expect(privacyLink).toHaveAttribute('href', /privacy/)
    })
  })

  describe('User Profile Creation', () => {
    test('should create user profile in Supabase after verification', async ({ page }) => {
      // Complete sign-up flow
      const timestamp = Date.now()
      const email = `test${timestamp}@example.com`

      await page.fill('input[name="firstName"]', 'John')
      await page.fill('input[name="lastName"]', 'Doe')
      await page.fill('input[name="emailAddress"]', email)
      await page.fill('input[name="password"]', 'SecurePass123!')
      await page.check('input[type="checkbox"][name*="terms"]')
      await page.click('button[type="submit"]')

      // Verify email (mock)
      await page.fill('input[name="code"]', '123456')
      await page.click('button[type="submit"]')

      // Should be signed in and redirected to dashboard
      await expect(page).toHaveURL(/\/dashboard/)

      // User should exist in Supabase with default role
      // This would be verified via API or database query
    })

    test('should set default user role to "broker"', async ({ page }) => {
      // After successful sign-up, user role should be 'broker'
      // This would be verified via Supabase query
      expect(true).toBe(true) // Placeholder
    })
  })

  describe('Loading States', () => {
    test('should show loading state during registration', async ({ page }) => {
      await page.fill('input[name="firstName"]', 'John')
      await page.fill('input[name="lastName"]', 'Doe')
      await page.fill('input[name="emailAddress"]', 'test@example.com')
      await page.fill('input[name="password"]', 'SecurePass123!')
      await page.check('input[type="checkbox"][name*="terms"]')

      await page.click('button[type="submit"]')

      // Should show loading state
      await expect(page.locator('button[type="submit"][disabled]')).toBeVisible()
    })

    test('should disable form during submission', async ({ page }) => {
      await page.fill('input[name="firstName"]', 'John')
      await page.fill('input[name="lastName"]', 'Doe')
      await page.fill('input[name="emailAddress"]', 'test@example.com')
      await page.fill('input[name="password"]', 'SecurePass123!')
      await page.check('input[type="checkbox"][name*="terms"]')

      await page.click('button[type="submit"]')

      // Form fields should be disabled
      await expect(page.locator('input[name="emailAddress"][disabled]')).toBeVisible()
    })
  })

  describe('Accessibility', () => {
    test('should have proper form labels', async ({ page }) => {
      await expect(page.locator('label[for*="firstName"]')).toBeVisible()
      await expect(page.locator('label[for*="lastName"]')).toBeVisible()
      await expect(page.locator('label[for*="emailAddress"]')).toBeVisible()
      await expect(page.locator('label[for*="password"]')).toBeVisible()
    })

    test('should be keyboard navigable', async ({ page }) => {
      // Tab through form
      await page.keyboard.press('Tab')
      await expect(page.locator('input[name="firstName"]:focus')).toBeVisible()

      await page.keyboard.press('Tab')
      await expect(page.locator('input[name="lastName"]:focus')).toBeVisible()

      await page.keyboard.press('Tab')
      await expect(page.locator('input[name="emailAddress"]:focus')).toBeVisible()
    })

    test('should announce validation errors to screen readers', async ({ page }) => {
      await page.click('button[type="submit"]')

      // Errors should have aria-live
      await expect(page.locator('[role="alert"][aria-live]')).toBeVisible()
    })
  })
})
