/**
 * Debug message state after API call
 */
import { chromium } from 'playwright'

async function debugMessageState() {
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

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  // Submit a message
  const input = page.locator('input[placeholder*="Type your message"]')
  await input.fill('I need a flight from KTEB to KVNY for 4 passengers on January 20, 2025')
  await page.click('button[type="submit"]')

  console.log('Waiting 20 seconds for response...')
  await page.waitForTimeout(20000)

  // Count agent messages
  const agentMessages = await page.locator('[data-testid="agent-message"]').count()
  console.log('\n=== Message Analysis ===')
  console.log('Number of agent messages:', agentMessages)

  // Check for deep link prompts
  const deepLinkPrompts = await page.locator('.mt-2:has(button:has-text("Open in Avinode"))').count()
  console.log('Number of deep link prompts:', deepLinkPrompts)

  // Check what's visible on page
  const pageText = await page.evaluate(() => document.body.innerText)
  console.log('\nHas "Thank you for reaching out":', pageText.includes('Thank you for reaching out'))
  console.log('Has "has been set up":', pageText.includes('has been set up'))
  console.log('Has "Open in Avinode":', pageText.includes('Open in Avinode'))
  console.log('Has "atrip-":', pageText.includes('atrip-'))

  // Get workflow status element text
  const workflowStatus = await page.locator('text=/Awaiting Selection|Step 3/i').first().textContent().catch(() => 'not found')
  console.log('Workflow status text:', workflowStatus)

  // Take screenshot
  await page.screenshot({ path: 'screenshots/message-debug.png', fullPage: true })
  console.log('\nScreenshot saved')

  await page.close()
  await browser.close()
}

debugMessageState().catch(console.error)

export {}
