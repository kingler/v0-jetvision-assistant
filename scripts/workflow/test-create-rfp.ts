/**
 * Test Create RFP Flow
 *
 * Sends a follow-up message to create an RFP after flight search results.
 */

import { chromium } from 'playwright'

const CDP_ENDPOINT = 'http://localhost:9222'

async function testCreateRFP() {
  console.log('\n🎯 Testing Create RFP Flow\n')

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

    // Create RFP follow-up message
    const message = 'Yes, please proceed with creating an RFP for all three options. I want to get quotes from all operators.'

    console.log(`📤 Sending follow-up: "${message.slice(0, 80)}..."`)

    // Make the API call using page.evaluate to inherit auth context
    const response = await targetPage.evaluate(async (msg: string) => {
      // First, get the conversation history from the current chat
      // For simplicity, we'll include a summary of the previous response
      const conversationHistory = [
        {
          role: 'user' as const,
          content: 'I need to book a flight from Teterboro (KTEB) to Van Nuys (KVNY) for 4 passengers on January 20, 2025. Please search for available aircraft and create an RFP.',
        },
        {
          role: 'assistant' as const,
          content: `I have found several available aircraft for your flight from Teterboro (KTEB) to Van Nuys (KVNY) on January 20, 2025, for 4 passengers:
1. Citation CJ4 (Light Jet) - $32,000 USD - Operator: Textron Aviation
2. Falcon 2000 (Midsize Jet) - $58,000 USD - Operator: Dassault Falcon Jet
3. Gulfstream G550 (Heavy Jet) - $95,000 USD - Operator: NetJets
Would you like to proceed with creating a Request for Proposal (RFP)?`,
        },
      ]

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: msg,
          conversationHistory,
          context: {
            route: 'KTEB → KVNY',
            passengers: 4,
            date: '2025-01-20',
          },
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

    if (response.error) {
      console.log(`\n❌ Error: ${response.error}`)
    } else if (response.data) {
      console.log(`\n📜 Raw SSE data (first 3000 chars):\n${response.data.slice(0, 3000)}`)

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
            console.log('   - rfp_data:', data.rfp_data ? 'PRESENT!' : 'none')

            if (data.tool_calls) {
              console.log('\n🔧 Tool calls:')
              for (const tc of data.tool_calls) {
                console.log(`   - ${tc.name}`)
                if (tc.result) {
                  console.log(`     Result: ${JSON.stringify(tc.result).slice(0, 500)}`)
                }
              }
            }

            if (data.rfp_data) {
              console.log('\n🎉 RFP DATA FOUND!')
              console.log('   rfp_id:', data.rfp_data.rfp_id)
              console.log('   trip_id:', data.rfp_data.trip_id)
              console.log('   deep_link:', data.rfp_data.deep_link)
              console.log('   status:', data.rfp_data.status)
              console.log('\n   Full RFP data:')
              console.log(JSON.stringify(data.rfp_data, null, 2))
            }

            if (data.content) {
              console.log('\n💬 Assistant response:')
              console.log(data.content.slice(0, 800))
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

testCreateRFP().catch(console.error)

export {}
