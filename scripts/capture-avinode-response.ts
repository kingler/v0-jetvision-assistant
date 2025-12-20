#!/usr/bin/env npx tsx
/**
 * Capture Avinode flight search response from debug session
 */

import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots', 'avinode-response')

async function captureAvinodeResponse() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  }

  console.log('🔍 Connecting to Chrome debug session...')

  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222')
    console.log('✅ Connected to Chrome')

    const contexts = browser.contexts()
    if (contexts.length === 0) {
      console.log('❌ No browser contexts found')
      return
    }

    const pages = contexts[0].pages()
    let targetPage = pages.find(p => p.url().includes('localhost:3000'))

    if (!targetPage) {
      console.log('❌ No JetVision page found')
      return
    }

    console.log(`📸 Working with: ${targetPage.url()}`)
    const timestamp = Date.now()

    // Capture initial state
    await targetPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, `01-before-search-${timestamp}.png`),
      fullPage: true,
    })
    console.log('✅ Captured: 01-before-search')

    // Find the message input
    const messageInput = targetPage.locator('input[placeholder*="Message"], textarea[placeholder*="Message"]').first()

    if (await messageInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ Found message input')

      // Clear any existing text and type a flight search request
      await messageInput.click()
      await messageInput.fill('')
      await messageInput.fill('I need a private jet from Teterboro (KTEB) to Miami (KMIA) for 6 passengers on January 20th, 2025')

      await targetPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, `02-request-typed-${timestamp}.png`),
        fullPage: true,
      })
      console.log('✅ Captured: 02-request-typed')

      // Find and click the send button
      const sendButton = targetPage.locator('button').filter({ has: targetPage.locator('svg') }).last()

      if (await sendButton.isVisible({ timeout: 3000 })) {
        await sendButton.click()
        console.log('✅ Clicked send button')
      } else {
        await messageInput.press('Enter')
        console.log('✅ Pressed Enter to send')
      }

      await targetPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, `03-submitted-${timestamp}.png`),
        fullPage: true,
      })
      console.log('✅ Captured: 03-submitted')

      // Wait for initial response
      console.log('⏳ Waiting for Avinode response (5s)...')
      await targetPage.waitForTimeout(5000)

      await targetPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, `04-response-5s-${timestamp}.png`),
        fullPage: true,
      })
      console.log('✅ Captured: 04-response-5s')

      // Wait more for full response with aircraft options
      console.log('⏳ Waiting for full response (10s more)...')
      await targetPage.waitForTimeout(10000)

      await targetPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, `05-response-15s-${timestamp}.png`),
        fullPage: true,
      })
      console.log('✅ Captured: 05-response-15s')

      // Wait even more if needed
      console.log('⏳ Waiting for aircraft options (10s more)...')
      await targetPage.waitForTimeout(10000)

      await targetPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, `06-final-response-${timestamp}.png`),
        fullPage: true,
      })
      console.log('✅ Captured: 06-final-response')

      // Scroll down to see more content if any
      await targetPage.evaluate(() => {
        const chatContainer = document.querySelector('[class*="overflow-y-auto"]')
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight
        }
      })

      await targetPage.waitForTimeout(1000)

      await targetPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, `07-scrolled-${timestamp}.png`),
        fullPage: true,
      })
      console.log('✅ Captured: 07-scrolled')

    } else {
      console.log('⚠️ Message input not found - trying to click + New button first')

      // Try clicking the "+ New" button to start a new chat
      const newButton = targetPage.locator('button:has-text("New")').first()
      if (await newButton.isVisible({ timeout: 3000 })) {
        await newButton.click()
        console.log('✅ Clicked + New button')
        await targetPage.waitForTimeout(2000)

        await targetPage.screenshot({
          path: path.join(SCREENSHOTS_DIR, `02-new-chat-${timestamp}.png`),
          fullPage: true,
        })
      }
    }

    console.log(`\n✅ Screenshots saved to: ${SCREENSHOTS_DIR}`)
    await browser.close()

  } catch (error) {
    if ((error as Error).message.includes('ECONNREFUSED')) {
      console.log('❌ Could not connect to Chrome. Make sure it\'s running with --remote-debugging-port=9222')
    } else {
      console.error('Error:', error)
    }
  }
}

captureAvinodeResponse()
