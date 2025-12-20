/**
 * Test Full UI Flow
 *
 * Sends messages through the actual UI and captures screenshots of the workflow.
 */

import { chromium } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

const CDP_ENDPOINT = 'http://localhost:9222'
const REPORTS_DIR = 'reports/ux-analysis'

async function testFullUIFlow() {
  console.log('\n🚀 Testing Full UI Flow\n')

  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true })
  }

  try {
    const browser = await chromium.connectOverCDP(CDP_ENDPOINT)
    console.log('✅ Connected to Chrome!')

    const contexts = browser.contexts()
    let targetPage = null

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
      console.log('❌ No localhost:3000 page found')
      await browser.close()
      return
    }

    console.log(`📍 Current URL: ${targetPage.url()}`)

    // Click New to start fresh chat
    const newButton = targetPage.locator('button:has-text("New")').first()
    if (await newButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('📝 Starting new chat...')
      await newButton.click()
      await targetPage.waitForTimeout(1500)
    }

    // Capture initial state
    await targetPage.screenshot({
      path: path.join(REPORTS_DIR, 'flow-01-initial.png'),
      fullPage: true,
    })
    console.log('📸 Screenshot: flow-01-initial.png')

    // Find chat input - try multiple selectors
    const chatInput = targetPage.locator('input[placeholder*="Type your message"], input[placeholder*="Message about"], textarea').first()
    if (!await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('❌ Chat input not found')
      await browser.close()
      return
    }

    // Step 1: Send flight search request
    const searchMessage = 'I need to book a flight from Teterboro (KTEB) to Van Nuys (KVNY) for 4 passengers on January 20, 2025.'
    console.log(`\n📤 Step 1: Sending search request...`)
    console.log(`   "${searchMessage.slice(0, 60)}..."`)

    await chatInput.fill(searchMessage)
    await targetPage.waitForTimeout(300)

    // Click send
    const sendButton = targetPage.locator('button[type="submit"], button:has(svg)').last()
    if (await sendButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await sendButton.click()
    } else {
      await chatInput.press('Enter')
    }

    // Wait for response
    console.log('⏳ Waiting for flight search results...')
    let foundResponse = false
    for (let i = 0; i < 60; i++) {
      await targetPage.waitForTimeout(1000)

      // Check for assistant message with aircraft options
      const assistantMessages = await targetPage.locator('[class*="bg-gray"]').allTextContents()
      const lastMessage = assistantMessages[assistantMessages.length - 1] || ''

      if (lastMessage.includes('Citation') || lastMessage.includes('Gulfstream') || lastMessage.includes('aircraft')) {
        foundResponse = true
        console.log('✅ Search results received!')
        break
      }

      if (i % 10 === 0) {
        process.stdout.write('.')
      }
    }

    if (!foundResponse) {
      console.log('\n⚠️ Search results not found after timeout')
    }

    await targetPage.screenshot({
      path: path.join(REPORTS_DIR, 'flow-02-search-results.png'),
      fullPage: true,
    })
    console.log('📸 Screenshot: flow-02-search-results.png')

    // Step 2: Request RFP creation
    console.log(`\n📤 Step 2: Requesting RFP creation...`)

    await targetPage.waitForTimeout(1000)
    await chatInput.fill('Yes, please proceed with creating an RFP for all three options.')
    await targetPage.waitForTimeout(300)

    if (await sendButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await sendButton.click()
    } else {
      await chatInput.press('Enter')
    }

    // Wait for RFP response with deeplink
    console.log('⏳ Waiting for RFP creation response...')
    let foundDeeplink = false
    for (let i = 0; i < 60; i++) {
      await targetPage.waitForTimeout(1000)

      // Check for deeplink elements
      const deepLinkVisible = await targetPage.locator('text=Open in Avinode').isVisible({ timeout: 500 }).catch(() => false)
      const marketplaceLink = await targetPage.locator('a[href*="marketplace.avinode.com"]').isVisible({ timeout: 500 }).catch(() => false)
      const rfpCreated = await targetPage.locator('text=RFP has been').isVisible({ timeout: 500 }).catch(() => false)

      if (deepLinkVisible || marketplaceLink) {
        foundDeeplink = true
        console.log('🎉 Deep link found!')
        break
      }

      if (rfpCreated) {
        console.log('✅ RFP created message found, checking for deeplink...')
        await targetPage.waitForTimeout(2000)
      }

      if (i % 10 === 0) {
        process.stdout.write('.')
      }
    }

    // Take screenshot
    await targetPage.screenshot({
      path: path.join(REPORTS_DIR, 'flow-03-rfp-response.png'),
      fullPage: true,
    })
    console.log('📸 Screenshot: flow-03-rfp-response.png')

    // Check for DeepLinkPrompt component specifically
    const deepLinkPrompt = targetPage.locator('[class*="deep-link"], [class*="DeepLink"], button:has-text("Open in Avinode Marketplace")').first()
    if (await deepLinkPrompt.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('🎯 DeepLinkPrompt component visible!')
      await deepLinkPrompt.screenshot({
        path: path.join(REPORTS_DIR, 'flow-04-deeplink-component.png'),
      })
      console.log('📸 Screenshot: flow-04-deeplink-component.png')
    } else {
      console.log('⚠️ DeepLinkPrompt component not found as expected')

      // Try to find any link with avinode
      const avinodeLinks = await targetPage.locator('a[href*="avinode"]').all()
      console.log(`   Found ${avinodeLinks.length} Avinode links`)

      // Check workflow status
      const workflowBadge = targetPage.locator('[class*="badge"]:has-text("Requesting"), [class*="badge"]:has-text("Quotes")').first()
      if (await workflowBadge.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('✅ Workflow status shows "Requesting Quotes"')
      }
    }

    // Final screenshot with full workflow view
    const fullWorkflowBtn = targetPage.locator('button:has-text("Full Workflow")').first()
    if (await fullWorkflowBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await fullWorkflowBtn.click()
      await targetPage.waitForTimeout(500)
      await targetPage.screenshot({
        path: path.join(REPORTS_DIR, 'flow-05-full-workflow.png'),
        fullPage: true,
      })
      console.log('📸 Screenshot: flow-05-full-workflow.png')
    }

    console.log('\n✅ Test complete!')
    console.log(`\n📁 Screenshots saved to ${REPORTS_DIR}/`)

    if (foundDeeplink) {
      console.log('\n🎉 SUCCESS: Deeplink displayed to user!')
    } else {
      console.log('\n⚠️ The deeplink prompt may not be rendering correctly in the UI.')
      console.log('   API is returning correct data but frontend may need adjustments.')
    }

    browser.close()

  } catch (error) {
    console.error('Error:', error)
  }
}

testFullUIFlow().catch(console.error)

export {}
