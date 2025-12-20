/**
 * E2E Test: Authenticated Chat Interface
 *
 * Tests the real chat interface after manual authentication.
 * Uses stored auth state from .auth/user.json
 */

import { test, expect } from '@playwright/test'
import { setupClerkTestingToken } from '@clerk/testing/playwright'
import * as fs from 'fs'
import * as path from 'path'

const AUTH_FILE = path.join(process.cwd(), '.auth', 'user.json')

test.describe('Authenticated Chat Interface', () => {
  // Use stored auth state if available
  test.use({
    storageState: fs.existsSync(AUTH_FILE) ? AUTH_FILE : undefined,
  })

  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page })
  })

  test('Capture authenticated landing page', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Wait for either redirect to sign-in OR main content to load
    await page.waitForTimeout(3000)

    const url = page.url()
    console.log(`Current URL: ${url}`)

    // Take screenshot regardless of auth state
    await page.screenshot({
      path: 'reports/ux-analysis/main-page-current.png',
      fullPage: true,
    })

    if (url.includes('sign-in')) {
      console.log('Not authenticated - redirected to sign-in')
      return
    }

    // Wait for the main interface to load
    await page.waitForSelector('header', { timeout: 10000 })

    // Take screenshots of the authenticated interface
    await page.screenshot({
      path: 'reports/ux-analysis/authenticated-landing.png',
      fullPage: true,
    })

    console.log('✅ Authenticated landing page captured')
  })

  test('Test chat input and quick actions', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    if (page.url().includes('sign-in')) {
      console.log('Not authenticated - skipping')
      return
    }

    // Look for chat input
    const chatInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first()

    if (await chatInput.isVisible({ timeout: 5000 })) {
      await page.screenshot({
        path: 'reports/ux-analysis/chat-input-visible.png',
        fullPage: true,
      })

      // Type a test message
      await chatInput.fill('I need a private jet from New York to Miami')

      await page.screenshot({
        path: 'reports/ux-analysis/chat-message-typed.png',
        fullPage: true,
      })

      console.log('✅ Chat input tested')
    }

    // Look for quick action buttons
    const quickActions = page.locator('button, a').filter({ hasText: /book|flight|jet|client/i })
    const actionCount = await quickActions.count()

    if (actionCount > 0) {
      console.log(`Found ${actionCount} quick action buttons`)

      await page.screenshot({
        path: 'reports/ux-analysis/quick-actions-visible.png',
        fullPage: true,
      })
    }
  })

  test('Test sidebar and chat history', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    if (page.url().includes('sign-in')) {
      console.log('Not authenticated - skipping')
      return
    }

    // Look for sidebar
    const sidebar = page.locator('[class*="sidebar"], aside, nav').first()

    if (await sidebar.isVisible({ timeout: 5000 })) {
      await page.screenshot({
        path: 'reports/ux-analysis/sidebar-visible.png',
        fullPage: true,
      })
      console.log('✅ Sidebar visible')
    }

    // Look for Open Chats or flight requests
    const chatList = page.locator('text=Open Chats, text=Flight Request, text=Request')
    if (await chatList.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('✅ Chat/Request list visible')
    }
  })

  test('Capture responsive views', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    if (page.url().includes('sign-in')) {
      console.log('Not authenticated - skipping')
      return
    }

    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(500)
    await page.screenshot({
      path: 'reports/ux-analysis/authenticated-desktop.png',
      fullPage: true,
    })

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(500)
    await page.screenshot({
      path: 'reports/ux-analysis/authenticated-tablet.png',
      fullPage: true,
    })

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)
    await page.screenshot({
      path: 'reports/ux-analysis/authenticated-mobile.png',
      fullPage: true,
    })

    console.log('✅ Responsive screenshots captured')
  })
})
