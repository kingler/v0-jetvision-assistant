/**
 * Test the full flow: Landing page -> Submit -> API call -> Deep link displayed
 */
import { chromium } from 'playwright'

async function testFullFlow() {
  console.log('Connecting to Chrome...')

  const browser = await chromium.connectOverCDP('http://localhost:9222')
  const context = browser.contexts()[0]

  if (!context) {
    console.log('No browser context found')
    await browser.close()
    return
  }

  // Create a NEW page to ensure fresh JS
  const page = await context.newPage()

  // Set up console listener BEFORE navigating
  page.on('console', msg => {
    const text = msg.text()
    if (text.includes('[Chat]') || text.includes('[Page]') || text.includes('Triggering')) {
      console.log(`[BROWSER] ${msg.type()}: ${text}`)
    }
  })

  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.message}`)
  })

  console.log('Navigating to app (landing page)...')
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  // Verify we're on landing page
  const landingInput = page.locator('input[placeholder*="start a new chat"]')
  const landingInputExists = await landingInput.count()
  console.log('On landing page:', landingInputExists > 0)

  if (landingInputExists === 0) {
    console.log('Not on landing page, trying to find any input...')
    const anyInput = await page.locator('input, textarea').first().getAttribute('placeholder')
    console.log('Found input with placeholder:', anyInput)
  }

  // Fill the landing page input
  console.log('Filling message...')
  await landingInput.fill('I need a flight from KTEB to KVNY for 4 passengers on January 20, 2025')

  // Submit
  console.log('Submitting...')
  await page.click('button[type="submit"]')

  console.log('Waiting for API response (45 seconds)...')
  for (let i = 0; i < 9; i++) {
    await page.waitForTimeout(5000)
    console.log(`... ${(i+1)*5}s elapsed`)

    // Check if deep link appeared
    const hasDeepLink = await page.locator('text=Open in Avinode').count()
    if (hasDeepLink > 0) {
      console.log('✅ Deep link appeared!')
      break
    }
  }

  // Final checks
  console.log('\n=== Final State Check ===')
  const pageText = await page.evaluate(() => document.body.innerText)
  console.log('Has "has been set up":', pageText.includes('has been set up'))
  console.log('Has "Open in Avinode":', pageText.includes('Open in Avinode'))
  console.log('Has "marketplace.avinode":', pageText.includes('marketplace.avinode'))
  console.log('Has "atrip-":', pageText.includes('atrip-'))
  console.log('Has "Awaiting Selection":', pageText.includes('Awaiting Selection'))

  // Count messages
  const agentMessages = await page.locator('[data-testid="agent-message"]').count()
  console.log('Number of agent messages:', agentMessages)

  // Take screenshot
  await page.screenshot({ path: 'screenshots/full-flow-test.png', fullPage: true })
  console.log('\nScreenshot saved to screenshots/full-flow-test.png')

  await page.close()
  await browser.close()
}

testFullFlow().catch(console.error)

export {}
