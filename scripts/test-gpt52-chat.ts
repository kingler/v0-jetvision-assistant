/**
 * Interactive GPT-5.2 Chat Test Script
 *
 * This script tests the chat functionality by:
 * 1. Opening a browser to the app
 * 2. Waiting for user to authenticate (or using existing session)
 * 3. Submitting a flight request
 * 4. Capturing the streaming GPT-5.2 response
 *
 * Run with: npx tsx scripts/test-gpt52-chat.ts
 */

import { chromium, Browser, Page } from 'playwright'

async function testGPT52Chat() {
  console.log('🚀 Starting GPT-5.2 Chat Test...\n')

  let browser: Browser | null = null

  try {
    // Launch browser in headed mode so user can see and authenticate
    browser = await chromium.launch({
      headless: false,
      slowMo: 100, // Slow down for visibility
    })

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    })

    const page = await context.newPage()

    // Navigate to the app
    console.log('📍 Navigating to http://localhost:3000...')
    await page.goto('http://localhost:3000', { timeout: 30000 })

    // Check if we're on the sign-in page
    const isSignInPage = await page.locator('text="Sign in"').count() > 0

    if (isSignInPage) {
      console.log('\n⚠️  Authentication Required!')
      console.log('👉 Please sign in using the browser window...')
      console.log('   (Waiting up to 60 seconds for authentication)\n')

      // Wait for user to authenticate - look for chat input to appear
      try {
        await page.waitForSelector('textarea, input[type="text"]', {
          timeout: 60000,
          state: 'visible'
        })
        console.log('✅ Authentication successful!\n')
      } catch {
        console.log('❌ Authentication timeout - please try again')
        return
      }
    }

    // Wait a moment for the page to fully load
    await page.waitForTimeout(2000)

    // Take screenshot of initial state
    await page.screenshot({
      path: 'reports/ux-analysis/gpt52-test-initial.png',
      fullPage: true
    })
    console.log('📸 Screenshot saved: gpt52-test-initial.png')

    // Find the chat input
    console.log('\n🔍 Looking for chat input field...')
    const chatInput = page.locator('textarea').first()

    const inputVisible = await chatInput.isVisible().catch(() => false)
    if (!inputVisible) {
      console.log('❌ Chat input not found - may need authentication')
      await page.screenshot({
        path: 'reports/ux-analysis/gpt52-test-no-input.png',
        fullPage: true
      })
      return
    }

    console.log('✅ Chat input found!')

    // Type the flight request
    const flightRequest = 'I need to book a private jet from New York to Miami for 4 passengers next Friday'
    console.log(`\n✍️  Typing: "${flightRequest}"`)

    await chatInput.click()
    await chatInput.fill(flightRequest)

    // Take screenshot before sending
    await page.screenshot({
      path: 'reports/ux-analysis/gpt52-test-before-send.png',
      fullPage: true
    })
    console.log('📸 Screenshot saved: gpt52-test-before-send.png')

    // Find and click the send button
    console.log('\n📤 Sending message...')
    const sendButton = page.locator('button').filter({ has: page.locator('svg') }).last()
    await sendButton.click()

    // Wait for typing indicator to appear
    console.log('⏳ Waiting for GPT-5.2 response...')

    // Monitor for streaming content
    let responseStarted = false
    let streamingText = ''

    // Check for "Thinking..." indicator
    try {
      await page.waitForSelector('text="Thinking..."', { timeout: 5000 })
      console.log('💭 Agent is thinking...')
      responseStarted = true
    } catch {
      console.log('⚠️  No thinking indicator detected')
    }

    // Take screenshot of thinking state
    await page.screenshot({
      path: 'reports/ux-analysis/gpt52-test-thinking.png',
      fullPage: true
    })
    console.log('📸 Screenshot saved: gpt52-test-thinking.png')

    // Wait for streaming response (up to 30 seconds)
    console.log('\n📥 Capturing streaming response...')

    const startTime = Date.now()
    const maxWait = 30000 // 30 seconds

    while (Date.now() - startTime < maxWait) {
      // Check for agent response content
      const messages = await page.locator('.bg-gray-100, .bg-gray-800').allTextContents()

      // Find the latest agent message
      for (const msg of messages) {
        if (msg.includes('Jetvision') && msg.length > 100 && !msg.includes('Thinking...')) {
          streamingText = msg
          console.log('\n✅ Response received!')
          break
        }
      }

      if (streamingText) break

      await page.waitForTimeout(500)
    }

    // Take final screenshot
    await page.screenshot({
      path: 'reports/ux-analysis/gpt52-test-response.png',
      fullPage: true
    })
    console.log('📸 Screenshot saved: gpt52-test-response.png')

    // Display the response
    if (streamingText) {
      console.log('\n' + '='.repeat(60))
      console.log('GPT-5.2 RESPONSE:')
      console.log('='.repeat(60))
      console.log(streamingText.substring(0, 500) + (streamingText.length > 500 ? '...' : ''))
      console.log('='.repeat(60))
    } else {
      console.log('\n⚠️  No response captured within timeout')
      console.log('   Check the screenshots for the current state')
    }

    // Keep browser open for a few seconds to see the result
    console.log('\n⏳ Keeping browser open for 10 seconds...')
    await page.waitForTimeout(10000)

    console.log('\n✅ Test completed!')

  } catch (error) {
    console.error('\n❌ Test failed:', error)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

// Run the test
testGPT52Chat().catch(console.error)
