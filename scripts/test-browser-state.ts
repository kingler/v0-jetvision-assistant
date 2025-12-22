/**
 * Test browser state and verify we can see console logs
 */
import { chromium } from 'playwright'

async function testBrowserState() {
  console.log('Connecting to Chrome...')

  const browser = await chromium.connectOverCDP('http://localhost:9222')
  const context = browser.contexts()[0]

  if (!context) {
    console.log('No browser context found')
    await browser.close()
    return
  }

  const pages = context.pages()
  console.log('Found pages:', pages.length)

  for (const p of pages) {
    console.log('Page URL:', p.url())
  }

  let page = pages.find(p => p.url().includes('localhost:3000'))

  if (!page) {
    console.log('Creating new page...')
    page = await context.newPage()
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  }

  console.log('Current page URL:', page.url())

  // Set up console listener
  page.on('console', msg => {
    console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`)
  })

  // Force a console log from the page
  console.log('Injecting test console.log...')
  await page.evaluate(() => {
    console.log('TEST LOG FROM PAGE - THIS SHOULD APPEAR')
  })

  await page.waitForTimeout(1000)

  // Check React state
  console.log('\n=== Checking React State ===')
  const reactState = await page.evaluate(() => {
    // Try to find React fiber
    const root = document.getElementById('__next')
    if (root && (root as any)._reactRootContainer) {
      return 'Found React root container'
    }
    return 'React root not found via _reactRootContainer'
  })
  console.log(reactState)

  // Check if our debug logs are in the code
  console.log('\n=== Checking if debug code is loaded ===')
  const scripts = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script'))
    return scripts.map(s => s.src).filter(s => s.includes('_next'))
  })
  console.log('Next.js scripts:', scripts.length)

  await browser.close()
}

testBrowserState().catch(console.error)

export {}
