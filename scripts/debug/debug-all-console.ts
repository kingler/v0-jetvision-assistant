/**
 * Debug all console output - no filtering
 */
import { chromium } from 'playwright'

async function debugAllConsole() {
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

  // Set up console listener - capture ALL logs
  console.log('\n=== Starting Console Capture ===')
  page.on('console', msg => {
    console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`)
  })

  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.message}`)
  })

  console.log('Starting new chat...')

  // Click "+ New" to start fresh
  await page.click('button:has-text("New")')
  await page.waitForTimeout(1000)

  // Type and submit
  const input = page.locator('input[placeholder*="Type your message"]')
  await input.fill('I need a flight from KTEB to KVNY for 4 passengers on January 20, 2025')

  console.log('Submitting message...')
  await page.click('button[type="submit"]')

  console.log('Waiting 45 seconds for response...')

  // Wait for response in chunks to show progress
  for (let i = 0; i < 9; i++) {
    await page.waitForTimeout(5000)
    console.log(`... ${(i+1)*5} seconds elapsed`)
  }

  console.log('\n=== Page Text Check ===')
  const pageText = await page.evaluate(() => document.body.innerText)
  console.log('Has "Awaiting Selection":', pageText.includes('Awaiting Selection'))
  console.log('Has "Step 3":', pageText.includes('Step 3'))
  console.log('Has "Open in Avinode":', pageText.includes('Open in Avinode'))
  console.log('Has "marketplace.avinode":', pageText.includes('marketplace.avinode'))
  console.log('Has "requesting_quotes":', pageText.includes('requesting_quotes'))

  // Take screenshot
  await page.screenshot({ path: 'screenshots/debug-all-console.png', fullPage: true })
  console.log('\nScreenshot saved')

  await browser.close()
}

debugAllConsole().catch(console.error)

export {}
