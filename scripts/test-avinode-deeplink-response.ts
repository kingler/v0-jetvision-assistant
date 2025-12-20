/**
 * Test Avinode Deeplink Response
 *
 * Submits a flight request and captures the response including
 * the clickable deeplink to Avinode marketplace.
 *
 * Usage: npx tsx scripts/test-avinode-deeplink-response.ts
 */

import { chromium } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

const SCREENSHOTS_DIR = 'screenshots/avinode-deeplink-test'
const CDP_ENDPOINT = 'http://localhost:9222'

async function testAvinodeDeeplinkResponse() {
  console.log('\n🛩️  Testing Avinode Deeplink Response\n')

  // Ensure screenshots directory exists
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

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
        if (page.url().includes('localhost:3000') && !page.url().includes('blob:')) {
          targetPage = page
          break
        }
      }
      if (targetPage) break
    }

    if (!targetPage) {
      console.log('❌ No page found with localhost:3000')
      console.log('Please open http://localhost:3000 in Chrome and log in first.')
      await browser.close()
      return
    }

    console.log(`📍 Found target page: ${targetPage.url()}`)

    // Take initial screenshot
    await targetPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, `01-initial-${timestamp}.png`),
      fullPage: true,
    })
    console.log('📸 Initial state captured')

    // Check if we're on the sign-in page
    if (targetPage.url().includes('sign-in')) {
      console.log('❌ Not authenticated - please log in first')
      await targetPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, `01-sign-in-required-${timestamp}.png`),
        fullPage: true,
      })
      await browser.close()
      return
    }

    // Look for chat input - the placeholder is "Type your message to start a new chat..."
    const chatInput = targetPage.locator(
      'input[placeholder*="Type your message"], textarea[placeholder*="Type your message"], input[placeholder*="chat"], textarea[placeholder*="chat"]'
    ).first()

    const inputVisible = await chatInput.isVisible({ timeout: 5000 }).catch(() => false)

    if (!inputVisible) {
      console.log('⚠️ Chat input not found, looking for quick action buttons...')

      // Try clicking "New" button to start fresh chat
      const newButton = targetPage.locator('button:has-text("New")').first()
      if (await newButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await newButton.click()
        await targetPage.waitForTimeout(1000)
        console.log('📝 Clicked "New" button')
      }
    }

    await targetPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, `02-chat-ready-${timestamp}.png`),
      fullPage: true,
    })
    console.log('📸 Chat interface captured')

    // Type flight request that will trigger Avinode deeplink workflow
    const flightRequest = 'I need a private jet from Teterboro (KTEB) to Los Angeles (KLAX) for 6 passengers on January 25th, 2025'

    // Re-locate input after potential page change
    const input = targetPage.locator(
      'input[placeholder*="Type your message"], textarea[placeholder*="Type your message"], input[placeholder*="chat"], textarea[placeholder*="chat"]'
    ).first()

    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.focus()
      await input.fill(flightRequest)
      console.log('✍️ Flight request typed')

      await targetPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, `03-request-typed-${timestamp}.png`),
        fullPage: true,
      })
      console.log('📸 Request typed captured')

      // Submit the request
      const sendButton = targetPage.locator('button[type="submit"], button[aria-label*="send"], button[aria-label*="Send"]').first()
      if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await sendButton.click()
        console.log('🚀 Request submitted via button')
      } else {
        await input.press('Enter')
        console.log('🚀 Request submitted via Enter key')
      }

      await targetPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, `04-submitted-${timestamp}.png`),
        fullPage: true,
      })
      console.log('📸 Submitted state captured')

      // Wait for response with progress updates
      console.log('\n⏳ Waiting for AI response...')

      for (let i = 0; i < 6; i++) {
        await targetPage.waitForTimeout(5000)
        await targetPage.screenshot({
          path: path.join(SCREENSHOTS_DIR, `05-response-${i + 1}-${timestamp}.png`),
          fullPage: true,
        })
        console.log(`📸 Response progress ${i + 1}/6 captured`)
      }
    } else {
      console.log('⚠️ Could not find chat input')
    }

    // Analyze the page for deeplink elements
    console.log('\n🔍 Analyzing page for Avinode deeplink elements...')

    // Look for "Open in Avinode" button/link
    const avinodeLink = targetPage.locator(
      'a[href*="avinode"], button:has-text("Avinode"), button:has-text("Open in Avinode"), [data-testid="avinode-deep-link"], a:has-text("Avinode")'
    )
    const avinodeLinkCount = await avinodeLink.count()
    console.log(`   Avinode links/buttons: ${avinodeLinkCount}`)

    if (avinodeLinkCount > 0) {
      const firstLink = avinodeLink.first()
      const href = await firstLink.getAttribute('href')
      const text = await firstLink.textContent()
      console.log(`   🔗 Deep Link found: ${href}`)
      console.log(`   📝 Link text: ${text}`)

      // Highlight and screenshot the deeplink
      await firstLink.evaluate(el => {
        (el as HTMLElement).style.border = '3px solid red'
        (el as HTMLElement).style.boxShadow = '0 0 10px red'
      })

      await targetPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, `06-deeplink-highlighted-${timestamp}.png`),
        fullPage: true,
      })
      console.log('📸 Deeplink highlighted captured')
    }

    // Look for Trip ID
    const tripIdElement = targetPage.locator('[data-testid="trip-id"], [class*="trip-id"]')
    const tripIdCount = await tripIdElement.count()
    console.log(`   Trip ID elements: ${tripIdCount}`)

    if (tripIdCount > 0) {
      const tripIdText = await tripIdElement.first().textContent()
      console.log(`   🎫 Trip ID: ${tripIdText}`)
    }

    // Look for workflow visualization
    const workflowViz = targetPage.locator('[class*="workflow"], [class*="Workflow"]')
    const workflowCount = await workflowViz.count()
    console.log(`   Workflow elements: ${workflowCount}`)

    // Look for proposal/quote cards
    const quoteCards = targetPage.locator('[class*="quote"], [class*="Quote"], [class*="proposal"], [class*="Proposal"]')
    const quoteCount = await quoteCards.count()
    console.log(`   Quote/Proposal cards: ${quoteCount}`)

    // Look for action required banner
    const actionRequired = targetPage.locator('[class*="action-required"], [data-testid="action-required"]')
    const actionCount = await actionRequired.count()
    console.log(`   Action required banners: ${actionCount}`)

    // Take final screenshot
    await targetPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, `07-final-${timestamp}.png`),
      fullPage: true,
    })
    console.log('📸 Final state captured')

    // Get page content for analysis
    const pageContent = await targetPage.content()
    const hasDeepLink = pageContent.includes('avinode') || pageContent.includes('deepLink') || pageContent.includes('deep_link')
    const hasTripId = /trp[0-9]+|REQ-[0-9]+/i.test(pageContent)

    console.log('\n=== Content Analysis ===')
    console.log(`   Contains Avinode reference: ${hasDeepLink ? '✅' : '❌'}`)
    console.log(`   Contains Trip/Request ID: ${hasTripId ? '✅' : '❌'}`)

    console.log('\n✅ Avinode deeplink response test complete!')
    console.log(`\nScreenshots saved to: ${SCREENSHOTS_DIR}/`)

    // Don't close browser - just disconnect
    browser.close()

  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      console.log('❌ Chrome not connected.')
      console.log('Start Chrome with: open -a "Google Chrome" --args --remote-debugging-port=9222')
    } else {
      console.error('Error:', error)
    }
  }
}

testAvinodeDeeplinkResponse().catch(console.error)

export {}
