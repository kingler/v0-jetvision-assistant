/**
 * Diagnostic script to verify:
 * 1. Whether /api/chat receives authenticated requests
 * 2. Whether getIsoAgentIdFromClerkUserId returns the expected ISO agent ID
 *
 * Usage:
 * - Open browser to http://localhost:3000 and sign in
 * - Run: pnpm tsx scripts/diagnose-chat-auth.ts
 * - This will test the API with your browser's authentication cookies
 */

import { chromium } from 'playwright'

const API_ENDPOINT = 'http://localhost:3000/api/chat'
const CDP_ENDPOINT = 'http://localhost:9222' // Chrome DevTools Protocol endpoint

/**
 * Test authentication and ISO agent ID retrieval
 */
async function diagnoseChatAuth() {
  console.log('\n🔍 Diagnosing Chat API Authentication and ISO Agent ID Retrieval\n')
  console.log('='.repeat(70))

  try {
    // Connect to running Chrome instance
    console.log('\n1️⃣ Connecting to Chrome instance...')
    const browser = await chromium.connectOverCDP(CDP_ENDPOINT)
    console.log('   ✅ Connected to Chrome')

    // Find the localhost:3000 page
    console.log('\n2️⃣ Finding localhost:3000 page...')
    const contexts = browser.contexts()
    let targetPage = null

    for (const context of contexts) {
      const pages = context.pages()
      for (const page of pages) {
        if (page.url().includes('localhost:3000') && !page.url().includes('blob:')) {
          targetPage = page
          break
        }
      }
      if (targetPage) break
    }

    if (!targetPage) {
      console.log('   ❌ No localhost:3000 page found')
      console.log('\n   💡 Please open http://localhost:3000 in Chrome first')
      await browser.close()
      return
    }

    console.log(`   ✅ Found page: ${targetPage.url()}`)

    // Get cookies from browser context
    console.log('\n3️⃣ Extracting authentication cookies...')
    const cookies = await targetPage.context().cookies()
    const authCookies = cookies.filter(
      (c) => c.domain.includes('localhost') || c.name.includes('__clerk') || c.name.includes('__session')
    )
    console.log(`   ✅ Found ${authCookies.length} authentication cookies`)

    if (authCookies.length === 0) {
      console.log('   ⚠️  No authentication cookies found')
      console.log('   💡 Please sign in at http://localhost:3000 first')
      await browser.close()
      return
    }

    // Build cookie header
    const cookieHeader = authCookies.map((c) => `${c.name}=${c.value}`).join('; ')
    console.log(`   📦 Cookie header length: ${cookieHeader.length} chars`)

    // Test API endpoint with authentication
    console.log('\n4️⃣ Testing /api/chat endpoint with authentication...')
    const testMessage = 'Hello, this is a diagnostic test'
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        message: testMessage,
        conversationHistory: [],
      }),
    })

    console.log(`   📊 Response status: ${response.status} ${response.statusText}`)

    if (response.status === 401) {
      console.log('   ❌ Authentication FAILED - API returned 401 Unauthorized')
      console.log('   💡 This means the Clerk session is not being recognized')
      console.log('\n   Possible causes:')
      console.log('   - User is not signed in')
      console.log('   - Clerk cookies are not being sent correctly')
      console.log('   - Clerk middleware configuration issue')
      await browser.close()
      return
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`   ⚠️  API returned error: ${errorText.substring(0, 200)}`)
      await browser.close()
      return
    }

    console.log('   ✅ Authentication SUCCESS - API accepted the request')

    // Check server logs for ISO agent ID retrieval
    console.log('\n5️⃣ Checking server logs for ISO agent ID retrieval...')
    console.log('   💡 Look for these log messages in your server console:')
    console.log('      - "[Chat API] Error getting ISO agent ID:" (if failed)')
    console.log('      - "[Message Persistence] Error getting ISO agent ID:" (if failed)')
    console.log('      - No error = ISO agent ID retrieved successfully')

    // Try to read the response to see if conversation was created
    const reader = response.body?.getReader()
    if (reader) {
      const decoder = new TextDecoder()
      let hasData = false
      
      try {
        const { value } = await reader.read()
        if (value) {
          const chunk = decoder.decode(value)
          if (chunk.includes('data:')) {
            hasData = true
            console.log('   ✅ Received SSE response (API is working)')
          }
        }
      } catch (e) {
        // Stream already closed or error
      }
    }

    console.log('\n' + '='.repeat(70))
    console.log('\n✅ DIAGNOSIS COMPLETE\n')
    console.log('Summary:')
    console.log('  ✅ API endpoint is accessible')
    console.log('  ✅ Authentication is working (status 200)')
    console.log('  📝 Check server logs to verify ISO agent ID retrieval')
    console.log('\n💡 To verify ISO agent ID retrieval:')
    console.log('   1. Check your server console for error messages')
    console.log('   2. Look for "[Chat API] Error getting ISO agent ID:" messages')
    console.log('   3. If no errors, ISO agent ID was retrieved successfully')
    console.log('   4. Verify your user exists in iso_agents table with correct clerk_user_id')

    await browser.close()
  } catch (error) {
    console.error('\n❌ Error during diagnosis:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      if (error.message.includes('ECONNREFUSED')) {
        console.log('\n   💡 Chrome DevTools Protocol not available')
        console.log('   💡 Start Chrome with: google-chrome --remote-debugging-port=9222')
        console.log('   💡 Or use: chrome.exe --remote-debugging-port=9222')
      }
    }
  }
}

// Run diagnosis
diagnoseChatAuth().catch(console.error)
