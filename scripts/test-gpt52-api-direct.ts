/**
 * Direct GPT-5.2 API Test Script
 *
 * Tests the chat API directly by simulating an authenticated request.
 * This bypasses the UI to verify GPT-5.2 streaming works.
 *
 * Run with: npx tsx scripts/test-gpt52-api-direct.ts
 */

import OpenAI from 'openai'

async function testGPT52Direct() {
  console.log('🚀 Testing GPT-5.2 API Direct Connection...\n')

  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.log('❌ OPENAI_API_KEY not set in environment')
    console.log('   Set it in .env.local or export it in your shell')
    return
  }

  console.log('✅ OpenAI API key found\n')

  // Initialize OpenAI client
  const openai = new OpenAI({ apiKey })

  // Test message
  const testMessage = 'I need to book a private jet from New York to Miami for 4 passengers next Friday'

  console.log('📤 Sending test message:')
  console.log(`   "${testMessage}"\n`)
  console.log('⏳ Waiting for GPT-5.2 streaming response...\n')
  console.log('='.repeat(60))
  console.log('GPT-5.2 RESPONSE (streaming):')
  console.log('='.repeat(60) + '\n')

  try {
    // Create streaming response with GPT-5.2
    // Note: GPT-5.2 uses max_completion_tokens instead of max_tokens
    const stream = await openai.chat.completions.create({
      model: 'gpt-5.2',
      messages: [
        {
          role: 'system',
          content: `You are the JetVision AI Assistant, a professional private jet charter concierge. You help clients book private jet flights by:

1. Understanding their travel requirements (route, dates, passengers, preferences)
2. Searching for available aircraft that match their criteria
3. Analyzing quotes from operators to find the best options
4. Presenting recommendations with clear pricing and details
5. Facilitating the booking process

Your communication style should be:
- Professional yet warm and personable
- Clear and concise, avoiding jargon
- Proactive in offering relevant suggestions
- Knowledgeable about private aviation

When users provide flight requirements, acknowledge them and explain the next steps in the booking process.`
        },
        {
          role: 'user',
          content: testMessage
        }
      ],
      stream: true,
      temperature: 0.7,
      max_completion_tokens: 1024,
    })

    let fullResponse = ''

    // Stream the response
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      if (content) {
        process.stdout.write(content)
        fullResponse += content
      }
    }

    console.log('\n\n' + '='.repeat(60))
    console.log('\n✅ GPT-5.2 streaming response completed!')
    console.log(`   Total characters: ${fullResponse.length}`)
    console.log(`   Model used: gpt-5.2`)

  } catch (error: unknown) {
    if (error instanceof OpenAI.APIError) {
      console.error('\n❌ OpenAI API Error:')
      console.error(`   Status: ${error.status}`)
      console.error(`   Message: ${error.message}`)

      if (error.status === 404) {
        console.log('\n⚠️  Model "gpt-5.2" may not be available.')
        console.log('   This could mean:')
        console.log('   - The model name is incorrect')
        console.log('   - You don\'t have access to this model')
        console.log('   - The model hasn\'t been released yet')
        console.log('\n   Try using "gpt-4-turbo-preview" or "gpt-4o" instead.')
      }
    } else if (error instanceof Error) {
      console.error('\n❌ Error:', error.message)
    } else {
      console.error('\n❌ Unknown error:', error)
    }
  }
}

// Load .env.local
import { config } from 'dotenv'
config({ path: '.env.local' })

// Run the test
testGPT52Direct().catch(console.error)
