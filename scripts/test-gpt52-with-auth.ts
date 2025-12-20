/**
 * Test GPT-5.2 Frontend WITH Saved Auth State
 *
 * Prerequisites: Run 'npx tsx scripts/save-auth-state.ts' first
 *
 * Run: npx tsx scripts/test-gpt52-with-auth.ts
 */

import { chromium } from 'playwright'
import * as fs from 'fs'

const AUTH_FILE = '.playwright-auth.json'

async function testWithAuth() {
  console.log('🚀 Testing GPT-5.2 Frontend with Saved Auth\n')

  // Check for auth file
  if (!fs.existsSync(AUTH_FILE)) {
    console.log('❌ No auth state found!')
    console.log('   Run first: npx tsx scripts/save-auth-state.ts')
    return
  }

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
  })

  // Load saved auth state
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    storageState: AUTH_FILE,
  })

  const page = await context.newPage()

  try {
    console.log('📍 Opening http://localhost:3000 with saved auth...')
    await page.goto('http://localhost:3000', { timeout: 30000 })

    // Wait for page to load
    await page.waitForTimeout(2000)

    // Check if we're authenticated
    const hasTextarea = await page.locator('textarea').count() > 0

    if (!hasTextarea) {
      console.log('❌ Auth state expired. Re-run: npx tsx scripts/save-auth-state.ts')
      await page.screenshot({ path: 'reports/ux-analysis/auth-expired.png', fullPage: true })
      return
    }

    console.log('✅ Authenticated!\n')

    // Screenshot 1: Initial state
    await page.screenshot({
      path: 'reports/ux-analysis/gpt52-01-chat-ready.png',
      fullPage: true
    })
    console.log('📸 Screenshot: gpt52-01-chat-ready.png')

    // Find chat input and type message
    const chatInput = page.locator('textarea').first()
    const flightRequest = 'I need a private jet from New York to Miami for 4 passengers next Friday'

    console.log(`\n✍️  Typing flight request...`)
    await chatInput.click()
    await chatInput.fill(flightRequest)

    // Screenshot 2: Message typed
    await page.screenshot({
      path: 'reports/ux-analysis/gpt52-02-message-typed.png',
      fullPage: true
    })
    console.log('📸 Screenshot: gpt52-02-message-typed.png')

    // Click send
    console.log('\n📤 Sending message...')
    const sendButton = page.locator('button:has(svg)').last()
    await sendButton.click()

    // Wait for thinking indicator
    await page.waitForTimeout(300)

    // Screenshot 3: Thinking state
    await page.screenshot({
      path: 'reports/ux-analysis/gpt52-03-thinking.png',
      fullPage: true
    })
    console.log('📸 Screenshot: gpt52-03-thinking.png (Thinking... indicator)')

    // Capture streaming progress
    console.log('\n⏳ Capturing streaming response...')
    for (let i = 1; i <= 6; i++) {
      await page.waitForTimeout(1500)
      await page.screenshot({
        path: `reports/ux-analysis/gpt52-04-streaming-${i}.png`,
        fullPage: true
      })
      console.log(`📸 Screenshot: gpt52-04-streaming-${i}.png`)
    }

    // Wait for complete response
    await page.waitForTimeout(5000)

    // Screenshot 5: Final response
    await page.screenshot({
      path: 'reports/ux-analysis/gpt52-05-response-complete.png',
      fullPage: true
    })
    console.log('📸 Screenshot: gpt52-05-response-complete.png')

    console.log('\n✅ Test complete!')
    console.log('\n📁 Screenshots saved to: reports/ux-analysis/')
    console.log('   - gpt52-01-chat-ready.png')
    console.log('   - gpt52-02-message-typed.png')
    console.log('   - gpt52-03-thinking.png')
    console.log('   - gpt52-04-streaming-*.png')
    console.log('   - gpt52-05-response-complete.png')

    console.log('\n⏳ Keeping browser open for 15 seconds...')
    await page.waitForTimeout(15000)

  } catch (error) {
    console.error('\n❌ Error:', error)
    await page.screenshot({
      path: 'reports/ux-analysis/gpt52-error.png',
      fullPage: true
    })
  } finally {
    await browser.close()
  }
}

testWithAuth().catch(console.error)
