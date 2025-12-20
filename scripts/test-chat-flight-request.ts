/**
 * Test Flight Request Chat Response
 *
 * Tests the conversational chat interface by:
 * 1. Connecting to existing Chrome debug session
 * 2. Sending a flight request message
 * 3. Capturing the agent response and workflow visualization
 * 4. Taking screenshots of the UI
 */

import { chromium, type Page, type Browser } from 'playwright'

const CHROME_DEBUG_URL = 'http://localhost:9222'
const APP_URL = 'http://localhost:3000'

interface TestResult {
  success: boolean
  message: string
  screenshots: string[]
  agentResponse?: string
  workflowVisible?: boolean
  deepLinkVisible?: boolean
  headerUpdated?: boolean
}

async function connectToChrome(): Promise<Browser> {
  console.log('🔌 Connecting to Chrome debug session...')
  const browser = await chromium.connectOverCDP(CHROME_DEBUG_URL)
  console.log('✅ Connected to Chrome')
  return browser
}

async function findOrNavigateToApp(page: Page): Promise<void> {
  const currentUrl = page.url()
  console.log(`📍 Current URL: ${currentUrl}`)

  if (!currentUrl.includes('localhost:3000')) {
    console.log('🌐 Navigating to app...')
    await page.goto(APP_URL, { waitUntil: 'networkidle' })
  }
}

async function waitForChatInterface(page: Page): Promise<boolean> {
  console.log('⏳ Waiting for chat interface...')
  try {
    // Wait for any input field - landing page or chat interface
    await page.waitForSelector('input[placeholder*="Type your message"], input[placeholder*="Message"]', { timeout: 10000 })
    console.log('✅ Chat interface loaded')
    return true
  } catch {
    console.log('❌ Chat interface not found')
    return false
  }
}

async function sendFlightRequest(page: Page, message: string): Promise<void> {
  console.log(`📤 Sending flight request: "${message}"`)

  // Check if we're on the landing page or chat interface
  const isLandingPage = await page.locator('text="How can I help you today?"').count() > 0
  console.log(`  - On landing page: ${isLandingPage}`)

  // Find the chat input (could be landing page or chat interface)
  const input = await page.locator('input[placeholder*="Type your message"], input[placeholder*="Message"]').first()
  await input.click()
  await input.fill(message)

  // Wait a moment for the input to be processed
  await page.waitForTimeout(500)

  if (isLandingPage) {
    // On landing page, the form submission is the key
    // Use keyboard Enter which triggers form onSubmit
    console.log('  - Pressing Enter to submit form...')
    await input.press('Enter')
    console.log('✅ Form submitted via Enter key')

    // Wait for transition to chat interface
    console.log('  - Waiting for transition to chat interface...')
    try {
      // Wait for the chat interface to load (look for the dynamic header)
      await page.waitForSelector('text="Flight Request #"', { timeout: 15000 })
      console.log('✅ Transitioned to chat interface')
    } catch {
      // Fallback: check if we have agent messages
      const agentBadge = await page.locator('text="Jetvision Agent"').count()
      if (agentBadge > 0) {
        console.log('✅ Chat interface loaded (found agent badge)')
      } else {
        // Try clicking the button directly as fallback
        console.log('  - Enter key might not have worked, trying button click...')
        const sendButton = await page.locator('button[type="submit"]').first()
        if (await sendButton.count() > 0) {
          await sendButton.click({ force: true })
          console.log('  - Clicked submit button with force')
          await page.waitForTimeout(2000)
        }

        // Check again
        const stillLanding = await page.locator('text="How can I help you today?"').count() > 0
        if (stillLanding) {
          console.log('⚠️ Still on landing page - form submission may have failed')
        } else {
          console.log('✅ Transitioned away from landing page')
        }
      }
    }
  } else {
    // In chat interface, click the send button
    const sendButton = await page.locator('button[class*="bg-blue-600"]').filter({ has: page.locator('svg') }).first()
    if (await sendButton.count() > 0) {
      console.log('  - Found send button in chat, clicking...')
      await sendButton.click()
      console.log('✅ Message sent via button')
    } else {
      // Fallback to Enter key
      await input.press('Enter')
      console.log('✅ Message sent via Enter key')
    }
  }
}

