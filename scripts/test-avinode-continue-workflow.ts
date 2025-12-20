/**
 * Continue Avinode Workflow and Capture Deeplink
 *
 * Connects to existing Chrome session and waits for the workflow
 * to progress, capturing the deeplink response.
 *
 * Usage: npx tsx scripts/test-avinode-continue-workflow.ts
 */

import { chromium } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

const SCREENSHOTS_DIR = 'screenshots/avinode-deeplink-test'
const CDP_ENDPOINT = 'http://localhost:9222'

async function continueWorkflow() {
  console.log('\n🛩️  Continuing Avinode Workflow - Capturing Deeplink Response\n')

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

  try {
    const browser = await chromium.connectOverCDP(CDP_ENDPOINT)
    console.log('✅ Connected to Chrome!\n')

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

    console.log(`📍 Found page: ${targetPage.url()}`)

    // Take current state screenshot
    await targetPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, `continue-01-current-${timestamp}.png`),
      fullPage: true,
    })
    console.log('📸 Current state captured')

    // Click "Full Workflow" button to see the workflow visualization
    const workflowBtn = targetPage.locator('button:has-text("Full Workflow")').first()
    if (await workflowBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('📊 Clicking "Full Workflow" button...')
      await workflowBtn.click()
      await targetPage.waitForTimeout(2000)

      await targetPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, `continue-02-workflow-${timestamp}.png`),
        fullPage: true,
      })
      console.log('📸 Workflow visualization captured')
    }

    // Wait for more workflow progress
    console.log('\n⏳ Waiting for workflow to progress (60 seconds)...')

    for (let i = 0; i < 12; i++) {
      await targetPage.waitForTimeout(5000)

      await targetPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, `continue-progress-${i + 1}-${timestamp}.png`),
        fullPage: true,
      })
      console.log(`📸 Progress ${i + 1}/12 captured`)

      // Check for deeplink elements
      const avinodeLink = await targetPage.locator('a[href*="avinode"], button:has-text("Open in Avinode")').count()
      if (avinodeLink > 0) {
        console.log('🔗 Avinode deeplink found!')

        // Highlight the deeplink
        const link = targetPage.locator('a[href*="avinode"], button:has-text("Open in Avinode")').first()
        await link.evaluate(el => {
          (el as HTMLElement).style.border = '3px solid green'
          (el as HTMLElement).style.boxShadow = '0 0 15px green'
        })

        await targetPage.screenshot({
          path: path.join(SCREENSHOTS_DIR, `continue-DEEPLINK-FOUND-${timestamp}.png`),
          fullPage: true,
        })
        console.log('📸 Deeplink highlighted and captured!')

        const href = await link.getAttribute('href')
        console.log(`🔗 Deeplink URL: ${href}`)
        break
      }

      // Check for proposal/quote elements
      const proposals = await targetPage.locator('[class*="proposal"], [class*="Proposal"]').count()
      if (proposals > 0) {
        console.log(`📋 Found ${proposals} proposal elements`)
      }
    }

    // Final analysis
    console.log('\n🔍 Final page analysis...')

    const pageContent = await targetPage.content()

    console.log('Content indicators:')
    console.log(`   - Contains "avinode": ${pageContent.toLowerCase().includes('avinode') ? '✅' : '❌'}`)
    console.log(`   - Contains "deeplink": ${pageContent.toLowerCase().includes('deeplink') || pageContent.toLowerCase().includes('deep_link') ? '✅' : '❌'}`)
    console.log(`   - Contains "trip_id" or "tripId": ${pageContent.includes('trip_id') || pageContent.includes('tripId') ? '✅' : '❌'}`)
    console.log(`   - Contains "marketplace": ${pageContent.toLowerCase().includes('marketplace') ? '✅' : '❌'}`)
    console.log(`   - Contains "Open in": ${pageContent.includes('Open in') ? '✅' : '❌'}`)

    // Final screenshot
    await targetPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, `continue-FINAL-${timestamp}.png`),
      fullPage: true,
    })
    console.log('📸 Final state captured')

    console.log('\n✅ Workflow capture complete!')
    console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}/`)

    browser.close()

  } catch (error) {
    console.error('Error:', error)
  }
}

continueWorkflow().catch(console.error)

export {}
