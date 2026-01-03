/**
 * Test with hard refresh and console logging attached before page load
 */
import { chromium } from 'playwright'

async function testWithHardRefresh() {
  console.log('Connecting to Chrome...')

  const browser = await chromium.connectOverCDP('http://localhost:9222')
  const context = browser.contexts()[0]

  if (!context) {
    console.log('No browser context found')
    await browser.close()
    return
  }

  // Create a NEW page to ensure fresh JS
  console.log('Creating new page...')
  const page = await context.newPage()

  // Attach console listener BEFORE navigating
  page.on('console', msg => {
    const text = msg.text()
    // Show all logs that might be relevant
    if (text.includes('Chat') || text.includes('Page') || text.includes('trip') ||
        text.includes('status') || text.includes('Update') || text.includes('SSE')) {
      console.log(`[BROWSER] ${msg.type()}: ${text}`)
    }
  })

  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.message}`)
  })

  console.log('Navigating to app...')
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  console.log('Current URL:', page.url())

  // Check if we're on the landing page
  const title = await page.title()
  console.log('Page title:', title)

  // Start a chat
  console.log('Looking for input field...')
  const input = page.locator('input[placeholder*="Type your message"]')
  const inputExists = await input.count()
  console.log('Input field exists:', inputExists > 0)

  if (inputExists === 0) {
    // Maybe we need to start a new chat
    const newChatBtn = page.locator('button:has-text("New")')
    const btnExists = await newChatBtn.count()
    console.log('New chat button exists:', btnExists > 0)

    if (btnExists > 0) {
      await newChatBtn.click()
      await page.waitForTimeout(1000)
    }
  }

  // Try again
  const inputAfter = page.locator('input[placeholder*="Type your message"], textarea[placeholder*="Type your message"], textarea[placeholder*="type a message"]')
  const inputAfterExists = await inputAfter.count()
  console.log('Input field after click:', inputAfterExists > 0)

  if (inputAfterExists > 0) {
    await inputAfter.first().fill('I need a flight from KTEB to KVNY for 4 passengers on January 20, 2025')

    console.log('Submitting message...')
    const submitBtn = page.locator('button[type="submit"]')
    await submitBtn.click()

    console.log('Waiting for response (30s)...')
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(5000)
      console.log(`... ${(i+1)*5}s elapsed`)
    }
  }

  // Check result
  console.log('\n=== Final State Check ===')
  const pageText = await page.evaluate(() => document.body.innerText)
  console.log('Has "Awaiting Selection":', pageText.includes('Awaiting Selection'))
  console.log('Has "Open in Avinode":', pageText.includes('Open in Avinode'))

  // Take screenshot
  await page.screenshot({ path: 'screenshots/hard-refresh-test.png', fullPage: true })
  console.log('Screenshot saved')

  await page.close()
  await browser.close()
}

testWithHardRefresh().catch(console.error)

export {}
