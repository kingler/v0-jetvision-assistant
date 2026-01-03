/**
 * Test Send RFP Request
 *
 * Sends a flight request and waits for the deeplink to appear.
 *
 * Usage: npx tsx scripts/test-send-rfp-request.ts
 */

import { chromium } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

const REPORTS_DIR = 'reports/ux-analysis'
const CDP_ENDPOINT = 'http://localhost:9222'

async function testSendRFPRequest() {
  console.log('\n🛩️  Testing Send RFP Request\n')

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

    // Find the chat input
    const chatInput = targetPage.locator('input[placeholder*="Type your message"], textarea[placeholder*="Type"]').first()

    if (!await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Try clicking New button first
      const newButton = targetPage.locator('button:has-text("New")').first()
      if (await newButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('📝 Clicking "New" to start a new chat...')
        await newButton.click()
        await targetPage.waitForTimeout(1500)
      }
    }

    if (!await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('❌ Chat input still not visible')
      await targetPage.screenshot({
        path: path.join(REPORTS_DIR, 'rfp-error-no-input.png'),
        fullPage: true,
      })
      await browser.close()
      return
    }

    console.log('✅ Chat input found!')

    // Take screenshot before sending
    await targetPage.screenshot({
      path: path.join(REPORTS_DIR, 'rfp-01-before-send.png'),
      fullPage: true,
    })

    // Type a specific request that should trigger Avinode tools
    const message = 'I need to book a flight from Teterboro (KTEB) to Van Nuys (KVNY) for 4 passengers on January 20, 2025. Please search for available aircraft and create an RFP.'
    console.log(`\n📝 Typing: "${message.slice(0, 80)}..."`)

    await chatInput.fill(message)
    await targetPage.waitForTimeout(500)

    await targetPage.screenshot({
      path: path.join(REPORTS_DIR, 'rfp-02-message-typed.png'),
      fullPage: true,
    })

    // Click send button
    const sendButton = targetPage.locator('button[type="submit"], button:has(svg.lucide-send)').first()
    if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('📤 Clicking send button...')
      await sendButton.click()
    } else {
      console.log('📤 Pressing Enter to send...')
      await chatInput.press('Enter')
    }

    console.log('\n⏳ Waiting for API response...')
    console.log('   (This may take 30-60 seconds as OpenAI processes the request)\n')

    // Wait for response
    let foundDeepLink = false
    for (let i = 0; i < 30; i++) {
      await targetPage.waitForTimeout(3000)

      // Take progress screenshot every 3 iterations
      if (i % 3 === 0) {
        await targetPage.screenshot({
          path: path.join(REPORTS_DIR, `rfp-03-progress-${String(i + 1).padStart(2, '0')}.png`),
          fullPage: true,
        })
      }

      // Check for deeplink elements
      const deepLinkVisible = await targetPage.locator('a:has-text("Open in Avinode"), text=Open in Avinode Marketplace').isVisible({ timeout: 500 }).catch(() => false)
      const copyLinkVisible = await targetPage.locator('button:has-text("Copy Link")').isVisible({ timeout: 500 }).catch(() => false)
      const requestCreatedVisible = await targetPage.locator('text=Your request has been created').isVisible({ timeout: 500 }).catch(() => false)

      if (deepLinkVisible || copyLinkVisible || requestCreatedVisible) {
        console.log('\n🎉 SUCCESS! DeepLink prompt detected!')
        foundDeepLink = true

        await targetPage.screenshot({
          path: path.join(REPORTS_DIR, 'rfp-04-deeplink-success.png'),
          fullPage: true,
        })

        // Get the link if possible
        const linkElement = targetPage.locator('a[href*="avinode"], a[href*="marketplace"]').first()
        if (await linkElement.isVisible({ timeout: 1000 }).catch(() => false)) {
          const href = await linkElement.getAttribute('href')
          console.log(`🔗 Deep Link: ${href}`)
        }

        // Capture the card close-up
        const card = targetPage.locator('[class*="Card"]:has-text("Your request")').first()
        if (await card.isVisible({ timeout: 1000 }).catch(() => false)) {
          await card.screenshot({
            path: path.join(REPORTS_DIR, 'rfp-05-deeplink-card.png'),
          })
          console.log('📸 DeepLink card captured!')
        }

        break
      }

      // Check for loading/processing indicators
      const isTyping = await targetPage.locator('.animate-spin, text=Thinking').isVisible({ timeout: 500 }).catch(() => false)
      if (isTyping) {
        process.stdout.write('.')
      }

      // Check for agent response
      const agentMessages = await targetPage.locator('[class*="bg-gray-100"]').allTextContents()
      if (agentMessages.length > 0) {
        const lastMsg = agentMessages[agentMessages.length - 1]
        if (lastMsg.length > 20 && !lastMsg.includes('Thinking')) {
          console.log(`\n   Agent: ${lastMsg.slice(0, 150)}...`)
        }
      }

      // Check workflow status
      const workflowBadges = await targetPage.locator('[class*="badge"], [class*="Badge"]').allTextContents()
      const statusTexts = workflowBadges.filter(b => b.includes('step') || b.includes('Pending') || b.includes('Ready'))
      if (statusTexts.length > 0) {
        console.log(`   Status: ${statusTexts.join(', ')}`)
      }
    }

    if (!foundDeepLink) {
      console.log('\n⚠️ DeepLink not found after timeout')
      console.log('   The API may not have called the create_rfp tool')
      console.log('   Check that OPENAI_API_KEY is set and valid')
    }

    // Final screenshot
    await targetPage.screenshot({
      path: path.join(REPORTS_DIR, 'rfp-final.png'),
      fullPage: true,
    })

    console.log('\n✅ Test complete!')
    console.log('\nScreenshots saved to reports/ux-analysis/')

    browser.close()

  } catch (error) {
    console.error('Error:', error)
  }
}

testSendRFPRequest().catch(console.error)

export {}
