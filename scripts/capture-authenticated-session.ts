/**
 * Capture Authenticated Session
 *
 * Opens a new Chromium browser (not your main Chrome) where you can
 * login manually, then captures the authenticated interface.
 *
 * Usage: npx tsx scripts/capture-authenticated-session.ts
 */

import { chromium } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

const REPORTS_DIR = 'reports/ux-analysis'
const AUTH_FILE = '.auth/user.json'

async function captureAuthenticatedSession() {
  console.log('\n🔐 Capture Authenticated Chat Interface\n')

  // Ensure directories exist
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true })
  }
  if (!fs.existsSync('.auth')) {
    fs.mkdirSync('.auth', { recursive: true })
  }

  // Launch a fresh browser (not using your Chrome profile)
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
    ],
  })

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  })

  // Remove webdriver detection
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false })
  })

  const page = await context.newPage()

  console.log('📍 Opening http://localhost:3000...\n')
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)

  const currentUrl = page.url()

  if (currentUrl.includes('sign-in')) {
    console.log('=' .repeat(60))
    console.log('LOGIN REQUIRED')
    console.log('=' .repeat(60))
    console.log('')
    console.log('Please login in the browser window.')
    console.log('')
    console.log('⚠️  IMPORTANT: Use EMAIL/PASSWORD login, not Google OAuth!')
    console.log('   Google blocks automated browsers.')
    console.log('')
    console.log('   If you only have Google OAuth configured:')
    console.log('   1. Go to Clerk Dashboard')
    console.log('   2. Enable email/password authentication')
    console.log('   3. Create a test user')
    console.log('')
    console.log('Press Enter when you see the main chat interface...')
    console.log('=' .repeat(60))

    await new Promise<void>((resolve) => {
      process.stdin.once('data', () => resolve())
    })
  }

  // Verify authentication
  await page.waitForTimeout(1000)
  const newUrl = page.url()

  if (newUrl.includes('sign-in')) {
    console.log('\n❌ Still on sign-in page. Please complete authentication.')
    await browser.close()
    process.exit(1)
  }

  console.log('\n✅ Authenticated! Capturing screenshots...\n')

  // Save auth state for future use
  await context.storageState({ path: AUTH_FILE })
  console.log(`💾 Auth state saved to ${AUTH_FILE}`)

  // 1. Landing page
  await page.screenshot({
    path: path.join(REPORTS_DIR, 'auth-01-landing-page.png'),
    fullPage: true,
  })
  console.log('📸 Landing page captured')

  // 2. Check for sidebar
  await page.waitForTimeout(500)
  await page.screenshot({
    path: path.join(REPORTS_DIR, 'auth-02-full-interface.png'),
    fullPage: true,
  })
  console.log('📸 Full interface captured')

  // 3. Try chat input
  const chatInput = page.locator('input[placeholder*="message"], textarea, input[placeholder*="Type"]').first()
  if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await chatInput.click()
    await chatInput.fill('I need a private jet from New York to Miami for 4 passengers next Friday')

    await page.screenshot({
      path: path.join(REPORTS_DIR, 'auth-03-message-typed.png'),
      fullPage: true,
    })
    console.log('📸 Message input captured')

    // Find send button
    const sendButton = page.locator('button[type="submit"], button svg, button:has-text("Send")').first()
    if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('\n🚀 Sending message...')
      await sendButton.click()

      // Wait for streaming response
      await page.waitForTimeout(3000)
      await page.screenshot({
        path: path.join(REPORTS_DIR, 'auth-04-response-streaming.png'),
        fullPage: true,
      })
      console.log('📸 Streaming response captured')

      // Wait for full response
      await page.waitForTimeout(7000)
      await page.screenshot({
        path: path.join(REPORTS_DIR, 'auth-05-response-complete.png'),
        fullPage: true,
      })
      console.log('📸 Complete response captured')
    }
  }

  // 4. Click on a quick action if available
  const quickAction = page.locator('button, div[role="button"]').filter({ hasText: /book.*flight|new client|help/i }).first()
  if (await quickAction.isVisible({ timeout: 2000 }).catch(() => false)) {
    await quickAction.click()
    await page.waitForTimeout(2000)
    await page.screenshot({
      path: path.join(REPORTS_DIR, 'auth-06-quick-action.png'),
      fullPage: true,
    })
    console.log('📸 Quick action captured')
  }

  // 5. Responsive views
  console.log('\n📱 Capturing responsive views...')

  await page.setViewportSize({ width: 768, height: 1024 })
  await page.waitForTimeout(500)
  await page.screenshot({
    path: path.join(REPORTS_DIR, 'auth-responsive-tablet.png'),
    fullPage: true,
  })
  console.log('📸 Tablet view captured')

  await page.setViewportSize({ width: 375, height: 812 })
  await page.waitForTimeout(500)
  await page.screenshot({
    path: path.join(REPORTS_DIR, 'auth-responsive-mobile.png'),
    fullPage: true,
  })
  console.log('📸 Mobile view captured')

  console.log('\n✅ All screenshots saved to reports/ux-analysis/')
  console.log('\nPress Enter to close the browser...')

  await new Promise<void>((resolve) => {
    process.stdin.once('data', () => resolve())
  })

  await browser.close()
}

captureAuthenticatedSession().catch(console.error)
