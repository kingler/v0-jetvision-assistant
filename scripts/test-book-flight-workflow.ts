/**
 * Test Book Flight Workflow
 *
 * Uses the "I want to help book a flight for a new client" quick action
 * to start a proper booking workflow and capture the Avinode deep link.
 *
 * Usage: npx tsx scripts/test-book-flight-workflow.ts
 */

import { chromium } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

const REPORTS_DIR = 'reports/ux-analysis'
const CDP_ENDPOINT = 'http://localhost:9222'

async function testBookFlightWorkflow() {
  console.log('\n🛩️  Testing Book Flight Workflow\n')

  // Ensure reports directory exists
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true })
  }

  try {
    // Connect to Chrome via CDP
    const browser = await chromium.connectOverCDP(CDP_ENDPOINT)
    console.log('✅ Connected to Chrome!\n')

    // Get target page
    const contexts = browser.contexts()
    let targetPage = null
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

    // Navigate to home
    await targetPage.goto('http://localhost:3000')
    await targetPage.waitForLoadState('domcontentloaded')
    await targetPage.waitForTimeout(2000)

    await targetPage.screenshot({
      path: path.join(REPORTS_DIR, 'book-flight-01-home.png'),
      fullPage: true,
    })
    console.log('📸 Home page captured')

    // Click "I want to help book a flight for a new client" quick action
    const bookFlightAction = targetPage.locator('text=I want to help book a flight for a new client').first()

    if (await bookFlightAction.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('\n🎯 Clicking "Book a flight for new client" quick action...')
      await bookFlightAction.click()
      await targetPage.waitForTimeout(3000)

      await targetPage.screenshot({
        path: path.join(REPORTS_DIR, 'book-flight-02-action-clicked.png'),
        fullPage: true,
      })
      console.log('📸 Quick action response captured')

      // Wait for any follow-up prompts
      await targetPage.waitForTimeout(5000)
      await targetPage.screenshot({
        path: path.join(REPORTS_DIR, 'book-flight-03-response.png'),
        fullPage: true,
      })
      console.log('📸 Full response captured')

      // Now provide the flight details
      const chatInput = targetPage.locator('input[placeholder*="Message"], textarea, input[placeholder*="message"]').first()

      if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        const flightDetails = `Here are the flight details:
- Route: Teterboro (KTEB) to Miami Opa-Locka (KOPF)
- Date: January 15, 2025
- Passengers: 4
- Aircraft preference: Light jet or midsize
- One-way trip`

        console.log('\n📝 Providing flight details...')
        await chatInput.click()
        await chatInput.fill(flightDetails)

        await targetPage.screenshot({
          path: path.join(REPORTS_DIR, 'book-flight-04-details-typed.png'),
          fullPage: true,
        })

        // Press Enter to send (more reliable than clicking button)
        await chatInput.press('Enter')
        console.log('🚀 Sent flight details')

        // Capture response stages
        await targetPage.waitForTimeout(3000)
        await targetPage.screenshot({
          path: path.join(REPORTS_DIR, 'book-flight-05-processing.png'),
          fullPage: true,
        })
        console.log('📸 Processing captured')

        await targetPage.waitForTimeout(7000)
        await targetPage.screenshot({
          path: path.join(REPORTS_DIR, 'book-flight-06-mid-response.png'),
          fullPage: true,
        })
        console.log('📸 Mid-response captured')

        await targetPage.waitForTimeout(10000)
        await targetPage.screenshot({
          path: path.join(REPORTS_DIR, 'book-flight-07-complete.png'),
          fullPage: true,
        })
        console.log('📸 Complete response captured')
      }

    } else {
      console.log('❌ "Book a flight" quick action not visible')

      // Try typing directly in the input
      const chatInput = targetPage.locator('input[placeholder*="Type your message"], input[placeholder*="message"]').first()

      if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('\n📝 Typing flight request directly...')

        const flightRequest = 'I want to book a private jet from Teterboro (KTEB) to Miami Opa-Locka (KOPF) on January 15, 2025 for 4 passengers. Please search for light jet or midsize options.'

        await chatInput.click()
        await chatInput.fill(flightRequest)

        await targetPage.screenshot({
          path: path.join(REPORTS_DIR, 'book-flight-02-typed.png'),
          fullPage: true,
        })

        await chatInput.press('Enter')
        console.log('🚀 Sent request')

        // Capture responses
        await targetPage.waitForTimeout(5000)
        await targetPage.screenshot({
          path: path.join(REPORTS_DIR, 'book-flight-03-processing.png'),
          fullPage: true,
        })

        await targetPage.waitForTimeout(10000)
        await targetPage.screenshot({
          path: path.join(REPORTS_DIR, 'book-flight-04-response.png'),
          fullPage: true,
        })

        await targetPage.waitForTimeout(10000)
        await targetPage.screenshot({
          path: path.join(REPORTS_DIR, 'book-flight-05-complete.png'),
          fullPage: true,
        })
      }
    }

    // Check for Avinode elements
    console.log('\n🔍 Checking for Avinode integration...')

    const avinodeLink = await targetPage.locator('a[href*="avinode"], a[href*="marketplace"]').count()
    const deepLinkBtn = await targetPage.locator('button:has-text("Open in Avinode"), a:has-text("Open in Avinode")').count()
    const tripIdText = await targetPage.locator('text=/TRIP-|REQ-|Trip ID/i').count()
    const workflowViz = await targetPage.locator('text=/Creating Trip|Understanding Request/i').count()

    console.log(`   Avinode links: ${avinodeLink}`)
    console.log(`   Deep link buttons: ${deepLinkBtn}`)
    console.log(`   Trip ID elements: ${tripIdText}`)
    console.log(`   Workflow visualization: ${workflowViz}`)

    // Get response text
    const messages = await targetPage.locator('[class*="message"], [class*="agent"]').all()
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      const text = await lastMsg.textContent().catch(() => '')
      if (text && text.length > 50) {
        console.log('\n📄 Last Agent Response:')
        console.log('─'.repeat(60))
        console.log(text.slice(0, 600) + (text.length > 600 ? '...' : ''))
        console.log('─'.repeat(60))
      }
    }

    console.log('\n✅ Book flight workflow test complete!')
    console.log('\nScreenshots saved to reports/ux-analysis/')

    browser.close()

  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      console.log('❌ Chrome not connected')
    } else {
      console.error('Error:', error)
    }
  }
}

testBookFlightWorkflow().catch(console.error)

export {}
