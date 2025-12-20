/**
 * Test Avinode Existing Flight Request
 *
 * Clicks on an existing flight request to see the Avinode response
 * and captures the full conversation with quotes.
 *
 * Usage: npx tsx scripts/test-avinode-existing.ts
 */

import { chromium } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

const REPORTS_DIR = 'reports/ux-analysis'
const CDP_ENDPOINT = 'http://localhost:9222'

async function testAvinodeExisting() {
  console.log('\n🛩️  Testing Avinode Existing Flight Request\n')

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

    // Take initial screenshot
    await targetPage.screenshot({
      path: path.join(REPORTS_DIR, 'avinode-existing-01-initial.png'),
      fullPage: true,
    })
    console.log('📸 Initial state captured')

    // Look for existing flight requests in the sidebar
    const flightRequests = await targetPage.locator('[class*="flight"], [class*="request"], [class*="chat"]').all()
    console.log(`\n🔍 Found ${flightRequests.length} potential flight request elements`)

    // Click on Flight Request #1 (which has "Proposal Ready" status)
    const request1 = targetPage.locator('text=Flight Request #1').first()
    if (await request1.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('\n📋 Clicking on Flight Request #1 (TEB → VNY, Proposal Ready)...')
      await request1.click()
      await targetPage.waitForTimeout(2000)

      await targetPage.screenshot({
        path: path.join(REPORTS_DIR, 'avinode-existing-02-request1.png'),
        fullPage: true,
      })
      console.log('📸 Flight Request #1 captured')

      // Scroll to see full conversation
      const chatArea = targetPage.locator('[class*="message"], [class*="chat"], main').first()
      if (await chatArea.isVisible({ timeout: 1000 }).catch(() => false)) {
        await chatArea.evaluate(el => el.scrollTop = el.scrollHeight)
        await targetPage.waitForTimeout(500)
      }

      await targetPage.screenshot({
        path: path.join(REPORTS_DIR, 'avinode-existing-03-request1-scrolled.png'),
        fullPage: true,
      })
      console.log('📸 Flight Request #1 scrolled view captured')
    }

    // Click on Flight Request #2 (which has "Quotes 2/5" - actively requesting)
    const request2 = targetPage.locator('text=Flight Request #2').first()
    if (await request2.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('\n📋 Clicking on Flight Request #2 (MIA → ASE, Quotes 2/5)...')
      await request2.click()
      await targetPage.waitForTimeout(2000)

      await targetPage.screenshot({
        path: path.join(REPORTS_DIR, 'avinode-existing-04-request2.png'),
        fullPage: true,
      })
      console.log('📸 Flight Request #2 captured')

      // Scroll to see quotes
      const chatArea = targetPage.locator('[class*="message"], [class*="chat"], main').first()
      if (await chatArea.isVisible({ timeout: 1000 }).catch(() => false)) {
        await chatArea.evaluate(el => el.scrollTop = el.scrollHeight)
        await targetPage.waitForTimeout(500)
      }

      await targetPage.screenshot({
        path: path.join(REPORTS_DIR, 'avinode-existing-05-request2-scrolled.png'),
        fullPage: true,
      })
      console.log('📸 Flight Request #2 scrolled view captured')
    }

    // Click on Flight Request #4 (LAX → SFO, Proposal Ready)
    const request4 = targetPage.locator('text=Flight Request #4').first()
    if (await request4.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('\n📋 Clicking on Flight Request #4 (LAX → SFO, Proposal Ready)...')
      await request4.click()
      await targetPage.waitForTimeout(2000)

      await targetPage.screenshot({
        path: path.join(REPORTS_DIR, 'avinode-existing-06-request4.png'),
        fullPage: true,
      })
      console.log('📸 Flight Request #4 captured')
    }

    // Check for quote cards or Avinode-related UI elements
    console.log('\n🔍 Analyzing Avinode UI elements...')

    const quoteCards = await targetPage.locator('[class*="quote"], [class*="Quote"]').count()
    console.log(`   Quote cards: ${quoteCards}`)

    const proposalElements = await targetPage.locator('[class*="proposal"], [class*="Proposal"]').count()
    console.log(`   Proposal elements: ${proposalElements}`)

    const avinodeElements = await targetPage.locator('[class*="avinode"], [class*="Avinode"]').count()
    console.log(`   Avinode elements: ${avinodeElements}`)

    const tripCards = await targetPage.locator('[class*="trip"], [class*="Trip"]').count()
    console.log(`   Trip cards: ${tripCards}`)

    // Look for action buttons
    const actionButtons = await targetPage.locator('button').filter({
      hasText: /quote|proposal|avinode|book|compare|view/i
    }).all()
    console.log(`\n🔘 Found ${actionButtons.length} relevant action buttons:`)
    for (const btn of actionButtons.slice(0, 5)) {
      const text = await btn.textContent()
      console.log(`   - "${text?.trim()}"`)
    }

    // Click "Full Workflow" button if visible
    const workflowBtn = targetPage.locator('button:has-text("Full Workflow")').first()
    if (await workflowBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('\n📊 Clicking "Full Workflow" button...')
      await workflowBtn.click()
      await targetPage.waitForTimeout(2000)

      await targetPage.screenshot({
        path: path.join(REPORTS_DIR, 'avinode-existing-07-workflow.png'),
        fullPage: true,
      })
      console.log('📸 Workflow view captured')
    }

    // Get any visible response text
    const responseElements = await targetPage.locator('[class*="message"], [class*="response"], [class*="agent"]').all()
    console.log(`\n📄 Found ${responseElements.length} message/response elements`)

    for (const el of responseElements.slice(0, 3)) {
      const text = await el.textContent().catch(() => null)
      if (text && text.length > 20) {
        console.log('\n─'.repeat(50))
        console.log(text.slice(0, 300) + (text.length > 300 ? '...' : ''))
      }
    }

    console.log('\n✅ Avinode existing request test complete!')
    console.log('\nScreenshots saved to reports/ux-analysis/:')
    console.log('  - avinode-existing-01-initial.png')
    console.log('  - avinode-existing-02-request1.png')
    console.log('  - avinode-existing-03-request1-scrolled.png')
    console.log('  - avinode-existing-04-request2.png')
    console.log('  - avinode-existing-05-request2-scrolled.png')
    console.log('  - avinode-existing-06-request4.png')
    console.log('  - avinode-existing-07-workflow.png')

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

testAvinodeExisting().catch(console.error)

export {}
