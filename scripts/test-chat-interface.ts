/**
 * Test Main Chat Interface with GPT-5.2
 *
 * This script tests the chat interface using the dev-only test endpoint.
 * Run: npx tsx scripts/test-chat-interface.ts
 */

import { chromium } from 'playwright'

async function testChatInterface() {
  console.log('🧪 Testing Main Chat Interface with GPT-5.2\n')
  console.log('='.repeat(60))

  // Check if server is running
  console.log('\n📡 Checking server status...')
  try {
    const response = await fetch('http://localhost:3000/api/chat')
    const data = await response.json()
    console.log(`   Server status: ${data.status}`)
    console.log(`   Model configured: ${data.model || 'Not configured'}`)
  } catch (error) {
    console.error('❌ Server not running. Start with: npm run dev')
    process.exit(1)
  }

  // Launch browser
  console.log('\n🌐 Launching browser...')
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } })

  try {
    // Test 1: Navigate to test page
    console.log('\n📍 Test 1: Navigate to test page')
    await page.goto('http://localhost:3000/test-gpt52.html', { timeout: 10000 })
    await page.waitForLoadState('domcontentloaded')
    console.log('   ✅ Test page loaded')

    // Take screenshot of initial state
    await page.waitForTimeout(500)
    await page.screenshot({
      path: 'reports/ux-analysis/chat-test-01-initial.png',
      fullPage: true,
    })
    console.log('   📸 Screenshot: Initial state')

    // Test 2: Verify thinking indicator
    console.log('\n⏳ Test 2: Verify thinking indicator')
    const thinking = await page.locator('#thinking').isVisible()
    if (thinking) {
      console.log('   ✅ Thinking indicator visible')
    } else {
      console.log('   ⚠️ Thinking indicator not visible (may have already started)')
    }

    await page.screenshot({
      path: 'reports/ux-analysis/chat-test-02-thinking.png',
      fullPage: true,
    })
    console.log('   📸 Screenshot: Thinking state')

    // Test 3: Wait for streaming to start
    console.log('\n🔄 Test 3: Wait for streaming response')
    try {
      await page.waitForSelector('#response:not(.hidden)', { timeout: 30000 })
      console.log('   ✅ Streaming started')

      // Capture streaming progress
      for (let i = 3; i <= 5; i++) {
        await page.waitForTimeout(1500)
        await page.screenshot({
          path: `reports/ux-analysis/chat-test-0${i}-streaming.png`,
          fullPage: true,
        })
        console.log(`   📸 Screenshot ${i}: Streaming progress`)
      }
    } catch {
      console.log('   ❌ Streaming did not start in time')
      await page.screenshot({
        path: 'reports/ux-analysis/chat-test-error-no-stream.png',
        fullPage: true,
      })
    }

    // Test 4: Wait for completion
    console.log('\n✨ Test 4: Wait for completion')
    try {
      await page.waitForSelector('#cursor.hidden', { timeout: 45000 })
      console.log('   ✅ Response complete')

      await page.screenshot({
        path: 'reports/ux-analysis/chat-test-06-complete.png',
        fullPage: true,
      })
      console.log('   📸 Screenshot: Complete response')

      // Get response content
      const content = await page.locator('#content').textContent()
      console.log(`   📝 Response length: ${content?.length || 0} chars`)
      console.log(`   📝 Preview: "${content?.slice(0, 100)}..."`)

      // Test 5: Verify plain text (no markdown)
      console.log('\n📄 Test 5: Verify plain text formatting')
      if (content) {
        const hasMarkdownBold = /\*\*[^*]+\*\*/.test(content)
        const hasMarkdownHeader = /^#{1,6}\s/m.test(content)
        const hasCodeBlock = /```/.test(content)

        if (!hasMarkdownBold && !hasMarkdownHeader && !hasCodeBlock) {
          console.log('   ✅ No markdown artifacts in display')
        } else {
          console.log('   ⚠️ Some markdown may still be visible')
          if (hasMarkdownBold) console.log('      - Bold markers detected')
          if (hasMarkdownHeader) console.log('      - Header markers detected')
          if (hasCodeBlock) console.log('      - Code block markers detected')
        }
      }
    } catch {
      console.log('   ❌ Response did not complete in time')
      await page.screenshot({
        path: 'reports/ux-analysis/chat-test-error-incomplete.png',
        fullPage: true,
      })
    }

    // Test 6: Test the API endpoint directly
    console.log('\n🔌 Test 6: Direct API test')
    const apiResponse = await fetch(
      'http://localhost:3000/api/chat/test?message=' +
        encodeURIComponent('What is the weather like today?')
    )

    if (apiResponse.ok) {
      const text = await apiResponse.text()
      const lines = text.split('\n').filter(l => l.startsWith('data: '))
      console.log(`   ✅ API returned ${lines.length} SSE events`)

      // Count content chunks
      let totalChars = 0
      for (const line of lines) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.content) totalChars += data.content.length
        } catch {
          // Skip
        }
      }
      console.log(`   📊 Total content: ${totalChars} chars`)
    } else {
      console.log(`   ❌ API returned ${apiResponse.status}`)
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ All tests completed!')
    console.log('📁 Screenshots saved to: reports/ux-analysis/chat-test-*.png')

    // Keep browser open for 5 seconds to view results
    console.log('\n⏳ Keeping browser open for 5 seconds...')
    await page.waitForTimeout(5000)

  } catch (error) {
    console.error('\n❌ Test error:', error)
    await page.screenshot({
      path: 'reports/ux-analysis/chat-test-error.png',
      fullPage: true,
    })
  } finally {
    await browser.close()
    console.log('\n🔒 Browser closed')
  }
}

testChatInterface().catch(console.error)
