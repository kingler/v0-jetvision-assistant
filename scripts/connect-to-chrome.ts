/**
 * Connect to Chrome DevTools Protocol
 *
 * Connects to a running Chrome instance with remote debugging enabled.
 *
 * Prerequisites:
 * 1. Close all Chrome windows
 * 2. Launch Chrome with: /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
 * 3. Login to http://localhost:3000 in that Chrome window
 * 4. Run this script: npx tsx scripts/connect-to-chrome.ts
 */

import { chromium } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

const REPORTS_DIR = 'reports/ux-analysis'
const CDP_ENDPOINT = 'http://localhost:9222'

async function connectToChrome() {
  console.log('\n🔗 Connecting to Chrome DevTools Protocol...\n')

  // Ensure reports directory exists
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true })
  }

  try {
    // Connect to Chrome via CDP
    const browser = await chromium.connectOverCDP(CDP_ENDPOINT)
    console.log('✅ Connected to Chrome!\n')

    // Get all contexts and pages
    const contexts = browser.contexts()
    console.log(`Found ${contexts.length} browser context(s)`)

    let targetPage = null

    // Find the page with localhost:3000
    for (const context of contexts) {
      const pages = context.pages()
      console.log(`  Context has ${pages.length} page(s)`)

      for (const page of pages) {
        const url = page.url()
        console.log(`    - ${url}`)

        if (url.includes('localhost:3000')) {
          targetPage = page
          break
        }
      }
      if (targetPage) break
    }

    if (!targetPage) {
      console.log('\n⚠️  No page found with localhost:3000')
      console.log('Please open http://localhost:3000 in Chrome and try again.')
      await browser.close()
      return
    }

    console.log(`\n📍 Found target page: ${targetPage.url()}`)

    // Check if authenticated
    if (targetPage.url().includes('sign-in')) {
      console.log('\n⚠️  Still on sign-in page. Please login first.')
      await browser.close()
      return
    }

    console.log('\n📸 Capturing screenshots...\n')

    // 1. Current state
    await targetPage.screenshot({
      path: path.join(REPORTS_DIR, 'chrome-01-current-state.png'),
      fullPage: true,
    })
    console.log('✅ Current state captured')

    // 2. Desktop view (1920x1080)
    await targetPage.setViewportSize({ width: 1920, height: 1080 })
    await targetPage.waitForTimeout(500)
    await targetPage.screenshot({
      path: path.join(REPORTS_DIR, 'chrome-02-desktop.png'),
      fullPage: true,
    })
    console.log('✅ Desktop view captured')

    // 3. Find chat input and type a message
    const chatInput = targetPage.locator('input[placeholder*="message"], textarea, input[placeholder*="Type"]').first()
    if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatInput.click()
      await chatInput.fill('I need a private jet from New York to Miami for 4 passengers')

      await targetPage.screenshot({
        path: path.join(REPORTS_DIR, 'chrome-03-message-typed.png'),
        fullPage: true,
      })
      console.log('✅ Message typed')

      // Find and click send button
      const sendButton = targetPage.locator('button[type="submit"], button svg[class*="send"], button:has(svg)').last()
      if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('\n🚀 Sending message...')
        await sendButton.click()

        // Capture streaming
        await targetPage.waitForTimeout(3000)
        await targetPage.screenshot({
          path: path.join(REPORTS_DIR, 'chrome-04-streaming.png'),
          fullPage: true,
        })
        console.log('✅ Streaming response captured')

        // Wait for complete response
        await targetPage.waitForTimeout(7000)
        await targetPage.screenshot({
          path: path.join(REPORTS_DIR, 'chrome-05-complete.png'),
          fullPage: true,
        })
        console.log('✅ Complete response captured')
      }
    }

    // 4. Tablet view
    await targetPage.setViewportSize({ width: 768, height: 1024 })
    await targetPage.waitForTimeout(500)
    await targetPage.screenshot({
      path: path.join(REPORTS_DIR, 'chrome-06-tablet.png'),
      fullPage: true,
    })
    console.log('✅ Tablet view captured')

    // 5. Mobile view
    await targetPage.setViewportSize({ width: 375, height: 812 })
    await targetPage.waitForTimeout(500)
    await targetPage.screenshot({
      path: path.join(REPORTS_DIR, 'chrome-07-mobile.png'),
      fullPage: true,
    })
    console.log('✅ Mobile view captured')

    // Reset viewport
    await targetPage.setViewportSize({ width: 1920, height: 1080 })

    console.log('\n✅ All screenshots saved to reports/ux-analysis/')
    console.log('\nScreenshots captured:')
    console.log('  - chrome-01-current-state.png')
    console.log('  - chrome-02-desktop.png')
    console.log('  - chrome-03-message-typed.png')
    console.log('  - chrome-04-streaming.png')
    console.log('  - chrome-05-complete.png')
    console.log('  - chrome-06-tablet.png')
    console.log('  - chrome-07-mobile.png')

    // Don't close the browser - just disconnect
    browser.close()

  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      console.log('❌ Could not connect to Chrome.')
      console.log('')
      console.log('Make sure Chrome is running with remote debugging:')
      console.log('')
      console.log('  1. Quit Chrome completely (Cmd+Q)')
      console.log('  2. Run: /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222')
      console.log('  3. Open http://localhost:3000 and login')
      console.log('  4. Run this script again')
    } else {
      console.error('Error:', error)
    }
  }
}

connectToChrome().catch(console.error)
