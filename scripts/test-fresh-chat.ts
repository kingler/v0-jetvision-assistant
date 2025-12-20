/**
 * Test Fresh Chat - Starts a new chat from landing page
 */
import { chromium, type Page, type Browser } from 'playwright'

const CHROME_DEBUG_URL = 'http://localhost:9222'

async function runTest() {
  console.log('🔌 Connecting to Chrome...')
  const browser = await chromium.connectOverCDP(CHROME_DEBUG_URL)
  const contexts = browser.contexts()
  const page = contexts[0].pages()[0]
  
  // Click "New" button to start fresh
  console.log('📤 Starting fresh chat...')
  const newButton = page.locator('button:has-text("New")')
  if (await newButton.count() > 0) {
    await newButton.click()
    await page.waitForTimeout(1000)
    console.log('✅ Clicked New button')
  }
  
  // Check if we're on landing page
  const isLanding = await page.locator('text="How can I help you today?"').count() > 0
  console.log(`  - On landing page: ${isLanding}`)
  
  if (!isLanding) {
    console.log('⚠️ Not on landing page, navigating...')
    await page.goto('http://localhost:3000')
    await page.waitForTimeout(2000)
  }
  
  // Type message and submit
  const input = page.locator('input[placeholder*="Type your message"]').first()
  await input.fill('Book a flight from KTEB to KPBI for 6 passengers on February 1st')
  await page.waitForTimeout(300)
  await input.press('Enter')
  console.log('✅ Message submitted')
  
  // Wait for transition
  await page.waitForTimeout(3000)
  
  // Take screenshot
  await page.screenshot({ path: 'screenshots/fresh-chat-test.png', fullPage: true })
  console.log('📸 Screenshot saved: screenshots/fresh-chat-test.png')
  
  // Check for workflow
  const workflowSteps = await page.locator('text="Understanding Request"').count()
  const workflowCard = await page.locator('text="Flight Search Progress"').count()
  console.log(`  - Workflow steps visible: ${workflowSteps > 0}`)
  console.log(`  - Workflow card visible: ${workflowCard > 0}`)
  
  console.log('🔚 Test complete')
}

runTest().catch(console.error)
export {}
