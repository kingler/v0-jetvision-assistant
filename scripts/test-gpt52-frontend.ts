/**
 * Frontend GPT-5.2 Chat Test Script
 *
 * Opens browser, waits for you to sign in, then tests the chat.
 * Run with: npx tsx scripts/test-gpt52-frontend.ts
 */

import { chromium } from 'playwright'

async function testFrontend() {
  console.log('🚀 Starting Frontend GPT-5.2 Chat Test...\n')

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
  })

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  })

  const page = await context.newPage()

  try {
    // Navigate to app
    console.log('📍 Opening http://localhost:3000...')
    await page.goto('http://localhost:3000', { timeout: 30000 })

    // Check if auth is needed
    const needsAuth = await page.locator('text="Sign in"').count() > 0

    if (needsAuth) {
      console.log('\n⚠️  Please sign in using the browser window.')
      console.log('   Waiting for authentication (up to 2 minutes)...\n')

      // Wait for chat textarea to appear (means we're authenticated)
      await page.waitForSelector('textarea', { timeout: 120000 })
      console.log('✅ Authenticated!\n')
    }

    // Wait for page to stabilize
    await page.waitForTimeout(2000)

    // Screenshot: Initial authenticated state
    await page.screenshot({
      path: 'reports/ux-analysis/frontend-01-initial.png',
      fullPage: true
    })
    console.log('📸 Screenshot: frontend-01-initial.png')

    // Find and fill chat input
    const chatInput = page.locator('textarea').first()
    const flightRequest = 'I need a private jet from New York to Miami for 4 passengers next Friday'

    console.log(`\n✍️  Typing: "${flightRequest}"`)
    await chatInput.click()
    await chatInput.fill(flightRequest)

    // Screenshot: Message typed
    await page.screenshot({
      path: 'reports/ux-analysis/frontend-02-message-typed.png',
      fullPage: true
    })
    console.log('📸 Screenshot: frontend-02-message-typed.png')

    // Find and click send button
    console.log('\n📤 Clicking send button...')
    const sendButton = page.locator('button:has(svg)').last()
    await sendButton.click()

    // Wait a moment for thinking indicator
    await page.waitForTimeout(500)

    // Screenshot: Thinking state
    await page.screenshot({
      path: 'reports/ux-analysis/frontend-03-thinking.png',
      fullPage: true
    })
    console.log('📸 Screenshot: frontend-03-thinking.png')

    // Wait for streaming to start
    console.log('\n⏳ Waiting for GPT-5.2 streaming response...')

    // Take screenshots during streaming
    for (let i = 1; i <= 5; i++) {
      await page.waitForTimeout(2000)
      await page.screenshot({
        path: `reports/ux-analysis/frontend-04-streaming-${i}.png`,
        fullPage: true
      })
      console.log(`📸 Screenshot: frontend-04-streaming-${i}.png`)
    }

    // Wait for response to complete (look for no more "Thinking...")
    try {
      await page.waitForFunction(() => {
        const thinking = document.querySelector('text*="Thinking..."')
        return !thinking
      }, { timeout: 30000 })
    } catch {
      // May already be done
    }

    // Final screenshot
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: 'reports/ux-analysis/frontend-05-response-complete.png',
      fullPage: true
    })
    console.log('📸 Screenshot: frontend-05-response-complete.png')

    console.log('\n✅ Test complete! Keeping browser open for 30 seconds...')
    await page.waitForTimeout(30000)

  } catch (error) {
    console.error('\n❌ Error:', error)
    await page.screenshot({
      path: 'reports/ux-analysis/frontend-error.png',
      fullPage: true
    })
  } finally {
    await browser.close()
  }
}

testFrontend().catch(console.error)
