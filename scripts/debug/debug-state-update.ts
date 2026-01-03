/**
 * Debug state update flow - watch console logs
 */
import { chromium } from 'playwright'

async function debugStateUpdate() {
  console.log('Connecting to Chrome...')

  const browser = await chromium.connectOverCDP('http://localhost:9222')
  const context = browser.contexts()[0]

  if (!context) {
    console.log('No browser context found')
    await browser.close()
    return
  }

  const pages = context.pages()
  let page = pages.find(p => p.url().includes('localhost:3000'))

  if (!page) {
    page = await context.newPage()
  }

  // Force refresh to get updated code
  console.log('Refreshing page to load updated code...')
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  // Set up console listener
  page.on('console', msg => {
    const text = msg.text()
    // Filter for our debug logs
    if (text.includes('[Chat]') || text.includes('[Page]') || text.includes('trip')) {
      console.log(`[BROWSER] ${text}`)
    }
  })

  console.log('Starting new chat...')

  // Click "+ New" to start fresh
  await page.click('button:has-text("New")')
  await page.waitForTimeout(1000)

  // Type and submit
  const input = page.locator('input[placeholder*="Type your message"]')
  await input.fill('I need a flight from KTEB to KVNY for 4 passengers on January 20, 2025')
  await page.click('button[type="submit"]')

  console.log('Message submitted, waiting for response and console logs...')

  // Wait for response
  await page.waitForTimeout(30000)

  // Check final state
  const pageText = await page.evaluate(() => document.body.innerText)
  console.log('\n=== Page Text Check ===')
  console.log('Has "Awaiting Selection":', pageText.includes('Awaiting Selection'))
  console.log('Has "Open in Avinode":', pageText.includes('Open in Avinode'))
  console.log('Has "marketplace.avinode":', pageText.includes('marketplace.avinode'))
  console.log('Has "atrip-":', pageText.includes('atrip-'))

  // Take screenshot
  await page.screenshot({ path: 'screenshots/debug-state.png', fullPage: true })
  console.log('\nScreenshot saved to screenshots/debug-state.png')

  await browser.close()
}

debugStateUpdate().catch(console.error)

export {}
