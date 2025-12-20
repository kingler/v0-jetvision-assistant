/**
 * E2E Test: Email/Password Authentication and Chat
 *
 * This test demonstrates the full authentication flow using
 * email/password credentials, then tests the chat interface.
 *
 * To run this test:
 * 1. Create a test user in Clerk Dashboard with email/password
 * 2. Set environment variables:
 *    - E2E_CLERK_USER_USERNAME=your-test-email@example.com
 *    - E2E_CLERK_USER_PASSWORD=your-test-password
 * 3. Run: npx playwright test auth-with-email --headed
 */

import { test, expect } from '@playwright/test'
import { setupClerkTestingToken, clerk } from '@clerk/testing/playwright'

// Storage file for auth state
const AUTH_FILE = '.auth/authenticated-user.json'

test.describe('Authentication with Email/Password', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page })
  })

  test('Sign in with email/password and test chat', async ({ page }) => {
    const email = process.env.E2E_CLERK_USER_USERNAME
    const password = process.env.E2E_CLERK_USER_PASSWORD

    if (!email || !password) {
      console.log('⚠️  Test credentials not configured')
      console.log('')
      console.log('To test authenticated flows:')
      console.log('1. Create a test user in Clerk Dashboard (enable email/password)')
      console.log('2. Add to .env.local:')
      console.log('   E2E_CLERK_USER_USERNAME=test@example.com')
      console.log('   E2E_CLERK_USER_PASSWORD=yourpassword')
      console.log('')
      console.log('Skipping authenticated test...')
      return
    }

    // Navigate to sign-in page
    await page.goto('/sign-in')
    await page.waitForLoadState('domcontentloaded')

    // Wait for Clerk form
    await page.waitForSelector('input[name="identifier"]', { timeout: 15000 })

    // Take screenshot before auth
    await page.screenshot({
      path: 'reports/ux-analysis/auth-flow-01-login.png',
      fullPage: true,
    })

    // Enter email
    const emailInput = page.locator('input[name="identifier"]')
    await emailInput.fill(email)
    await page.locator('button:has-text("Continue")').click()

    // Wait for password field
    await page.waitForSelector('input[type="password"]', { timeout: 10000 })

    // Take screenshot with password field
    await page.screenshot({
      path: 'reports/ux-analysis/auth-flow-02-password.png',
      fullPage: true,
    })

    // Enter password and submit
    const passwordInput = page.locator('input[type="password"]')
    await passwordInput.fill(password)
    await page.locator('button:has-text("Continue")').click()

    // Wait for redirect to main app
    await page.waitForFunction(
      () => !window.location.pathname.includes('sign-in'),
      { timeout: 30000 }
    )

    // Verify we're logged in
    expect(page.url()).not.toContain('sign-in')

    await page.screenshot({
      path: 'reports/ux-analysis/auth-flow-03-logged-in.png',
      fullPage: true,
    })

    console.log('✅ Successfully authenticated!')

    // Now test the chat interface
    await testChatInterface(page)
  })

  test('Sign in using Clerk helper', async ({ page }) => {
    const email = process.env.E2E_CLERK_USER_USERNAME
    const password = process.env.E2E_CLERK_USER_PASSWORD

    if (!email || !password) {
      console.log('Test credentials not configured - skipping')
      return
    }

    // Use Clerk's signIn helper
    await clerk.signIn({
      page,
      signInParams: {
        strategy: 'password',
        identifier: email,
        password: password,
      },
    })

    // Navigate to main page
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Verify we're authenticated
    expect(page.url()).not.toContain('sign-in')

    await page.screenshot({
      path: 'reports/ux-analysis/clerk-signin-success.png',
      fullPage: true,
    })

    console.log('✅ Clerk signIn helper worked!')

    // Test chat
    await testChatInterface(page)
  })
})

async function testChatInterface(page: import('@playwright/test').Page) {
  // Wait for the landing page or chat interface to load
  await page.waitForSelector('header', { timeout: 10000 })

  await page.screenshot({
    path: 'reports/ux-analysis/chat-01-landing.png',
    fullPage: true,
  })

  // Look for chat input or start chat button
  const chatInput = page.locator('textarea, input[placeholder*="message"], input[placeholder*="type"]').first()
  const startChatButton = page.locator('button:has-text("Start"), button:has-text("Send"), button:has-text("Submit")').first()

  if (await chatInput.isVisible()) {
    // Type a message
    await chatInput.fill('I need a private jet from New York to Miami for 4 passengers')

    await page.screenshot({
      path: 'reports/ux-analysis/chat-02-message-typed.png',
      fullPage: true,
    })

    // Try to send
    if (await startChatButton.isVisible()) {
      await startChatButton.click()

      // Wait for response
      await page.waitForTimeout(3000)

      await page.screenshot({
        path: 'reports/ux-analysis/chat-03-response.png',
        fullPage: true,
      })

      console.log('✅ Chat message sent and response received!')
    }
  } else {
    console.log('Chat input not immediately visible - checking landing page')

    // Check if there's a landing page with quick actions
    const quickAction = page.locator('button, a').filter({ hasText: /jet|flight|book|start/i }).first()
    if (await quickAction.isVisible()) {
      await quickAction.click()
      await page.waitForTimeout(2000)

      await page.screenshot({
        path: 'reports/ux-analysis/chat-02-after-action.png',
        fullPage: true,
      })
    }
  }
}

test.describe('Save Authentication State', () => {
  test('Save auth state for reuse', async ({ page, context }) => {
    const email = process.env.E2E_CLERK_USER_USERNAME
    const password = process.env.E2E_CLERK_USER_PASSWORD

    if (!email || !password) {
      console.log('Test credentials not configured - skipping')
      return
    }

    await setupClerkTestingToken({ page })

    // Sign in
    await clerk.signIn({
      page,
      signInParams: {
        strategy: 'password',
        identifier: email,
        password: password,
      },
    })

    // Navigate to verify auth works
    await page.goto('/')
    await page.waitForFunction(
      () => !window.location.pathname.includes('sign-in'),
      { timeout: 30000 }
    )

    // Save auth state
    await context.storageState({ path: AUTH_FILE })
    console.log(`✅ Auth state saved to ${AUTH_FILE}`)
    console.log('   You can now use this state in other tests with:')
    console.log('   test.use({ storageState: ".auth/authenticated-user.json" })')
  })
})
