/**
 * Test Avinode Workflow Complete
 *
 * Tests the full workflow from flight request to deeplink display.
 * Uses CDP to connect to existing Chrome instance.
 *
 * Usage: npx tsx scripts/test-avinode-workflow-complete.ts
 */

import { chromium } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

const REPORTS_DIR = 'reports/ux-analysis'
const CDP_ENDPOINT = 'http://localhost:9222'

async function testAvinodeWorkflow() {
  console.log('\n🛩️  Testing Avinode Complete Workflow\n')

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
        if (page.url().includes('localhost:3000') && !page.url().includes('blob:')) {
          targetPage = page
          break
        }
      }
      if (targetPage) break
    }

    if (!targetPage) {
      console.log('❌ No page found with localhost:3000')
      console.log('   Please open http://localhost:3000 in Chrome first')
      await browser.close()
      return
    }

    console.log(`📍 Found target page: ${targetPage.url()}`)

    // Take initial screenshot
    await targetPage.screenshot({
      path: path.join(REPORTS_DIR, 'workflow-01-initial.png'),
      fullPage: true,
    })
    console.log('📸 Initial state captured')

    // Find the chat input
    const chatInput = targetPage.locator(
      'input[placeholder*="Type"], textarea[placeholder*="Type"], input[placeholder*="message"], textarea[placeholder*="message"]'
    ).first()

    if (!await chatInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('❌ Could not find chat input')
      await browser.close()
      return
    }

    // Type a specific flight request that should trigger Avinode tools
    const flightRequest = 'I need a flight from Teterboro (KTEB) to Van Nuys (KVNY) for 4 passengers on January 15, 2025'
    console.log(`\n📝 Typing flight request: "${flightRequest}"`)

    await chatInput.fill(flightRequest)
    await targetPage.screenshot({
      path: path.join(REPORTS_DIR, 'workflow-02-request-typed.png'),
      fullPage: true,
    })

    // Submit the request
    const sendButton = targetPage.locator('button[type="submit"], button:has(svg)').first()
    await sendButton.click()
    console.log('📤 Request submitted')

    // Wait for API response
    console.log('\n⏳ Waiting for response...')

    // Monitor for workflow status changes
    for (let i = 0; i < 30; i++) {
      await targetPage.waitForTimeout(2000)

      // Take progress screenshot
      await targetPage.screenshot({
        path: path.join(REPORTS_DIR, `workflow-03-progress-${i + 1}.png`),
        fullPage: true,
      })

      // Check for deeplink prompt
      const deepLinkButton = await targetPage.locator('text=Open in Avinode Marketplace').isVisible({ timeout: 500 }).catch(() => false)
      if (deepLinkButton) {
        console.log('\n✅ DeepLink prompt detected!')
        await targetPage.screenshot({
          path: path.join(REPORTS_DIR, 'workflow-04-deeplink-visible.png'),
          fullPage: true,
        })
        break
      }

      // Check for workflow status
      const workflowStatus = await targetPage.locator('[class*="workflow"], .step-indicator, [class*="step"]').textContent().catch(() => null)
      if (workflowStatus) {
        console.log(`   Workflow status: ${workflowStatus.slice(0, 100)}...`)
      }

      // Check for any agent response
      const agentResponse = await targetPage.locator('[class*="agent"], [data-role="assistant"]').last().textContent().catch(() => null)
      if (agentResponse && agentResponse.length > 50) {
        console.log(`   Agent response preview: ${agentResponse.slice(0, 100)}...`)
      }
    }

    // Final screenshots
    await targetPage.screenshot({
      path: path.join(REPORTS_DIR, 'workflow-05-final.png'),
      fullPage: true,
    })
    console.log('📸 Final state captured')

    // Check for the DeepLinkPrompt component
    const deepLinkCard = await targetPage.locator('[class*="Card"], .card').filter({
      hasText: 'Your request has been created'
    }).first()

    if (await deepLinkCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('\n✅ DeepLinkPrompt component is visible!')

      // Capture specific deeplink card
      await deepLinkCard.screenshot({
        path: path.join(REPORTS_DIR, 'workflow-06-deeplink-card.png'),
      })
      console.log('📸 DeepLink card captured')

      // Get the link URL
      const avinodeLink = await targetPage.locator('a[href*="avinode"]').getAttribute('href')
      console.log(`🔗 Deep link URL: ${avinodeLink}`)
    } else {
      console.log('\n⚠️  DeepLinkPrompt component not found')

      // Get all visible text for debugging
      const allText = await targetPage.locator('main').textContent().catch(() => '')
      console.log(`\nPage content preview:\n${allText?.slice(0, 500)}`)
    }

    console.log('\n✅ Workflow test complete!')
    console.log('\nScreenshots saved to reports/ux-analysis/:')
    console.log('  - workflow-01-initial.png')
    console.log('  - workflow-02-request-typed.png')
    console.log('  - workflow-03-progress-*.png')
    console.log('  - workflow-04-deeplink-visible.png (if found)')
    console.log('  - workflow-05-final.png')
    console.log('  - workflow-06-deeplink-card.png (if found)')

    browser.close()

  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      console.log('❌ Chrome not connected.')
      console.log('   Please start Chrome with: open -a "Google Chrome" --args --remote-debugging-port=9222')
    } else {
      console.error('Error:', error)
    }
  }
}

testAvinodeWorkflow().catch(console.error)

export {}
