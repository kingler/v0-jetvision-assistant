/**
 * Test Chat API with Auth Cookie
 *
 * Fetches auth cookies from the running Chrome session and tests the API directly.
 */

import { chromium } from 'playwright'

const CDP_ENDPOINT = 'http://localhost:9222'
const API_ENDPOINT = 'http://localhost:3000/api/chat'

async function testApiWithAuth() {
  console.log('\n🔐 Testing Chat API with Auth\n')

  try {
    const browser = await chromium.connectOverCDP(CDP_ENDPOINT)
    console.log('✅ Connected to Chrome!')

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
      console.log('❌ No localhost:3000 page found')
      await browser.close()
      return
    }

    // Get cookies from the browser context
    const cookies = await targetPage.context().cookies()
    console.log(`📦 Found ${cookies.length} cookies`)

    // Build cookie header
    const cookieHeader = cookies
      .filter(c => c.domain.includes('localhost') || c.domain.includes('clerk'))
      .map(c => `${c.name}=${c.value}`)
      .join('; ')

    console.log(`🍪 Cookie header length: ${cookieHeader.length} chars`)

    // Test message
    const message = 'I need to book a flight from Teterboro (KTEB) to Van Nuys (KVNY) for 4 passengers on January 20, 2025. Please search for available aircraft and create an RFP.'

    console.log(`\n📤 Sending message: "${message.slice(0, 80)}..."`)

    // Make the API call using page.evaluate to inherit auth context
    const response = await targetPage.evaluate(async (msg: string) => {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: msg,
          conversationHistory: [],
          context: {},
        }),
      })

      const status = res.status
      const contentType = res.headers.get('content-type') || ''

      if (!res.ok) {
        const errorText = await res.text()
        return { status, error: errorText, contentType }
      }

      // Read SSE stream
      const reader = res.body?.getReader()
      if (!reader) {
        return { status, error: 'No response body', contentType }
      }

      const decoder = new TextDecoder()
      let fullData = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullData += decoder.decode(value, { stream: true })
      }

      return { status, data: fullData, contentType }
    }, message)

    console.log(`\n📥 Response status: ${response.status}`)
    console.log(`   Content-Type: ${response.contentType}`)

    if (response.error) {
      console.log(`\n❌ Error: ${response.error}`)
    } else if (response.data) {
      console.log(`\n📜 Raw SSE data:\n${response.data.slice(0, 2000)}`)

      // Parse SSE data
      const lines = response.data.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            console.log('\n📊 Parsed data:')
            console.log('   - content length:', data.content?.length || 0)
            console.log('   - done:', data.done)
            console.log('   - mock_mode:', data.mock_mode)
            console.log('   - tool_calls:', data.tool_calls ? JSON.stringify(data.tool_calls.map((tc: {name: string}) => tc.name)) : 'none')
            console.log('   - rfp_data:', data.rfp_data ? 'present' : 'none')

            if (data.tool_calls) {
              console.log('\n🔧 Tool calls detected!')
              for (const tc of data.tool_calls) {
                console.log(`   - ${tc.name}`)
                if (tc.result) {
                  console.log(`     Result: ${JSON.stringify(tc.result).slice(0, 200)}...`)
                }
              }
            }

            if (data.rfp_data) {
              console.log('\n🎯 RFP Data:')
              console.log(`   - rfp_id: ${data.rfp_data.rfp_id}`)
              console.log(`   - trip_id: ${data.rfp_data.trip_id}`)
              console.log(`   - deep_link: ${data.rfp_data.deep_link}`)
            }

            if (data.content) {
              console.log('\n💬 Assistant response:')
              console.log(data.content.slice(0, 500))
            }
          } catch (e) {
            // Skip parse errors
          }
        }
      }
    }

    browser.close()

  } catch (error) {
    console.error('Error:', error)
  }
}

testApiWithAuth().catch(console.error)

export {}
