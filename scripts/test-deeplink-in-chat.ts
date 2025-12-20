/**
 * Test DeepLink in Chat View
 *
 * Navigates to the chat view and tests the deeplink workflow.
 * Uses CDP to connect to existing Chrome instance.
 *
 * Usage: npx tsx scripts/test-deeplink-in-chat.ts
 */

import { chromium } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

const REPORTS_DIR = 'reports/ux-analysis'
const CDP_ENDPOINT = 'http://localhost:9222'

async function testDeepLinkInChat() {
  console.log('\n🛩️  Testing DeepLink in Chat View\n')

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

    // Take initial screenshot
    await targetPage.screenshot({
      path: path.join(REPORTS_DIR, 'deeplink-01-initial.png'),
      fullPage: true,
    })

    // Try to navigate to chat view - click the back button or Flight Request
    const backButton = targetPage.locator('button:has-text("<"), [aria-label*="back"], button:has(svg):near(h1)').first()
    const flightRequest = targetPage.locator('text=Flight Request #1').first()

    if (await backButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('⬅️ Clicking back button to go to chat...')
      await backButton.click()
      await targetPage.waitForTimeout(1500)
    } else if (await flightRequest.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('📋 Clicking Flight Request #1 to open chat...')
      await flightRequest.click()
      await targetPage.waitForTimeout(1500)
    }

    await targetPage.screenshot({
      path: path.join(REPORTS_DIR, 'deeplink-02-after-navigation.png'),
      fullPage: true,
    })

    // Now look for the chat input
    const chatInput = targetPage.locator(
      'input[placeholder*="Type"], textarea[placeholder*="Type"], input[placeholder*="message"], textarea[placeholder*="message"]'
    ).first()

    if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('✅ Chat input found!')

      // Send a new flight request with specific details to trigger tools
      const flightRequest = 'Please search for flights from KTEB to KVNY for 4 passengers on January 20, 2025 and create an RFP'
      console.log(`\n📝 Sending: "${flightRequest}"`)

      await chatInput.fill(flightRequest)

      await targetPage.screenshot({
        path: path.join(REPORTS_DIR, 'deeplink-03-message-typed.png'),
        fullPage: true,
      })

      // Find and click send button
      const sendButton = targetPage.locator('button[type="submit"], button:has(svg.lucide-send), button:has-text("Send")').first()
      if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await sendButton.click()
        console.log('📤 Message sent!')
      } else {
        // Try pressing Enter
        await chatInput.press('Enter')
        console.log('📤 Message sent via Enter key!')
      }

      // Wait for response and monitor for deeplink
      console.log('\n⏳ Waiting for API response with tool calls...')

      for (let i = 0; i < 20; i++) {
        await targetPage.waitForTimeout(3000)

        await targetPage.screenshot({
          path: path.join(REPORTS_DIR, `deeplink-04-progress-${String(i + 1).padStart(2, '0')}.png`),
          fullPage: true,
        })

        // Check for deeplink button specifically
        const deepLinkButton = await targetPage.locator('a:has-text("Open in Avinode Marketplace"), button:has-text("Open in Avinode")').isVisible({ timeout: 500 }).catch(() => false)

        if (deepLinkButton) {
          console.log('\n🎉 SUCCESS! DeepLink button is visible!')

          await targetPage.screenshot({
            path: path.join(REPORTS_DIR, 'deeplink-05-success.png'),
            fullPage: true,
          })

          // Get the link
          const linkHref = await targetPage.locator('a:has-text("Open in Avinode Marketplace")').getAttribute('href')
          console.log(`🔗 Deep link URL: ${linkHref}`)

          // Also capture just the deeplink card
          const deepLinkCard = await targetPage.locator('[class*="Card"]:has-text("Your request has been created")').first()
          if (await deepLinkCard.isVisible({ timeout: 1000 }).catch(() => false)) {
            await deepLinkCard.screenshot({
              path: path.join(REPORTS_DIR, 'deeplink-06-card-closeup.png'),
            })
            console.log('📸 DeepLink card close-up captured')
          }

          break
        }

        // Check for copy link button
        const copyButton = await targetPage.locator('button:has-text("Copy Link")').isVisible({ timeout: 500 }).catch(() => false)
        if (copyButton) {
          console.log('\n🎉 SUCCESS! Copy Link button is visible!')
          break
        }

        // Log any visible agent messages
        const agentMessages = await targetPage.locator('[class*="agent"], [data-role="assistant"]').allTextContents()
        if (agentMessages.length > 0) {
          const lastMsg = agentMessages[agentMessages.length - 1]
          console.log(`   Agent says: ${lastMsg.slice(0, 100)}...`)
        }

        // Check workflow status
        const workflowSteps = await targetPage.locator('[class*="step"], [class*="Step"]').allTextContents()
        const completedSteps = workflowSteps.filter(s => s.includes('completed') || s.includes('✓')).length
        console.log(`   Progress check ${i + 1}: ${completedSteps} steps completed`)
      }

    } else {
      console.log('⚠️ Chat input not visible. May need to click "New" to start a new chat.')

      // Try clicking New button
      const newButton = targetPage.locator('button:has-text("New")').first()
      if (await newButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('📝 Clicking "New" to start a new chat...')
        await newButton.click()
        await targetPage.waitForTimeout(2000)

        await targetPage.screenshot({
          path: path.join(REPORTS_DIR, 'deeplink-03-new-chat.png'),
          fullPage: true,
        })

        // Now try to find the input again
        if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log('✅ Chat input now visible after clicking New')
        }
      }
    }

    // Final screenshot
    await targetPage.screenshot({
      path: path.join(REPORTS_DIR, 'deeplink-final.png'),
      fullPage: true,
    })

    console.log('\n✅ Test complete!')
    console.log('\nScreenshots saved to reports/ux-analysis/')

    browser.close()

  } catch (error) {
    console.error('Error:', error)
  }
}

testDeepLinkInChat().catch(console.error)

export {}
