#!/usr/bin/env npx tsx
/**
 * Capture screenshots from an existing Chrome debug session
 *
 * Prerequisites:
 * 1. Start Chrome with remote debugging:
 *    /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
 * 2. Sign in to the app manually in that Chrome instance
 * 3. Run this script to capture screenshots
 */

import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots', 'debug-session')

async function captureDebugSession() {
  // Ensure screenshots directory exists
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  }

  console.log('🔍 Connecting to Chrome debug session on port 9222...')

  try {
    // Connect to existing Chrome instance
    const browser = await chromium.connectOverCDP('http://localhost:9222')
    console.log('✅ Connected to Chrome')

    // Get all contexts (browser windows)
    const contexts = browser.contexts()
    console.log(`Found ${contexts.length} browser context(s)`)

    if (contexts.length === 0) {
      console.log('❌ No browser contexts found. Make sure Chrome is running with --remote-debugging-port=9222')
      return
    }

    // Get pages from first context
    const pages = contexts[0].pages()
    console.log(`Found ${pages.length} page(s)`)

    // Find the JetVision page
    let targetPage = null
    for (const page of pages) {
      const url = page.url()
      console.log(`  - Page: ${url}`)
      if (url.includes('localhost:3000') || url.includes('jetvision')) {
        targetPage = page
        break
      }
    }

    if (!targetPage) {
      console.log('❌ No JetVision page found. Please navigate to http://localhost:3000 in Chrome')

      // If no target page, use the first available page
      if (pages.length > 0) {
        targetPage = pages[0]
        console.log(`Using first available page: ${targetPage.url()}`)
      } else {
        return
      }
    }

    console.log(`\n📸 Capturing screenshots from: ${targetPage.url()}`)

    // Capture current state
    const timestamp = Date.now()

    await targetPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, `01-current-state-${timestamp}.png`),
      fullPage: true,
    })
    console.log('✅ Captured: 01-current-state')

    // Check if we're on the main app (not sign-in)
    const url = targetPage.url()
    if (url.includes('sign-in')) {
      console.log('\n⚠️  Currently on sign-in page. Please sign in first.')
      await browser.close()
      return
    }

    // Look for the chat input
    const chatInput = targetPage.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first()

    if (await chatInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ Chat input found')

      // Type a flight request
      const flightRequest = 'I need a private jet from Teterboro (KTEB) to Miami (KMIA) for 6 passengers on January 20th, 2025'

      await chatInput.fill(flightRequest)
      await targetPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, `02-request-typed-${timestamp}.png`),
        fullPage: true,
      })
      console.log('✅ Captured: 02-request-typed')

      // Submit the request
      const sendButton = targetPage.locator('button[type="submit"], button:has(svg)').last()
      if (await sendButton.isVisible({ timeout: 3000 })) {
        await sendButton.click()
        console.log('✅ Request submitted')
      } else {
        await chatInput.press('Enter')
        console.log('✅ Request submitted via Enter key')
      }

      await targetPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, `03-submitted-${timestamp}.png`),
        fullPage: true,
      })
      console.log('✅ Captured: 03-submitted')

      // Wait for response
      console.log('⏳ Waiting for Avinode response...')
      await targetPage.waitForTimeout(5000)

      await targetPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, `04-response-waiting-${timestamp}.png`),
        fullPage: true,
      })
      console.log('✅ Captured: 04-response-waiting')

      // Wait more for full response
      await targetPage.waitForTimeout(10000)

      await targetPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, `05-response-complete-${timestamp}.png`),
        fullPage: true,
      })
      console.log('✅ Captured: 05-response-complete')

    } else {
      console.log('⚠️  Chat input not found on current page')

      // Just capture whatever is visible
      await targetPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, `02-page-content-${timestamp}.png`),
        fullPage: true,
      })
      console.log('✅ Captured: 02-page-content')
    }

    // Check sidebar for flight requests count
    const sidebarText = await targetPage.locator('text=/\\d+ active flight request/i').first()
    if (await sidebarText.isVisible({ timeout: 3000 }).catch(() => false)) {
      const text = await sidebarText.textContent()
      console.log(`\n📊 Sidebar shows: ${text}`)
    }

    console.log(`\n✅ Screenshots saved to: ${SCREENSHOTS_DIR}`)

    // Don't close browser - keep session alive
    await browser.close()

  } catch (error) {
    if ((error as Error).message.includes('ECONNREFUSED')) {
      console.log(`
❌ Could not connect to Chrome debug session.

To start Chrome with remote debugging:
  /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222

Then sign in to http://localhost:3000 and run this script again.
`)
    } else {
      console.error('Error:', error)
    }
  }
}

captureDebugSession()
