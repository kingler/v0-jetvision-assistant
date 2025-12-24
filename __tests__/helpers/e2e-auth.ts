/**
 * E2E Authentication Helper Functions
 *
 * Reusable utilities for handling authentication in Playwright E2E tests.
 * Provides functions for Clerk token setup and email/password authentication.
 */

import { Page } from '@playwright/test'
import { setupClerkTestingToken } from '@clerk/testing/playwright'

/**
 * Setup Clerk testing token for a page
 * This bypasses bot detection and enables testing with Clerk authentication
 *
 * @param page - Playwright page instance
 */
export async function setupClerkAuth(page: Page): Promise<void> {
  await setupClerkTestingToken({ page })
}

/**
 * Authenticate with email/password credentials if available
 * Falls back gracefully if credentials are not provided
 *
 * @param page - Playwright page instance
 * @param options - Authentication options
 * @returns true if authentication was successful or not needed, false otherwise
 */
export async function authenticateWithCredentials(
  page: Page,
  options?: {
    username?: string
    password?: string
    throwOnMissing?: boolean
  }
): Promise<boolean> {
  const username = options?.username || process.env.E2E_CLERK_USER_USERNAME
  const password = options?.password || process.env.E2E_CLERK_USER_PASSWORD
  const throwOnMissing = options?.throwOnMissing ?? false

  // Check if we're already authenticated (not on sign-in page)
  const currentUrl = page.url()
  if (!currentUrl.includes('sign-in') && !currentUrl.includes('accounts.google.com')) {
    return true
  }

  // If no credentials provided, return false or throw based on options
  if (!username || !password) {
    if (throwOnMissing) {
      throw new Error(
        'Test requires E2E_CLERK_USER_USERNAME and E2E_CLERK_USER_PASSWORD environment variables. ' +
        'Cannot proceed with authentication without test credentials.'
      )
    }
    return false
  }

  // Wait for sign-in page to fully load
  await page.waitForLoadState('networkidle')

  // Look for email input
  const emailInput = page.locator('input[name="identifier"]').first()

  if (!(await emailInput.isVisible({ timeout: 5000 }).catch(() => false))) {
    if (throwOnMissing) {
      throw new Error(
        'Email/password login form not found on sign-in page. ' +
        'Application appears to use OAuth-only authentication, which cannot be automated in this test.'
      )
    }
    return false
  }

  // Fill email and continue
  await emailInput.fill(username)
  await page.locator('button:has-text("Continue")').click()

  // Wait for password field
  await page.waitForSelector('input[type="password"]', { timeout: 10000 })
  const passwordInput = page.locator('input[type="password"]').first()
  await passwordInput.fill(password)
  await page.locator('button:has-text("Continue")').click()

  // Wait for redirect to main app
  await page.waitForFunction(
    () => !window.location.pathname.includes('sign-in'),
    { timeout: 30000 }
  )

  return true
}

/**
 * Navigate to the main page and wait for it to load
 * Handles both authenticated and unauthenticated states
 *
 * @param page - Playwright page instance
 * @returns true if navigation was successful, false if redirected to sign-in
 */
export async function navigateToMainPage(page: Page): Promise<boolean> {
  await page.goto('/', { waitUntil: 'networkidle' })

  // Wait for navigation to complete (either main page or sign-in page)
  await Promise.race([
    page.waitForURL('**/', { timeout: 5000 }).catch(() => null),
    page.waitForURL('**/sign-in**', { timeout: 5000 }).catch(() => null),
    page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => null)
  ])

  const currentUrl = page.url()
  const isAuthenticated = !currentUrl.includes('sign-in') && !currentUrl.includes('accounts.google.com')

  return isAuthenticated
}

/**
 * Wait for the main page content to be visible
 * Useful after navigation to ensure page is fully rendered
 *
 * @param page - Playwright page instance
 */
export async function waitForMainPageContent(page: Page): Promise<void> {
  await Promise.race([
    page.waitForSelector('button:has-text("Settings")', { state: 'visible', timeout: 5000 }).catch(() => null),
    page.waitForSelector('header', { state: 'visible', timeout: 5000 }).catch(() => null),
    page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => null)
  ])
}

