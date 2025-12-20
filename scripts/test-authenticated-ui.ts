/**
 * Test Authenticated UI
 *
 * Launches Chrome with your existing profile to capture
 * the authenticated chat interface.
 *
 * Usage: npx tsx scripts/test-authenticated-ui.ts
 */

import { chromium } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

const REPORTS_DIR = 'reports/ux-analysis'

async function testAuthenticatedUI() {
  console.log('\n🔐 Testing Authenticated Chat Interface\n')

  // Ensure reports directory exists
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true })
  }

  // Get Chrome profile path based on OS
  const homeDir = os.homedir()
  let chromeProfilePath: string

  if (process.platform === 'darwin') {
    chromeProfilePath = path.join(homeDir, 'Library/Application Support/Google/Chrome')
  } else if (process.platform === 'win32') {
    chromeProfilePath = path.join(homeDir, 'AppData/Local/Google/Chrome/User Data')
  } else {
    chromeProfilePath = path.join(homeDir, '.config/google-chrome')
  }

  console.log(`Using Chrome profile: ${chromeProfilePath}`)

  // Launch Chrome with persistent context (uses existing cookies)
  const context = await chromium.launchPersistentContext(chromeProfilePath, {
    headless: false,
    channel: 'chrome', // Use installed Chrome
    args: [
      '--disable-blink-features=AutomationControlled',
      '--profile-directory=Default',
    ],
    viewport: { width: 1920, height: 1080 },
  })

  const page = context.pages()[0] || await context.newPage()

  try {
    console.log('\n📍 Navigating to http://localhost:3000...')
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    const url = page.url()
    console.log(`Current URL: ${url}`)

    if (url.includes('sign-in')) {
      console.log('\n⚠️  Not authenticated. Please login in the browser window.')
      console.log('Press Enter after logging in...')

      await new Promise<void>((resolve) => {
        process.stdin.once('data', () => resolve())
      })

      await page.waitForTimeout(2000)
    }

    // Now capture screenshots
    console.log('\n📸 Capturing screenshots...\n')

    // 1. Landing page / Main interface
    await page.screenshot({
      path: path.join(REPORTS_DIR, 'auth-01-landing-page.png'),
      fullPage: true,
    })
    console.log('✅ Landing page captured')

    // 2. Look for sidebar toggle
    const sidebarToggle = page.locator('button[aria-label*="sidebar"], button:has(svg)').first()
    if (await sidebarToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Ensure sidebar is visible
      const sidebar = page.locator('aside, [class*="sidebar"]').first()
      if (!await sidebar.isVisible({ timeout: 1000 }).catch(() => false)) {
        await sidebarToggle.click()
        await page.waitForTimeout(500)
      }
    }

    await page.screenshot({
      path: path.join(REPORTS_DIR, 'auth-02-with-sidebar.png'),
      fullPage: true,
    })
    console.log('✅ Sidebar view captured')

    // 3. Find and test chat input
    const chatInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[placeholder*="Type"]').first()
    if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatInput.click()
      await chatInput.fill('I need a private jet from New York to Miami for 4 passengers')

      await page.screenshot({
        path: path.join(REPORTS_DIR, 'auth-03-message-typed.png'),
        fullPage: true,
      })
      console.log('✅ Message input captured')

      // Try to send the message
      const sendButton = page.locator('button[type="submit"], button:has(svg[class*="send"]), button[aria-label*="send"]').first()
      if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await sendButton.click()

        // Wait for response
        console.log('⏳ Waiting for AI response...')
        await page.waitForTimeout(5000)

        await page.screenshot({
          path: path.join(REPORTS_DIR, 'auth-04-chat-response.png'),
          fullPage: true,
        })
        console.log('✅ Chat response captured')

        // Wait more for streaming
        await page.waitForTimeout(5000)

        await page.screenshot({
          path: path.join(REPORTS_DIR, 'auth-05-full-response.png'),
          fullPage: true,
        })
        console.log('✅ Full response captured')
      }
    }

    // 4. Test quick actions if visible
    const quickAction = page.locator('button, a').filter({ hasText: /book a flight|new client/i }).first()
    if (await quickAction.isVisible({ timeout: 2000 }).catch(() => false)) {
      await quickAction.click()
      await page.waitForTimeout(2000)

      await page.screenshot({
        path: path.join(REPORTS_DIR, 'auth-06-quick-action.png'),
        fullPage: true,
      })
      console.log('✅ Quick action captured')
    }

    // 5. Responsive views
    console.log('\n📱 Capturing responsive views...')

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(REPORTS_DIR, 'auth-responsive-tablet.png'),
      fullPage: true,
    })
    console.log('✅ Tablet view captured')

    // Mobile
    await page.setViewportSize({ width: 375, height: 812 })
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(REPORTS_DIR, 'auth-responsive-mobile.png'),
      fullPage: true,
    })
    console.log('✅ Mobile view captured')

    console.log('\n✅ All screenshots saved to reports/ux-analysis/')
    console.log('\nPress Enter to close the browser...')

    await new Promise<void>((resolve) => {
      process.stdin.once('data', () => resolve())
    })

  } catch (error) {
    console.error('Error:', error)
    await page.screenshot({
      path: path.join(REPORTS_DIR, 'auth-error.png'),
      fullPage: true,
    })
  } finally {
    await context.close()
  }
}

testAuthenticatedUI().catch(console.error)
