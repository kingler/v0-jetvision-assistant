/**
 * Test New Flight Request Flow
 *
 * Creates a NEW chat session, sends a flight request, and captures
 * the agent's response including any Avinode deep link generation.
 *
 * Expected workflow per ONEK-120:
 * 1. User sends flight request details
 * 2. Agent parses request and calls create_trip MCP tool
 * 3. MCP returns trip ID + deep link to Avinode marketplace
 * 4. Agent shows DeepLinkPrompt component with link
 * 5. User manually opens Avinode to complete request
 *
 * Usage: npx tsx scripts/test-new-flight-request.ts
 */

import { chromium } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

const REPORTS_DIR = 'reports/ux-analysis'
const CDP_ENDPOINT = 'http://localhost:9222'

async function testNewFlightRequest() {
  console.log('\n🛩️  Testing New Flight Request Flow (ONEK-120)\n')
  console.log('Expected: Agent should create trip and return Avinode deep link\n')

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
      path: path.join(REPORTS_DIR, 'new-request-01-initial.png'),
      fullPage: true,
    })
    console.log('📸 Initial state captured')

    // Click "+ New" button to start a new chat
    const newChatBtn = targetPage.locator('button:has-text("New"), button:has-text("+ New")').first()
    if (await newChatBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('\n🆕 Starting new chat session...')
      await newChatBtn.click()
      await targetPage.waitForTimeout(1500)

      await targetPage.screenshot({
        path: path.join(REPORTS_DIR, 'new-request-02-new-chat.png'),
        fullPage: true,
      })
      console.log('📸 New chat session started')
    }

    // Find chat input
    const chatInput = targetPage.locator('input[placeholder*="Message"], textarea, input[placeholder*="Type"], input[placeholder*="message"]').first()

    if (!await chatInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('❌ Chat input not found')
      await browser.close()
      return
    }

    // Type a detailed flight request
    const flightRequest = `I need to book a private jet flight:
- From: Teterboro (KTEB) to Miami Opa-Locka (KOPF)
- Date: January 15, 2025
- Passengers: 4
- Preferred aircraft: Light jet or midsize
- One-way trip

Please search for available options.`

    console.log('\n📝 Typing flight request...')
    console.log('─'.repeat(50))
    console.log(flightRequest)
    console.log('─'.repeat(50))

    await chatInput.click()
    await chatInput.fill(flightRequest)

    await targetPage.screenshot({
      path: path.join(REPORTS_DIR, 'new-request-03-typed.png'),
      fullPage: true,
    })
    console.log('📸 Request typed')

    // Find and click send button
    const sendButton = targetPage.locator('button[type="submit"], button svg[class*="send"], button:has(svg)').last()

    if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('\n🚀 Sending flight request...')
      await sendButton.click()

      // Capture response stages
      console.log('⏳ Waiting for agent response...\n')

      // Stage 1: Immediate response (2 seconds)
      await targetPage.waitForTimeout(2000)
      await targetPage.screenshot({
        path: path.join(REPORTS_DIR, 'new-request-04-response-start.png'),
        fullPage: true,
      })
      console.log('📸 Response start (2s)')

      // Stage 2: Processing (5 seconds)
      await targetPage.waitForTimeout(3000)
      await targetPage.screenshot({
        path: path.join(REPORTS_DIR, 'new-request-05-processing.png'),
        fullPage: true,
      })
      console.log('📸 Processing (5s)')

      // Stage 3: Mid-response (10 seconds)
      await targetPage.waitForTimeout(5000)
      await targetPage.screenshot({
        path: path.join(REPORTS_DIR, 'new-request-06-mid-response.png'),
        fullPage: true,
      })
      console.log('📸 Mid response (10s)')

      // Stage 4: Near completion (15 seconds)
      await targetPage.waitForTimeout(5000)
      await targetPage.screenshot({
        path: path.join(REPORTS_DIR, 'new-request-07-near-complete.png'),
        fullPage: true,
      })
      console.log('📸 Near complete (15s)')

      // Stage 5: Final response (20 seconds)
      await targetPage.waitForTimeout(5000)
      await targetPage.screenshot({
        path: path.join(REPORTS_DIR, 'new-request-08-complete.png'),
        fullPage: true,
      })
      console.log('📸 Complete response (20s)')

      // Check for Avinode-specific elements
      console.log('\n🔍 Checking for Avinode integration elements...\n')

      // Look for DeepLinkPrompt component
      const deepLinkPrompt = await targetPage.locator('[class*="deep-link"], text="Open in Avinode"').count()
      console.log(`   DeepLinkPrompt component: ${deepLinkPrompt > 0 ? '✅ Found' : '❌ Not found'}`)

      // Look for trip ID
      const tripIdElements = await targetPage.locator('[class*="trip-id"], text=/REQ-[0-9]+|TRIP-[0-9]+/i').count()
      console.log(`   Trip ID element: ${tripIdElements > 0 ? '✅ Found' : '❌ Not found'}`)

      // Look for marketplace link
      const marketplaceLink = await targetPage.locator('a[href*="avinode"], a[href*="marketplace"]').count()
      console.log(`   Avinode marketplace link: ${marketplaceLink > 0 ? '✅ Found' : '❌ Not found'}`)

      // Look for workflow steps
      const workflowSteps = await targetPage.locator('text=/Step [0-9]|Understanding Request|Creating Trip/i').count()
      console.log(`   Workflow steps: ${workflowSteps > 0 ? '✅ Found' : '❌ Not found'}`)

      // Get the agent's response text
      const responseElements = await targetPage.locator('[class*="message"], [class*="response"], [class*="agent"]').all()
      const lastResponse = responseElements.length > 0 ? responseElements[responseElements.length - 1] : null

      if (lastResponse) {
        const responseText = await lastResponse.textContent().catch(() => null)
        if (responseText && responseText.length > 50) {
          console.log('\n📄 Agent Response:')
          console.log('─'.repeat(60))
          console.log(responseText.slice(0, 800) + (responseText.length > 800 ? '...' : ''))
          console.log('─'.repeat(60))
        }
      }

      // Check sidebar for new request
      const sidebarRequest = await targetPage.locator('[class*="sidebar"] >> text=/KTEB|Teterboro|KOPF|Miami/i').first()
      if (await sidebarRequest.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('\n✅ New flight request visible in sidebar')
      }

    } else {
      console.log('❌ Send button not found')
    }

    console.log('\n✅ New flight request test complete!')
    console.log('\nScreenshots saved to reports/ux-analysis/:')
    console.log('  - new-request-01-initial.png')
    console.log('  - new-request-02-new-chat.png')
    console.log('  - new-request-03-typed.png')
    console.log('  - new-request-04-response-start.png')
    console.log('  - new-request-05-processing.png')
    console.log('  - new-request-06-mid-response.png')
    console.log('  - new-request-07-near-complete.png')
    console.log('  - new-request-08-complete.png')

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

testNewFlightRequest().catch(console.error)

export {}
