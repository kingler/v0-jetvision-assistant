/**
 * Save Authentication State for Playwright Tests
 *
 * This script opens a browser for you to sign in manually,
 * then saves the auth state for reuse in automated tests.
 *
 * Run: npx tsx scripts/save-auth-state.ts
 * Then: npx tsx scripts/test-gpt52-with-auth.ts
 */

import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const AUTH_FILE = '.playwright-auth.json'

async function saveAuthState() {
  console.log('🔐 Authentication State Setup\n')

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
  })

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  })

  const page = await context.newPage()

  try {
    console.log('📍 Opening http://localhost:3000...')
    await page.goto('http://localhost:3000', { timeout: 30000 })

    // Check if already authenticated
    const hasTextarea = await page.locator('textarea').count() > 0

    if (hasTextarea) {
      console.log('✅ Already authenticated!')
    } else {
      console.log('\n👉 Please sign in using the browser window.')
      console.log('   (Waiting up to 5 minutes for you to complete sign-in)\n')

      // Wait for textarea to appear (sign of successful auth)
      await page.waitForSelector('textarea', { timeout: 300000 })
      console.log('\n✅ Authentication successful!')
    }

    // Save the authentication state
    await context.storageState({ path: AUTH_FILE })
    console.log(`\n💾 Auth state saved to: ${AUTH_FILE}`)
    console.log('   You can now run: npx tsx scripts/test-gpt52-with-auth.ts\n')

    // Show the chat interface briefly
    await page.waitForTimeout(3000)

  } catch (error) {
    console.error('\n❌ Error:', error)
  } finally {
    await browser.close()
  }
}

saveAuthState().catch(console.error)
