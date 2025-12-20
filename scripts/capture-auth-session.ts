/**
 * Capture Authentication Session
 *
 * This script opens a browser where you can login manually,
 * then saves the session for use in Playwright tests.
 *
 * Usage: npx tsx scripts/capture-auth-session.ts
 */

import { chromium } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

const AUTH_FILE = path.join(process.cwd(), '.auth', 'user.json')

async function captureAuthSession() {
  console.log('\n🔐 Authentication Session Capture\n')
  console.log('This will open a browser window where you can login.')
  console.log('After logging in, the session will be saved for Playwright tests.\n')

  // Ensure .auth directory exists
  const authDir = path.dirname(AUTH_FILE)
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }

  // Launch browser with visible window - use regular Chrome profile behavior
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  })

  const context = await browser.newContext({
    // Don't set automation flags
    bypassCSP: true,
  })

  const page = await context.newPage()

  // Remove automation indicators
  await page.addInitScript(() => {
    // Remove webdriver flag
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    })
  })

  console.log('📍 Opening http://localhost:3000...\n')
  await page.goto('http://localhost:3000')

  console.log('=' .repeat(60))
  console.log('INSTRUCTIONS:')
  console.log('=' .repeat(60))
  console.log('')
  console.log('1. Login using the EMAIL option (not Google OAuth)')
  console.log('   - Google OAuth blocks automated browsers')
  console.log('   - Use email/password if you have it configured')
  console.log('')
  console.log('2. If you only have Google OAuth:')
  console.log('   - Login in a SEPARATE regular Chrome window')
  console.log('   - Then come back here and refresh the page')
  console.log('')
  console.log('3. Once you see the main chat interface, press Enter here')
  console.log('')
  console.log('=' .repeat(60))

  // Wait for user to press Enter
  await new Promise<void>((resolve) => {
    process.stdin.once('data', () => resolve())
  })

  // Check if we're authenticated
  const currentUrl = page.url()
  console.log(`\n📍 Current URL: ${currentUrl}`)

  if (currentUrl.includes('sign-in')) {
    console.log('\n⚠️  Still on sign-in page. Please login first and try again.')
    await browser.close()
    process.exit(1)
  }

  // Take a screenshot to verify
  const screenshotPath = 'reports/ux-analysis/authenticated-session-capture.png'
  await page.screenshot({ path: screenshotPath, fullPage: true })
  console.log(`📸 Screenshot saved: ${screenshotPath}`)

  // Save the authentication state
  await context.storageState({ path: AUTH_FILE })
  console.log(`\n✅ Authentication state saved to: ${AUTH_FILE}`)
  console.log('\nYou can now run authenticated tests with:')
  console.log('  npx playwright test --project=chromium')

  await browser.close()
}

captureAuthSession().catch(console.error)
