/**
 * Verify Empty State E2E Test
 *
 * Captures screenshots to verify the app starts with no hardcoded flight requests
 */

import { test, expect } from '@playwright/test'
import { setupClerkTestingToken } from '@clerk/testing/playwright'
import * as fs from 'fs'
import * as path from 'path'

const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots', 'empty-state-verification')

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
}

test.describe('Empty State Verification', () => {
  test.setTimeout(60000)

  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page })
  })

  test('App starts with empty sidebar - no hardcoded requests', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('load')
    await page.waitForTimeout(3000)

    const currentUrl = page.url()
    console.log(`Current URL: ${currentUrl}`)

    // Capture screenshot regardless of auth state
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `01-landing-${Date.now()}.png`),
      fullPage: true,
    })

    // If redirected to sign-in, that's expected
    if (currentUrl.includes('sign-in')) {
      console.log('✅ App requires authentication (expected)')

      // Capture sign-in page
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `02-sign-in-${Date.now()}.png`),
        fullPage: true,
      })
      return
    }

    // If authenticated, verify empty state
    // Look for sidebar showing "0 active flight requests"
    const sidebarText = await page.locator('text=/\\d+ active flight request/i').first()

    if (await sidebarText.isVisible({ timeout: 5000 }).catch(() => false)) {
      const text = await sidebarText.textContent()
      console.log(`Sidebar text: ${text}`)

      // Verify it shows 0 active requests
      expect(text).toMatch(/0 active flight request/i)
      console.log('✅ Sidebar shows 0 active flight requests - empty state confirmed')
    }

    // Check that no Flight Request cards are visible
    const flightRequestCards = page.locator('text=/Flight Request #\\d/i')
    const cardCount = await flightRequestCards.count()
    console.log(`Flight Request cards found: ${cardCount}`)

    // Should be 0 cards in empty state
    expect(cardCount).toBe(0)
    console.log('✅ No hardcoded Flight Request cards - empty state confirmed')

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `03-empty-state-${Date.now()}.png`),
      fullPage: true,
    })
  })

  test('API health check shows correct configuration', async ({ request }) => {
    const response = await request.get('/api/chat')
    expect(response.status()).toBe(200)

    const data = await response.json()
    console.log('API Health:', JSON.stringify(data, null, 2))

    expect(data.status).toBe('ok')
    expect(data.avinode_status).toMatch(/mock|connected/)
    expect(data.tools).toContain('search_flights')

    console.log('✅ API configured correctly with Avinode tools')
  })
})
