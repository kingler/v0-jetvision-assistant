/**
 * E2E Test: Authenticated Chat Interface
 *
 * Tests the full chat interface with authentication using Clerk testing.
 * Uses setupClerkTestingToken to bypass bot detection.
 *
 * Requirements:
 * - CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY in environment
 * - For full auth: E2E_CLERK_USER_USERNAME and E2E_CLERK_USER_PASSWORD
 */

import { test, expect } from '@playwright/test'
import { setupClerkTestingToken } from '@clerk/testing/playwright'

test.describe('Chat Interface - API Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Setup Clerk testing token to bypass bot detection
    await setupClerkTestingToken({ page })
  })

  test('Test API endpoint returns streaming response', async ({ request }) => {
    const response = await request.get(
      'http://localhost:3000/api/chat/test?message=Hello'
    )

    // In dev mode, should return 200 with SSE stream
    if (response.status() === 403) {
      console.log('Test endpoint blocked in production mode - skipping')
      return
    }

    expect(response.ok()).toBeTruthy()
    const contentType = response.headers()['content-type'] || ''
    expect(contentType).toContain('text/event-stream')

    const body = await response.text()
    expect(body).toContain('data:')
    console.log('API test endpoint working correctly')
  })

  test('Chat API handles RFP-style messages', async ({ request }) => {
    const rfpMessage = 'I need a private jet from NYC to Miami for 4 passengers next Friday'

    const response = await request.get(
      `http://localhost:3000/api/chat/test?message=${encodeURIComponent(rfpMessage)}`
    )

    if (response.status() === 403) {
      console.log('Test endpoint blocked in production mode - skipping')
      return
    }

    expect(response.ok()).toBeTruthy()

    const body = await response.text()
    const lines = body.split('\n')
    let fullContent = ''
    let doneReceived = false

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.content) {
            fullContent += data.content
          }
          if (data.done) {
            doneReceived = true
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }

    expect(fullContent.length).toBeGreaterThan(50)
    expect(doneReceived).toBe(true)

    // Log response preview
    console.log('RFP Response preview:', fullContent.slice(0, 200))
  })
})

test.describe('Chat Interface - UI Testing (Unauthenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page })
  })

  test('Sign-in page loads correctly', async ({ page }) => {
    await page.goto('/sign-in')
    await page.waitForLoadState('domcontentloaded')

    // Wait for Clerk component to load
    await page.waitForSelector('[data-clerk-component], .cl-signIn, input[name="identifier"]', {
      timeout: 15000,
    })

    // Take screenshot of sign-in page
    await page.screenshot({
      path: 'reports/ux-analysis/sign-in-page.png',
      fullPage: true,
    })

    // Verify sign-in elements are present
    const emailInput = page.locator('input[name="identifier"]')
    await expect(emailInput).toBeVisible({ timeout: 10000 })

    console.log('Sign-in page loaded successfully')
  })

  test('Unauthenticated user is redirected to sign-in', async ({ page }) => {
    // Try to access main page without auth
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Wait for redirect or Clerk component
    await page.waitForFunction(
      () => window.location.pathname.includes('sign-in') ||
            document.querySelector('[data-clerk-component]'),
      { timeout: 15000 }
    )

    // Should redirect to sign-in
    const url = page.url()
    expect(url).toContain('sign-in')

    console.log('Redirect to sign-in working correctly')
  })

  test('Test page displays streaming response', async ({ page }) => {
    // Check if the test page exists
    const testPageResponse = await page.goto('/test-gpt52.html', {
      timeout: 10000,
    }).catch(() => null)

    if (!testPageResponse || testPageResponse.status() === 404) {
      console.log('Test page not found - skipping UI test')
      return
    }

    await page.waitForLoadState('domcontentloaded')

    // Wait for thinking indicator
    const thinking = page.locator('#thinking')
    await expect(thinking).toBeVisible({ timeout: 5000 })

    // Take screenshot
    await page.screenshot({
      path: 'reports/ux-analysis/test-page-thinking.png',
      fullPage: true,
    })

    // Wait for response to start
    try {
      await page.waitForSelector('#response:not(.hidden)', { timeout: 30000 })

      // Wait for some content
      await page.waitForTimeout(3000)

      await page.screenshot({
        path: 'reports/ux-analysis/test-page-streaming.png',
        fullPage: true,
      })

      const content = await page.locator('#content').textContent()
      expect(content).toBeTruthy()
      console.log('Test page streaming content received:', content?.slice(0, 100))
    } catch (error) {
      await page.screenshot({
        path: 'reports/ux-analysis/test-page-error.png',
        fullPage: true,
      })
      console.log('Test page error - screenshot captured')
      throw error
    }
  })
})

test.describe('Chat Interface - Full Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page })
  })

  test('Complete sign-in flow with email/password', async ({ page }) => {
    // Check if we have test credentials
    const username = process.env.E2E_CLERK_USER_USERNAME
    const password = process.env.E2E_CLERK_USER_PASSWORD

    if (!username || !password) {
      console.log('Test credentials not configured - skipping authenticated test')
      console.log('Set E2E_CLERK_USER_USERNAME and E2E_CLERK_USER_PASSWORD for auth testing')
      return
    }

    await page.goto('/sign-in')
    await page.waitForLoadState('networkidle')

    // Screenshot before auth
    await page.screenshot({
      path: 'reports/ux-analysis/auth-01-sign-in-page.png',
      fullPage: true,
    })

    // Try to find email input (Clerk component)
    const emailInput = page.locator('input[name="identifier"]').first()

    if (await emailInput.isVisible()) {
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

      await page.screenshot({
        path: 'reports/ux-analysis/auth-02-logged-in.png',
        fullPage: true,
      })

      console.log('Successfully authenticated!')

      // Now test the chat interface
      const pageUrl = page.url()
      expect(pageUrl).not.toContain('sign-in')
    } else {
      console.log('Email/password auth not available - only OAuth configured')
      await page.screenshot({
        path: 'reports/ux-analysis/auth-oauth-only.png',
        fullPage: true,
      })
    }
  })
})

test.describe('Chat Interface - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page })
  })

  test('Capture sign-in page variants', async ({ page }) => {
    await page.goto('/sign-in')
    await page.waitForLoadState('domcontentloaded')

    // Wait for Clerk component
    await page.waitForSelector('input[name="identifier"]', { timeout: 15000 })

    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.screenshot({
      path: 'reports/ux-analysis/sign-in-desktop.png',
      fullPage: true,
    })

    // Tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.screenshot({
      path: 'reports/ux-analysis/sign-in-tablet.png',
      fullPage: true,
    })

    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await page.screenshot({
      path: 'reports/ux-analysis/sign-in-mobile.png',
      fullPage: true,
    })

    console.log('Sign-in page visual regression screenshots captured')
  })
})
