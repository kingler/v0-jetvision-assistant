/**
 * Capture GPT-5.2 Test Page Screenshots
 *
 * Run: npx tsx scripts/capture-test-page.ts
 */

import { chromium } from 'playwright'

async function capture() {
  console.log('📸 Capturing GPT-5.2 Test Page Screenshots\n')

  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } })

  try {
    // Go to test page
    console.log('📍 Opening test page...')
    await page.goto('http://localhost:3000/test-gpt52.html', { timeout: 10000 })

    // Wait for page to load
    await page.waitForTimeout(500)

    // Screenshot 1: Thinking state
    await page.screenshot({
      path: 'reports/ux-analysis/gpt52-final-01-thinking.png',
      fullPage: true
    })
    console.log('📸 Screenshot 1: Thinking state')

    // Wait for streaming to start
    await page.waitForSelector('#response:not(.hidden)', { timeout: 30000 })

    // Screenshot 2: Streaming started
    await page.screenshot({
      path: 'reports/ux-analysis/gpt52-final-02-streaming.png',
      fullPage: true
    })
    console.log('📸 Screenshot 2: Streaming started')

    // Wait and capture progress
    await page.waitForTimeout(2000)
    await page.screenshot({
      path: 'reports/ux-analysis/gpt52-final-03-progress.png',
      fullPage: true
    })
    console.log('📸 Screenshot 3: Progress')

    await page.waitForTimeout(2000)
    await page.screenshot({
      path: 'reports/ux-analysis/gpt52-final-04-progress.png',
      fullPage: true
    })
    console.log('📸 Screenshot 4: More progress')

    // Wait for completion (cursor hidden)
    await page.waitForSelector('#cursor.hidden', { timeout: 30000 })

    await page.screenshot({
      path: 'reports/ux-analysis/gpt52-final-05-complete.png',
      fullPage: true
    })
    console.log('📸 Screenshot 5: Complete response')

    console.log('\n✅ All screenshots captured!')
    console.log('📁 Location: reports/ux-analysis/gpt52-final-*.png')

    // Keep open briefly
    await page.waitForTimeout(5000)

  } catch (error) {
    console.error('❌ Error:', error)
    await page.screenshot({
      path: 'reports/ux-analysis/gpt52-final-error.png',
      fullPage: true
    })
  } finally {
    await browser.close()
  }
}

capture().catch(console.error)
