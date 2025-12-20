/**
 * View and analyze the current chat thread state
 */
import { chromium } from 'playwright'

const CHROME_DEBUG_URL = 'http://localhost:9222'

async function viewChatThread() {
  console.log('🔌 Connecting to Chrome...')
  const browser = await chromium.connectOverCDP(CHROME_DEBUG_URL)
  const contexts = browser.contexts()
  const page = contexts[0].pages()[0]

  const currentUrl = page.url()
  console.log(`📍 Current URL: ${currentUrl}`)

  // Take screenshot of current state
  await page.screenshot({ path: 'screenshots/chat-thread-view.png', fullPage: true })
  console.log('📸 Screenshot saved: screenshots/chat-thread-view.png')

  // Check page state
  const isLanding = await page.locator('text="How can I help you today?"').count() > 0
  const isChatInterface = await page.locator('text="Flight Request #"').count() > 0

  console.log('\n📊 Page State:')
  console.log(`  - Landing page: ${isLanding}`)
  console.log(`  - Chat interface: ${isChatInterface}`)

  // Count messages
  const userMessages = await page.locator('.rounded-2xl.bg-blue-600').count()
  const agentBadges = await page.locator('text="Jetvision Agent"').count()

  console.log('\n💬 Messages:')
  console.log(`  - User messages (bubbles): ${userMessages}`)
  console.log(`  - Agent messages: ${agentBadges}`)

  // Check workflow visualization
  const workflowCard = await page.locator('text="Flight Search Progress"').count()
  const spinnerCount = await page.locator('.animate-spin').count()

  console.log('\n🔄 Workflow Visualization:')
  console.log(`  - Workflow card visible: ${workflowCard > 0}`)
  console.log(`  - Spinners (in-progress indicators): ${spinnerCount}`)

  // Check individual steps by looking at their icons
  console.log('\n📋 Workflow Steps:')

  // Step 1: Understanding Request
  const step1 = await page.locator('text="Step 1: Understanding Request"').first()
  if (await step1.count() > 0) {
    const step1Row = step1.locator('xpath=ancestor::div[contains(@class, "flex")]').first()
    const hasGreenCheck = await step1Row.locator('svg[class*="text-green"]').count() > 0
    const hasSpinner = await step1Row.locator('.animate-spin').count() > 0
    console.log(`  Step 1 - Understanding Request: ${hasGreenCheck ? '✅ complete' : hasSpinner ? '🔄 in-progress' : '⏳ pending'}`)
  }

  // Step 2: Creating Trip
  const step2 = await page.locator('text="Step 2: Creating Trip"').first()
  if (await step2.count() > 0) {
    const step2Row = step2.locator('xpath=ancestor::div[contains(@class, "flex")]').first()
    const hasGreenCheck = await step2Row.locator('svg[class*="text-green"]').count() > 0
    const hasSpinner = await step2Row.locator('.animate-spin').count() > 0
    console.log(`  Step 2 - Creating Trip: ${hasGreenCheck ? '✅ complete' : hasSpinner ? '🔄 in-progress' : '⏳ pending'}`)
  }

  // Step 3: Awaiting Selection
  const step3 = await page.locator('text="Step 3: Awaiting Selection"').first()
  if (await step3.count() > 0) {
    const step3Row = step3.locator('xpath=ancestor::div[contains(@class, "flex")]').first()
    const hasGreenCheck = await step3Row.locator('svg[class*="text-green"]').count() > 0
    const hasSpinner = await step3Row.locator('.animate-spin').count() > 0
    console.log(`  Step 3 - Awaiting Selection: ${hasGreenCheck ? '✅ complete' : hasSpinner ? '🔄 in-progress' : '⏳ pending'}`)
  }

  // Step 4: Receiving Quotes
  const step4 = await page.locator('text="Step 4: Receiving Quotes"').first()
  if (await step4.count() > 0) {
    const step4Row = step4.locator('xpath=ancestor::div[contains(@class, "flex")]').first()
    const hasGreenCheck = await step4Row.locator('svg[class*="text-green"]').count() > 0
    const hasSpinner = await step4Row.locator('.animate-spin').count() > 0
    console.log(`  Step 4 - Receiving Quotes: ${hasGreenCheck ? '✅ complete' : hasSpinner ? '🔄 in-progress' : '⏳ pending'}`)
  }

  // Step 5: Generate Proposal
  const step5 = await page.locator('text="Step 5: Generate Proposal"').first()
  if (await step5.count() > 0) {
    const step5Row = step5.locator('xpath=ancestor::div[contains(@class, "flex")]').first()
    const hasGreenCheck = await step5Row.locator('svg[class*="text-green"]').count() > 0
    const hasSpinner = await step5Row.locator('.animate-spin').count() > 0
    console.log(`  Step 5 - Generate Proposal: ${hasGreenCheck ? '✅ complete' : hasSpinner ? '🔄 in-progress' : '⏳ pending'}`)
  }

  // Check header status badge
  const statusBadges = await page.locator('[class*="bg-cyan-"], [class*="bg-green-"]').filter({ hasText: /Request|Aircraft|Quotes|Options|Ready/ }).all()
  if (statusBadges.length > 0) {
    const statusText = await statusBadges[0].textContent()
    console.log(`\n🏷️ Header Status Badge: ${statusText}`)
  }

  // Check for deep link button
  const deepLinkButton = await page.locator('text="Goto Avinode Marketplace"').count()
  const openAvinodeButton = await page.locator('text="Open in Avinode"').count()
  console.log(`\n🔗 Deep Link:`)
  console.log(`  - "Goto Avinode Marketplace" button: ${deepLinkButton > 0}`)
  console.log(`  - "Open in Avinode" button: ${openAvinodeButton > 0}`)

  // Get agent message content preview
  console.log('\n📝 Agent Message Content:')
  const agentMessages = await page.locator('.flex.flex-col.space-y-3').filter({
    has: page.locator('text="Jetvision Agent"')
  }).all()

  for (let i = 0; i < Math.min(agentMessages.length, 2); i++) {
    const content = await agentMessages[i].locator('.text-sm.leading-relaxed, .whitespace-pre-wrap').first().textContent()
    if (content) {
      const preview = content.substring(0, 150).replace(/\n/g, ' ')
      console.log(`  Message ${i + 1}: "${preview}..."`)
    }
  }

  console.log('\n🔚 View complete')
}

viewChatThread().catch(console.error)
export {}
