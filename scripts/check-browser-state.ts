/**
 * Check Browser State
 *
 * Checks for errors, network requests, and workflow state
 */

import { chromium } from 'playwright'

const CDP_ENDPOINT = 'http://localhost:9222'

async function checkBrowserState() {
  console.log('\n🔍 Checking Browser State\n')

  try {
    const browser = await chromium.connectOverCDP(CDP_ENDPOINT)
    console.log('✅ Connected to Chrome')

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
      console.log('❌ No page found')
      await browser.close()
      return
    }

    console.log(`📍 Page: ${targetPage.url()}`)

    // Check for any visible error messages on the page
    const errorElements = await targetPage.locator('[class*="error"], [role="alert"], .text-red-500, .text-destructive').allTextContents()
    if (errorElements.length > 0) {
      console.log('\n🔴 Visible errors on page:')
      errorElements.forEach(e => console.log(`   ${e.slice(0, 100)}`))
    }

    // Check if there's a loading indicator stuck
    const loadingSpinners = await targetPage.locator('.animate-spin, [class*="loading"], [class*="spinner"]').count()
    console.log(`\n⏳ Loading indicators: ${loadingSpinners}`)

    // Get the messages in the chat
    const messages = await targetPage.locator('[class*="message"]').allTextContents()
    console.log(`\n💬 Messages found: ${messages.length}`)
    messages.slice(0, 3).forEach((m, i) => {
      console.log(`   Message ${i + 1}: ${m.slice(0, 150)}...`)
    })

    // Check workflow status displayed
    const workflowStatus = await targetPage.locator('[class*="workflow"], [class*="Workflow"]').first().textContent().catch(() => null)
    if (workflowStatus) {
      console.log(`\n📊 Workflow status: ${workflowStatus.slice(0, 200)}...`)
    }

    // Check sidebar status
    const sidebarStatus = await targetPage.locator('[class*="sidebar"] [class*="status"], aside [class*="badge"]').allTextContents()
    console.log(`\n📋 Sidebar badges: ${sidebarStatus.join(', ')}`)

    // Navigate back to main chat view by clicking somewhere
    const backButton = targetPage.locator('button:has-text("<"), button[aria-label*="back"]').first()
    if (await backButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('\n⬅️ Found back button, clicking...')
      await backButton.click()
      await targetPage.waitForTimeout(1000)
    }

    // Get the current flight request #1 card status text
    const flightRequestCard = await targetPage.locator('text=Flight Request #1').first()
    if (await flightRequestCard.isVisible({ timeout: 1000 }).catch(() => false)) {
      const parentCard = flightRequestCard.locator('..')
      const cardText = await parentCard.textContent()
      console.log(`\n✈️ Flight Request #1 Card: ${cardText?.slice(0, 200)}`)
    }

    // Check the last message from the agent
    const agentMessages = await targetPage.locator('[class*="agent"], [data-role="assistant"]').allTextContents()
    if (agentMessages.length > 0) {
      console.log(`\n🤖 Agent response: ${agentMessages[agentMessages.length - 1]?.slice(0, 300)}`)
    }

    browser.close()

  } catch (error) {
    console.error('Error:', error)
  }
}

checkBrowserState().catch(console.error)

export {}
