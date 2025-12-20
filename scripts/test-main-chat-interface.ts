/**
 * Test Main Chat Interface with Sidebar
 *
 * This script will:
 * 1. Open browser for manual Google login via Clerk
 * 2. Save auth state for future tests
 * 3. Test the main chat interface with Flight Request sidebar
 * 4. Capture screenshots to the screenshots/ directory
 *
 * Run: npx tsx scripts/test-main-chat-interface.ts
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const AUTH_FILE = '.playwright-auth.json'
const SCREENSHOTS_DIR = 'screenshots'

async function ensureScreenshotsDir() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  }
}

async function saveScreenshot(page: Page, name: string) {
  const filepath = path.join(SCREENSHOTS_DIR, `${name}.png`)
  await page.screenshot({ path: filepath, fullPage: true })
  console.log(`📸 Screenshot saved: ${filepath}`)
}

async function waitForManualLogin(page: Page): Promise<boolean> {
  console.log('\n' + '='.repeat(60))
  console.log('🔐 MANUAL LOGIN REQUIRED')
  console.log('='.repeat(60))
  console.log('\nPlease complete the following steps in the browser:')
  console.log('1. Click "Continue with Google"')
  console.log('2. Select your Google account (kinglerbercy@gmail.com)')
  console.log('3. Complete Google authentication')
  console.log('4. Wait for the main chat interface to load')
  console.log('\n⏳ Waiting up to 120 seconds for login...\n')

  // Wait for the main page to load (user avatar or sidebar indicates logged in)
  try {
    await page.waitForSelector('[class*="cl-userButton"], [class*="UserButton"], .cl-userButtonTrigger', {
      timeout: 120000,
    })
    console.log('✅ Login detected!')
    return true
  } catch {
    console.log('❌ Login timeout - please try again')
    return false
  }
}

async function testMainChatInterface() {
  console.log('🧪 Testing Main Chat Interface with Sidebar\n')
  console.log('='.repeat(60))

  await ensureScreenshotsDir()

  // Check if server is running
  console.log('📡 Checking server status...')
  try {
    const response = await fetch('http://localhost:3000/api/chat')
    const data = await response.json()
    console.log(`   Server: ${data.status === 'ok' ? '✅ Running' : '❌ Not ready'}`)
    console.log(`   Model: ${data.model || 'Not configured'}`)
  } catch {
    console.error('❌ Server not running. Start with: npm run dev')
    process.exit(1)
  }

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
  })

  let context: BrowserContext
  let needsLogin = true

  // Try to reuse existing auth state
  if (fs.existsSync(AUTH_FILE)) {
    console.log('\n📂 Found existing auth state, attempting to reuse...')
    context = await browser.newContext({
      viewport: { width: 1400, height: 900 },
      storageState: AUTH_FILE,
    })
    const page = await context.newPage()
    await page.goto('http://localhost:3000', { timeout: 30000 })
    await page.waitForTimeout(3000)

    // Check if we're actually logged in
    const userButton = await page.locator('[class*="cl-userButton"], [class*="UserButton"], .cl-userButtonTrigger').count()
    if (userButton > 0) {
      console.log('✅ Auth state valid - skipping login')
      needsLogin = false
    } else {
      console.log('⚠️ Auth state expired - need fresh login')
      await page.close()
      await context.close()
    }
  }

  if (needsLogin) {
    // Fresh context for login
    context = await browser.newContext({
      viewport: { width: 1400, height: 900 },
    })
    const page = await context.newPage()

    console.log('\n📍 Opening http://localhost:3000...')
    await page.goto('http://localhost:3000', { timeout: 30000 })
    await page.waitForTimeout(2000)

    // Take screenshot of login page
    await saveScreenshot(page, '00-login-page')

    // Wait for manual login
    const loggedIn = await waitForManualLogin(page)

    if (!loggedIn) {
      await browser.close()
      return
    }

    // Save auth state for future use
    console.log('\n💾 Saving auth state...')
    await context.storageState({ path: AUTH_FILE })
    console.log(`   Saved to: ${AUTH_FILE}`)
  }

  // Now run the actual tests
  const page = context!.pages()[0] || await context!.newPage()

  try {
    // Ensure we're on the main page
    if (!page.url().includes('localhost:3000')) {
      await page.goto('http://localhost:3000', { timeout: 30000 })
    }
    await page.waitForTimeout(2000)

    // Screenshot 1: Main interface with sidebar
    console.log('\n📷 Capturing main interface screenshots...\n')
    await saveScreenshot(page, '01-main-interface-with-sidebar')

    // Check for sidebar with flight requests
    const sidebar = page.locator('text=Open Chats')
    if (await sidebar.isVisible()) {
      console.log('✅ Sidebar visible with "Open Chats"')
    }

    // Check for flight request cards
    const flightCards = page.locator('text=Flight Request #')
    const cardCount = await flightCards.count()
    console.log(`✅ Found ${cardCount} flight request card(s) in sidebar`)

    // Screenshot 2: Click on first flight request if exists
    if (cardCount > 0) {
      const firstCard = flightCards.first()
      await firstCard.click()
      await page.waitForTimeout(1000)
      await saveScreenshot(page, '02-flight-request-selected')
      console.log('✅ Selected first flight request')
    }

    // Screenshot 3: Landing page / New chat
    const newButton = page.locator('button:has-text("New")')
    if (await newButton.isVisible()) {
      await newButton.click()
      await page.waitForTimeout(1000)
      await saveScreenshot(page, '03-landing-page')
      console.log('✅ Opened new chat / landing page')
    }

    // Screenshot 4: Type a message in the landing page input
    const landingInput = page.locator('textarea, input[placeholder*="flight"], input[placeholder*="message"]').first()
    if (await landingInput.isVisible()) {
      const testMessage = 'I need a private jet from NYC to Miami for 4 passengers this Friday'
      await landingInput.fill(testMessage)
      await saveScreenshot(page, '04-message-typed')
      console.log('✅ Typed test message')

      // Submit the message
      const submitButton = page.locator('button[type="submit"], button:has(svg):near(textarea)').first()
      if (await submitButton.isVisible()) {
        await submitButton.click()
        await page.waitForTimeout(500)
        await saveScreenshot(page, '05-thinking-state')
        console.log('✅ Message submitted - capturing thinking state')

        // Wait for streaming response
        console.log('\n⏳ Waiting for GPT-5.2 streaming response...')
        for (let i = 1; i <= 5; i++) {
          await page.waitForTimeout(2000)
          await saveScreenshot(page, `06-streaming-${i}`)
        }

        // Final response
        await page.waitForTimeout(5000)
        await saveScreenshot(page, '07-response-complete')
        console.log('✅ Response complete')
      }
    }

    // Screenshot 8: Show sidebar with updated status
    await saveScreenshot(page, '08-final-state-with-sidebar')

    console.log('\n' + '='.repeat(60))
    console.log('✅ TEST COMPLETE!')
    console.log('='.repeat(60))
    console.log(`\n📁 Screenshots saved to: ${SCREENSHOTS_DIR}/`)
    console.log('   - 00-login-page.png')
    console.log('   - 01-main-interface-with-sidebar.png')
    console.log('   - 02-flight-request-selected.png')
    console.log('   - 03-landing-page.png')
    console.log('   - 04-message-typed.png')
    console.log('   - 05-thinking-state.png')
    console.log('   - 06-streaming-*.png')
    console.log('   - 07-response-complete.png')
    console.log('   - 08-final-state-with-sidebar.png')

    console.log('\n⏳ Keeping browser open for 10 seconds...')
    await page.waitForTimeout(10000)

  } catch (error) {
    console.error('\n❌ Test error:', error)
    await saveScreenshot(page, 'error-state')
  } finally {
    await browser.close()
    console.log('\n🔒 Browser closed')
  }
}

testMainChatInterface().catch(console.error)
