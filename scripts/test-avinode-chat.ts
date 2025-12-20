/**
 * Test Avinode Chat Flow
 *
 * Sends a flight request through the chat interface and captures
 * the agent's response including any Avinode API interactions.
 *
 * Usage: npx tsx scripts/test-avinode-chat.ts
 */

import { chromium } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

const REPORTS_DIR = 'reports/ux-analysis'
const CDP_ENDPOINT = 'http://localhost:9222'

async function testAvinodeChat() {
  console.log('\n🛩️  Testing Avinode Chat Flow\n')

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
    let targetPage = null

    // Find the page with localhost:3000
    for (const context of contexts) {
      const pages = context.pages()
      for (const page of pages) {
        if (page.url().includes('localhost:3000')) {
          targetPage = page
          break
        }
      }
      if (targetPage) break
    }

    if (!targetPage) {
      console.log('❌ No page found with localhost:3000')
      await browser.close()
      return
    }

    console.log(`📍 Found target page: ${targetPage.url()}`)

    // Navigate to home to start fresh
    await targetPage.goto('http://localhost:3000')
    await targetPage.waitForLoadState('domcontentloaded')
    await targetPage.waitForTimeout(2000)

    // Take initial screenshot
    await targetPage.screenshot({
      path: path.join(REPORTS_DIR, 'avinode-01-initial.png'),
      fullPage: true,
    })
    console.log('📸 Initial state captured')

    // Find chat input
    const chatInput = targetPage.locator('input[placeholder*="message"], textarea, input[placeholder*="Type"]').first()

    if (!await chatInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('❌ Chat input not found')
      await browser.close()
      return
    }

    // Type a detailed flight request that would trigger Avinode
    const flightRequest = `I need to book a private jet flight:
- From: Teterboro (TEB) to Miami (MIA)
- Date: December 28, 2025
- Passengers: 6
- Preferred aircraft: Gulfstream G200 or similar
- One-way trip
Please search for available options and provide quotes.`

    console.log('\n📝 Typing flight request...')
    await chatInput.click()
    await chatInput.fill(flightRequest)

    await targetPage.screenshot({
      path: path.join(REPORTS_DIR, 'avinode-02-request-typed.png'),
      fullPage: true,
    })
    console.log('📸 Request typed')

    // Find and click send button
    const sendButton = targetPage.locator('button[type="submit"], button svg, button:has(svg)').last()

    if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('\n🚀 Sending flight request...')
      await sendButton.click()

      // Capture multiple stages of the response
      console.log('⏳ Waiting for agent response...')

      // Stage 1: Initial response (2 seconds)
      await targetPage.waitForTimeout(2000)
      await targetPage.screenshot({
        path: path.join(REPORTS_DIR, 'avinode-03-response-start.png'),
        fullPage: true,
      })
      console.log('📸 Response start captured')

      // Stage 2: Processing (5 seconds)
      await targetPage.waitForTimeout(3000)
      await targetPage.screenshot({
        path: path.join(REPORTS_DIR, 'avinode-04-processing.png'),
        fullPage: true,
      })
      console.log('📸 Processing state captured')

      // Stage 3: More processing (10 seconds)
      await targetPage.waitForTimeout(5000)
      await targetPage.screenshot({
        path: path.join(REPORTS_DIR, 'avinode-05-mid-response.png'),
        fullPage: true,
      })
      console.log('📸 Mid-response captured')

      // Stage 4: Near completion (15 seconds total)
      await targetPage.waitForTimeout(5000)
      await targetPage.screenshot({
        path: path.join(REPORTS_DIR, 'avinode-06-near-complete.png'),
        fullPage: true,
      })
      console.log('📸 Near completion captured')

      // Stage 5: Final response (20 seconds total)
      await targetPage.waitForTimeout(5000)
      await targetPage.screenshot({
        path: path.join(REPORTS_DIR, 'avinode-07-complete.png'),
        fullPage: true,
      })
      console.log('📸 Complete response captured')

      // Check for any Avinode-related UI elements
      const avinodeElements = await targetPage.locator('[class*="avinode"], [data-avinode], [class*="quote"], [class*="flight"]').count()
      console.log(`\n🔍 Found ${avinodeElements} Avinode/quote-related elements`)

      // Look for action buttons
      const actionButtons = await targetPage.locator('button').filter({ hasText: /quote|search|avinode|book|option/i }).all()
      console.log(`🔘 Found ${actionButtons.length} action buttons`)

      // Capture any visible quotes or results
      const quoteCards = await targetPage.locator('[class*="card"], [class*="quote"], [class*="result"]').count()
      console.log(`📋 Found ${quoteCards} card/quote elements`)

      // Get the response text
      const responseText = await targetPage.locator('[class*="message"], [class*="response"], [class*="agent"]').last().textContent().catch(() => null)
      if (responseText) {
        console.log('\n📄 Agent Response Preview:')
        console.log('─'.repeat(50))
        console.log(responseText.slice(0, 500) + (responseText.length > 500 ? '...' : ''))
        console.log('─'.repeat(50))
      }

    } else {
      console.log('❌ Send button not found')
    }

    console.log('\n✅ Avinode chat flow test complete!')
    console.log('\nScreenshots saved to reports/ux-analysis/:')
    console.log('  - avinode-01-initial.png')
    console.log('  - avinode-02-request-typed.png')
    console.log('  - avinode-03-response-start.png')
    console.log('  - avinode-04-processing.png')
    console.log('  - avinode-05-mid-response.png')
    console.log('  - avinode-06-near-complete.png')
    console.log('  - avinode-07-complete.png')

    // Don't close browser - just disconnect
    browser.close()

  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      console.log('❌ Chrome not connected. Make sure Chrome is running with --remote-debugging-port=9222')
    } else {
      console.error('Error:', error)
    }
  }
}

testAvinodeChat().catch(console.error)
