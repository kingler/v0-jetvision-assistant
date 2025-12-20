/**
 * Test Chat API Direct
 *
 * Tests the chat API endpoint directly via fetch to see tool calling behavior.
 *
 * Usage: npx tsx scripts/test-chat-api-direct.ts
 */

async function testChatAPIDirect() {
  console.log('\nTesting Chat API Direct\n')

  const message = 'I need to book a flight from Teterboro (KTEB) to Van Nuys (KVNY) for 4 passengers on January 20, 2025. Please search for available aircraft and create an RFP.'

  console.log('Message: ' + message.slice(0, 80) + '...\n')

  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversationHistory: [],
        context: {},
      }),
    })

    console.log('Response status: ' + response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.log('\nError response:\n' + errorText)
      return
    }

    // Read SSE stream
    const reader = response.body?.getReader()
    if (!reader) {
      console.log('No response body')
      return
    }

    const decoder = new TextDecoder()
    let fullResponse = ''
    let toolCallCount = 0
    let hasRfpData = false

    console.log('\nSSE Stream:\n')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            const preview = JSON.stringify(data).slice(0, 300)
            console.log('   SSE data: ' + preview)

            if (data.content) {
              fullResponse += data.content
            }

            if (data.tool_calls && Array.isArray(data.tool_calls)) {
              toolCallCount = data.tool_calls.length
              console.log('\nTool calls detected: ' + toolCallCount)
              for (const tc of data.tool_calls) {
                console.log('   - ' + tc.name)
                if (tc.result) {
                  console.log('     Result keys: ' + Object.keys(tc.result).join(', '))
                }
              }
            }

            if (data.rfp_data) {
              hasRfpData = true
              console.log('\nRFP Data found:')
              console.log('   trip_id: ' + data.rfp_data.trip_id)
              console.log('   rfp_id: ' + data.rfp_data.rfp_id)
              console.log('   deep_link: ' + data.rfp_data.deep_link)
            }

            if (data.done) {
              console.log('\nStream complete')
            }
          } catch {
            // Skip parse errors
          }
        }
      }
    }

    console.log('\nFull Response:')
    console.log(fullResponse.slice(0, 500) || '(empty)')

    console.log('\nSummary:')
    console.log('   Tool calls: ' + toolCallCount)
    console.log('   RFP data: ' + (hasRfpData ? 'Yes' : 'No'))
    console.log('   Response length: ' + fullResponse.length + ' chars')

    if (toolCallCount === 0) {
      console.log('\nNo tool calls were made!')
      console.log('   Check server logs for [Chat API] Tool choice output')
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

testChatAPIDirect().catch(console.error)

export {}
