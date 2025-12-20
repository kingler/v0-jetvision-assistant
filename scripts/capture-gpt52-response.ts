/**
 * Capture GPT-5.2 Streaming Response
 *
 * Creates an HTML page that displays the streaming response,
 * then captures screenshots of the "thinking" and response states.
 *
 * Run: npx tsx scripts/capture-gpt52-response.ts
 */

import { chromium } from 'playwright'

const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GPT-5.2 Chat Test - JetVision</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .animate-pulse { animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .animate-spin { animation: spin 1s linear infinite; }
  </style>
</head>
<body class="bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen p-6">
  <div class="max-w-3xl mx-auto">
    <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
      <!-- Header -->
      <div class="bg-blue-600 text-white p-4">
        <h1 class="text-xl font-bold flex items-center gap-2">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
          JetVision Assistant
        </h1>
        <p class="text-blue-100 text-sm">Powered by GPT-5.2</p>
      </div>

      <!-- Chat Messages -->
      <div class="p-4 space-y-4" id="messages">
        <!-- User Message -->
        <div class="flex justify-end">
          <div class="bg-blue-600 text-white rounded-2xl px-4 py-3 max-w-[80%]">
            <p class="text-sm">I need a private jet from NYC to Miami for 4 passengers Friday</p>
            <p class="text-xs text-blue-200 mt-1" id="user-time"></p>
          </div>
        </div>

        <!-- Agent Response -->
        <div class="flex justify-start">
          <div class="bg-gray-100 rounded-2xl px-4 py-3 max-w-[85%] border border-gray-200">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
              </div>
              <span class="text-xs font-semibold text-blue-600">JetVision Agent</span>
              <span class="text-xs text-gray-400" id="model-badge">GPT-5.2</span>
            </div>

            <!-- Thinking State -->
            <div id="thinking" class="flex items-center gap-2">
              <svg class="w-4 h-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span class="text-sm text-gray-600">Thinking...</span>
            </div>

            <!-- Response Content -->
            <div id="response" class="hidden">
              <p id="content" class="text-sm leading-relaxed whitespace-pre-wrap"></p>
              <span id="cursor" class="inline-block w-2 h-4 bg-blue-600 animate-pulse ml-0.5"></span>
            </div>

            <p class="text-xs text-gray-400 mt-2" id="agent-time"></p>
          </div>
        </div>
      </div>

      <!-- Input Area (disabled) -->
      <div class="border-t p-4 bg-gray-50">
        <div class="flex gap-2">
          <input type="text" placeholder="Type your message..."
                 class="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm bg-white" disabled>
          <button class="bg-blue-600 text-white rounded-full p-2" disabled>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Set timestamps
    document.getElementById('user-time').textContent = new Date().toLocaleTimeString();

    // Start streaming after 1 second
    setTimeout(async () => {
      const response = await fetch('/api/chat/test?message=' + encodeURIComponent('I need a private jet from NYC to Miami for 4 passengers Friday'));
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let content = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.content) {
                // Hide thinking, show response
                document.getElementById('thinking').classList.add('hidden');
                document.getElementById('response').classList.remove('hidden');

                content += data.content;
                document.getElementById('content').textContent = content;
              }

              if (data.done) {
                document.getElementById('cursor').classList.add('hidden');
                document.getElementById('agent-time').textContent = new Date().toLocaleTimeString();
                window.streamingComplete = true;
              }
            } catch (e) {}
          }
        }
      }
    }, 1000);
  </script>
</body>
</html>
`;

async function captureGPT52Response() {
  console.log('📸 Capturing GPT-5.2 Streaming Response Screenshots\n')

  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } })

  try {
    // Serve HTML via data URL
    await page.setContent(HTML_CONTENT, { waitUntil: 'domcontentloaded' })

    // Wait a moment, then navigate to test endpoint to trigger CORS
    // Instead, let's use the actual localhost
    console.log('📍 Loading test page...')
    await page.goto('http://localhost:3000', { timeout: 10000 }).catch(() => {})

    // Set content directly
    await page.setContent(HTML_CONTENT)

    // Screenshot 1: Initial thinking state
    await page.waitForTimeout(500)
    await page.screenshot({
      path: 'reports/ux-analysis/gpt52-stream-01-thinking.png',
      fullPage: true
    })
    console.log('📸 Screenshot: gpt52-stream-01-thinking.png')

    // Manually trigger the fetch since setContent doesn't have same origin
    console.log('\n⏳ Fetching GPT-5.2 response...')

    // Use page.evaluate to stream response
    await page.evaluate(async () => {
      const response = await fetch('http://localhost:3000/api/chat/test?message=' +
        encodeURIComponent('I need a private jet from NYC to Miami for 4 passengers Friday'))
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()

      let content = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.content) {
                document.getElementById('thinking')!.classList.add('hidden')
                document.getElementById('response')!.classList.remove('hidden')

                content += data.content
                document.getElementById('content')!.textContent = content
              }

              if (data.done) {
                document.getElementById('cursor')!.classList.add('hidden')
                document.getElementById('agent-time')!.textContent = new Date().toLocaleTimeString()
              }
            } catch (e) {}
          }
        }
      }
    }).catch(e => console.log('Streaming in page context:', e.message))

    // Take screenshots during streaming
    for (let i = 2; i <= 5; i++) {
      await page.waitForTimeout(1500)
      await page.screenshot({
        path: `reports/ux-analysis/gpt52-stream-0${i}-progress.png`,
        fullPage: true
      })
      console.log(`📸 Screenshot: gpt52-stream-0${i}-progress.png`)
    }

    // Final screenshot
    await page.waitForTimeout(3000)
    await page.screenshot({
      path: 'reports/ux-analysis/gpt52-stream-06-complete.png',
      fullPage: true
    })
    console.log('📸 Screenshot: gpt52-stream-06-complete.png')

    console.log('\n✅ Screenshots captured!')
    console.log('📁 Location: reports/ux-analysis/gpt52-stream-*.png')

    await page.waitForTimeout(5000)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await browser.close()
  }
}

captureGPT52Response().catch(console.error)
