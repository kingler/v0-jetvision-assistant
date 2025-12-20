/**
 * Capture Current Page State
 *
 * Takes a screenshot of the current page and lists key elements
 */

import { chromium } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

const REPORTS_DIR = 'reports/ux-analysis'
const CDP_ENDPOINT = 'http://localhost:9222'

async function captureCurrentPage() {
  console.log('\n📸 Capturing Current Page State\n')

  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true })
  }

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

    console.log(`📍 URL: ${targetPage.url()}`)

    // Take screenshot
    await targetPage.screenshot({
      path: path.join(REPORTS_DIR, 'current-page-state.png'),
      fullPage: true,
    })
    console.log('📸 Screenshot saved')

    // List key elements
    console.log('\n🔍 Page Elements:')

    // Inputs
    const inputs = await targetPage.locator('input, textarea').all()
    console.log(`   Inputs/Textareas: ${inputs.length}`)
    for (const input of inputs.slice(0, 5)) {
      const placeholder = await input.getAttribute('placeholder')
      const type = await input.getAttribute('type')
      console.log(`     - ${type || 'text'}: "${placeholder || 'no placeholder'}"`)
    }

    // Buttons
    const buttons = await targetPage.locator('button').allTextContents()
    console.log(`   Buttons: ${buttons.length}`)
    for (const btn of buttons.slice(0, 5)) {
      console.log(`     - "${btn.trim().slice(0, 50)}"`)
    }

    // Links
    const links = await targetPage.locator('a').all()
    console.log(`   Links: ${links.length}`)

    // Look for authentication elements
    const signInButton = await targetPage.locator('button:has-text("Sign"), a:has-text("Sign")').count()
    console.log(`   Sign in/up buttons: ${signInButton}`)

    // Look for chat-related elements
    const chatElements = await targetPage.locator('[class*="chat"], [class*="Chat"], [class*="message"]').count()
    console.log(`   Chat-related elements: ${chatElements}`)

    // Check if there's a "New Flight Request" or similar button
    const newRequestBtn = await targetPage.locator('button:has-text("New"), button:has-text("Request"), button:has-text("Start")').count()
    console.log(`   New request buttons: ${newRequestBtn}`)

    // Get main heading text
    const headings = await targetPage.locator('h1, h2').allTextContents()
    console.log('\n📄 Headings:')
    for (const h of headings.slice(0, 5)) {
      console.log(`   - ${h.trim().slice(0, 80)}`)
    }

    browser.close()

  } catch (error) {
    console.error('Error:', error)
  }
}

captureCurrentPage().catch(console.error)

export {}
