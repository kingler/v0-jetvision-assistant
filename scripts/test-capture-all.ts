/**
 * Capture ALL console logs without any filtering
 */
import { chromium } from 'playwright'

async function testCaptureAll() {
  console.log('Connecting to Chrome...')

  const browser = await chromium.connectOverCDP('http://localhost:9222')
  const context = browser.contexts()[0]

  if (!context) {
    console.log('No browser context found')
    await browser.close()
    return
  }

  // Create a NEW page
  const page = await context.newPage()

  // Attach console listener BEFORE navigating - NO FILTER
  let logCount = 0
  page.on('console', msg => {
    logCount++
    console.log(`[${logCount}] ${msg.type()}: ${msg.text().substring(0, 200)}`)
  })

  console.log('Navigating to app...')
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)

  console.log(`\nCaptured ${logCount} logs during page load\n`)

  // Start a chat
  const input = page.locator('input[placeholder*="Type your message"]')
  await input.fill('I need a flight from KTEB to KVNY for 4 passengers on January 20, 2025')

  const startLogCount = logCount
  console.log('Submitting message...')
  await page.click('button[type="submit"]')

  console.log('Waiting for response (20s)...')
  await page.waitForTimeout(20000)

  console.log(`\nCaptured ${logCount - startLogCount} logs during API call\n`)

  // Check result
  const pageText = await page.evaluate(() => document.body.innerText)
  console.log('Has "Awaiting Selection":', pageText.includes('Awaiting Selection'))
  console.log('Has "Open in Avinode":', pageText.includes('Open in Avinode'))

  await page.close()
  await browser.close()
}

testCaptureAll().catch(console.error)

export {}