async function waitForAgentResponse(page: Page, timeout = 60000): Promise<string | null> {
  console.log('⏳ Waiting for agent response...')

  const startTime = Date.now()
  let lastAgentMessage = ''
  let responseFound = false

  while (Date.now() - startTime < timeout) {
    // Check for agent messages (look for the Jetvision Agent badge)
    const agentBadges = await page.locator('text="Jetvision Agent"').all()

    if (agentBadges.length > 0) {
      responseFound = true
      // Get text content from the agent message area
      const messageContainers = await page.locator('.text-sm.leading-relaxed').all()

      if (messageContainers.length > 0) {
        const lastContainer = messageContainers[messageContainers.length - 1]
        const textContent = await lastContainer.textContent()
        if (textContent && textContent.length > lastAgentMessage.length) {
          lastAgentMessage = textContent
          console.log(`💬 Agent response: ${textContent.substring(0, 80)}...`)
        }
      }
    }

    // Check if still typing/loading
    const typingIndicator = await page.locator('text="Thinking..."').count()
    const loadingSpinner = await page.locator('.animate-spin').count()

    if (responseFound && typingIndicator === 0 && loadingSpinner === 0) {
      // Wait a bit more to ensure the response is complete
      await page.waitForTimeout(2000)
      console.log('✅ Agent response complete')
      return lastAgentMessage
    }

    await page.waitForTimeout(1000)
  }

  return lastAgentMessage || null
}

async function checkWorkflowVisualization(page: Page): Promise<boolean> {
  console.log('🔍 Checking for workflow visualization...')

  // Look for workflow steps
  const workflowSteps = await page.locator('text="Understanding Request"').count() +
                        await page.locator('text="Searching Aircraft"').count() +
                        await page.locator('text="Requesting Quotes"').count() +
                        await page.locator('text="Analyzing Options"').count()

  const visible = workflowSteps > 0
  console.log(visible ? '✅ Workflow visualization visible' : '❌ Workflow visualization not visible')
  return visible
}

async function checkDeepLinkButton(page: Page): Promise<boolean> {
  console.log('🔍 Checking for deep link button...')

  const deepLinkButton = await page.locator('text="Goto Avinode Marketplace"').count()
  const avinodeLink = await page.locator('text="Open in Avinode"').count()
  const visible = deepLinkButton > 0 || avinodeLink > 0
  console.log(visible ? '✅ Deep link button visible' : '❌ Deep link button not visible')
  return visible
}

async function checkDynamicHeader(page: Page): Promise<boolean> {
  console.log('🔍 Checking for dynamic header...')

  // Look for the dynamic header elements
  const flightIdBadge = await page.locator('text=/FR-\\d+/').count()
  const tripIdBadge = await page.locator('text="Trip ID:"').count()
  const statusBadges = await page.locator('[class*="bg-blue-500"], [class*="bg-green-500"], [class*="bg-cyan-500"], [class*="bg-purple-500"]').count()

  const visible = flightIdBadge > 0 || tripIdBadge > 0 || statusBadges > 0
  console.log(visible ? '✅ Dynamic header visible' : '❌ Dynamic header not visible')
  return visible
}

async function checkAgentMessageStyle(page: Page): Promise<boolean> {
  console.log('🔍 Checking agent message styling (should be plain text, no bubble)...')

  // Check for Jetvision Agent badge (text selector, not CSS)
  const agentBadgeCount = await page.locator('text="Jetvision Agent"').count()

  if (agentBadgeCount === 0) {
    console.log('❓ No agent messages found to verify styling')
    return false
  }

  // Check that agent messages have the proper plain text structure
  // AgentMessage component uses: .flex.flex-col.space-y-3 wrapper with avatar + content
  const plainAgentMessages = await page.locator('.flex.flex-col.space-y-3').filter({
    has: page.locator('text="Jetvision Agent"')
  }).count()

  // Check that user messages still use bubbles (rounded corners with blue background)
  const userBubbles = await page.locator('.rounded-2xl.bg-blue-600').count()

  console.log(`  - Agent badges found: ${agentBadgeCount}`)
  console.log(`  - Plain agent messages: ${plainAgentMessages}`)
  console.log(`  - User bubbles: ${userBubbles}`)

  if (plainAgentMessages > 0) {
    console.log('✅ Agent messages use plain text styling')
    return true
  }

  console.log('⚠️ Agent message styling may need verification')
  return false
}

async function takeScreenshots(page: Page, prefix: string): Promise<string[]> {
  const screenshots: string[] = []
  const timestamp = Date.now()

  // Full page screenshot
  const fullPath = `screenshots/${prefix}-full-${timestamp}.png`
  await page.screenshot({ path: fullPath, fullPage: true })
  screenshots.push(fullPath)
  console.log(`📸 Screenshot saved: ${fullPath}`)

  return screenshots
}

async function runTest(): Promise<TestResult> {
  let browser: Browser | null = null
  const screenshots: string[] = []

  try {
    // Ensure screenshots directory exists
    const fs = await import('fs')
    if (!fs.existsSync('screenshots')) {
      fs.mkdirSync('screenshots')
    }

    // Connect to Chrome
    browser = await connectToChrome()
    const contexts = browser.contexts()

    if (contexts.length === 0) {
      return {
        success: false,
        message: 'No browser contexts found',
        screenshots: []
      }
    }

    const pages = contexts[0].pages()
    if (pages.length === 0) {
      return {
        success: false,
        message: 'No pages found',
        screenshots: []
      }
    }

    const page = pages[0]

    // Navigate to app if needed
    await findOrNavigateToApp(page)

    // Take initial screenshot
    const initialScreenshots = await takeScreenshots(page, 'initial')
    screenshots.push(...initialScreenshots)

    // Wait for chat interface
    const chatLoaded = await waitForChatInterface(page)
    if (!chatLoaded) {
      return {
        success: false,
        message: 'Chat interface not loaded',
        screenshots
      }
    }

    // Send a flight request
    const flightRequest = "I need a flight from Teterboro to Palm Beach for 4 passengers on January 15th, 2025"
    await sendFlightRequest(page, flightRequest)

    // Take screenshot after sending
    await page.waitForTimeout(2000)
    const sendingScreenshots = await takeScreenshots(page, 'after-send')
    screenshots.push(...sendingScreenshots)

    // Wait for agent response
    const agentResponse = await waitForAgentResponse(page, 60000)

    // Take screenshot of response
    const responseScreenshots = await takeScreenshots(page, 'response')
    screenshots.push(...responseScreenshots)

    // Check UI elements
    const workflowVisible = await checkWorkflowVisualization(page)
    const deepLinkVisible = await checkDeepLinkButton(page)
    const headerUpdated = await checkDynamicHeader(page)
    const agentStyleCorrect = await checkAgentMessageStyle(page)

    // Final screenshot
    const finalScreenshots = await takeScreenshots(page, 'final')
    screenshots.push(...finalScreenshots)

    return {
      success: !!agentResponse,
      message: agentResponse ? 'Test completed - agent responded' : 'Test completed - no agent response',
      screenshots,
      agentResponse: agentResponse?.substring(0, 500),
      workflowVisible,
      deepLinkVisible,
      headerUpdated
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Test failed:', errorMessage)
    return {
      success: false,
      message: errorMessage,
      screenshots
    }
  } finally {
    // Don't close the browser - we're using an existing session
    console.log('🔚 Test finished')
  }
}

// Run the test
console.log('🚀 Starting Flight Request Chat Test\n')
console.log('='.repeat(50))

runTest().then((result) => {
  console.log('\n' + '='.repeat(50))
  console.log('📊 TEST RESULTS')
  console.log('='.repeat(50))
  console.log(`Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}`)
  console.log(`Message: ${result.message}`)
  console.log(`Screenshots: ${result.screenshots.length}`)

  if (result.agentResponse) {
    console.log(`\n💬 Agent Response (first 500 chars):`)
    console.log(result.agentResponse)
  }

  console.log(`\n📋 UI Element Checks:`)
  console.log(`  - Workflow Visualization: ${result.workflowVisible ? '✅' : '❌'}`)
  console.log(`  - Deep Link Button: ${result.deepLinkVisible ? '✅' : '❌'}`)
  console.log(`  - Dynamic Header: ${result.headerUpdated ? '✅' : '❌'}`)

  console.log('\n📸 Screenshots saved:')
  result.screenshots.forEach(s => console.log(`  - ${s}`))

  process.exit(result.success ? 0 : 1)
})

export {}
