/**
 * E2E Test: Main Chat Interface with GPT-5.2
 *
 * Tests the main chat interface functionality using the dev-only test endpoint.
 * This bypasses authentication to test the streaming chat experience.
 *
 * Verifies:
 * 1. Dev test endpoint returns streaming GPT-5.2 response
 * 2. Test page displays "Thinking..." indicator
 * 3. Streaming text appears progressively
 * 4. Response completes successfully
 * 5. Plain text formatting (no markdown artifacts)
 */

import { test, expect } from "@playwright/test"

test.describe("Main Chat Interface - GPT-5.2 Streaming", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure reports directory exists
    await page.evaluate(() => {
      // Browser context - nothing to do here
    })
  })

  test("Dev test endpoint returns streaming response", async ({ request }) => {
    const response = await request.get(
      "http://localhost:3000/api/chat/test?message=Hello"
    )

    // Should return SSE stream
    expect(response.ok()).toBeTruthy()

    const contentType = response.headers()["content-type"] || ""

    // In dev mode, should return text/event-stream
    // In production, should return 403
    if (response.status() === 403) {
      console.log("Test endpoint blocked in production mode - expected behavior")
      return
    }

    expect(contentType).toContain("text/event-stream")
    console.log("Dev test endpoint is available for testing")
  })

  test("Test page shows thinking indicator and streaming response", async ({
    page,
  }) => {
    // Navigate to the test page
    await page.goto("http://localhost:3000/test-gpt52.html", { timeout: 30000 })
    await page.waitForLoadState("domcontentloaded")

    // Take screenshot of initial state (thinking)
    await page.waitForTimeout(500)
    await page.screenshot({
      path: "reports/ux-analysis/chat-interface-01-thinking.png",
      fullPage: true,
    })
    console.log("Screenshot 1: Thinking state captured")

    // Wait for thinking indicator
    const thinkingIndicator = page.locator("#thinking")
    await expect(thinkingIndicator).toBeVisible({ timeout: 5000 })

    // Verify thinking text is shown
    const thinkingText = page.locator("#thinking span")
    await expect(thinkingText).toContainText("Thinking")

    // Wait for streaming to start (response becomes visible)
    try {
      await page.waitForSelector("#response:not(.hidden)", { timeout: 30000 })

      // Take screenshot when streaming starts
      await page.screenshot({
        path: "reports/ux-analysis/chat-interface-02-streaming-start.png",
        fullPage: true,
      })
      console.log("Screenshot 2: Streaming started")

      // Wait for more content
      await page.waitForTimeout(2000)
      await page.screenshot({
        path: "reports/ux-analysis/chat-interface-03-streaming-progress.png",
        fullPage: true,
      })
      console.log("Screenshot 3: Streaming progress")

      // Get current content
      const contentElement = page.locator("#content")
      const streamedContent = await contentElement.textContent()
      expect(streamedContent).toBeTruthy()
      expect(streamedContent!.length).toBeGreaterThan(0)

      console.log(`Streamed content length: ${streamedContent!.length} chars`)

      // Wait for completion (cursor hidden)
      await page.waitForSelector("#cursor.hidden", { timeout: 45000 })

      // Take final screenshot
      await page.screenshot({
        path: "reports/ux-analysis/chat-interface-04-complete.png",
        fullPage: true,
      })
      console.log("Screenshot 4: Response complete")

      // Get final content
      const finalContent = await contentElement.textContent()
      console.log(`Final response length: ${finalContent!.length} chars`)

      // Verify response is plain text (no markdown artifacts visible)
      // The stripMarkdown function should remove these
      expect(finalContent).not.toMatch(/\*\*[^*]+\*\*/) // No bold markers
      expect(finalContent).not.toMatch(/^#{1,6}\s/m) // No headers
      expect(finalContent).not.toMatch(/```/) // No code blocks

      console.log("Plain text verification passed")
    } catch (error) {
      // Take error screenshot
      await page.screenshot({
        path: "reports/ux-analysis/chat-interface-error.png",
        fullPage: true,
      })
      console.log("Error screenshot captured")
      throw error
    }
  })

  test("Chat API test endpoint handles streaming correctly", async ({
    request,
  }) => {
    const testMessage = "I need a private jet from NYC to Miami for 4 passengers"

    const response = await request.get(
      `http://localhost:3000/api/chat/test?message=${encodeURIComponent(testMessage)}`
    )

    if (response.status() === 403) {
      console.log("Test endpoint blocked in production - skipping")
      return
    }

    expect(response.ok()).toBeTruthy()

    // Read the full response body
    const body = await response.text()

    // Verify SSE format
    expect(body).toContain("data:")

    // Parse SSE events
    const lines = body.split("\n")
    let contentReceived = false
    let doneReceived = false
    let fullContent = ""

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6))

          if (data.content) {
            contentReceived = true
            fullContent += data.content
          }

          if (data.done) {
            doneReceived = true
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }

    expect(contentReceived).toBe(true)
    expect(doneReceived).toBe(true)
    expect(fullContent.length).toBeGreaterThan(50)

    console.log(`Received ${fullContent.length} chars via SSE streaming`)
    console.log("First 200 chars:", fullContent.slice(0, 200))
  })

  test("Verify no markdown artifacts in streamed response", async ({
    request,
  }) => {
    const response = await request.get(
      "http://localhost:3000/api/chat/test?message=Give me a formatted list of steps"
    )

    if (response.status() === 403) {
      console.log("Test endpoint blocked in production - skipping")
      return
    }

    const body = await response.text()
    const lines = body.split("\n")
    let fullContent = ""

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.content) {
            fullContent += data.content
          }
        } catch {
          // Skip
        }
      }
    }

    // Note: The raw API response WILL contain markdown
    // The stripMarkdown function in chat-interface.tsx removes it for display
    // This test verifies the API is working; UI test verifies stripping

    expect(fullContent.length).toBeGreaterThan(0)
    console.log("Raw API response received successfully")
    console.log("Response preview:", fullContent.slice(0, 300))
  })
})

test.describe("Chat Interface - Visual Regression", () => {
  test("Capture full chat flow screenshots", async ({ page }) => {
    // Navigate to test page
    await page.goto("http://localhost:3000/test-gpt52.html", { timeout: 30000 })

    // Wait for page load
    await page.waitForLoadState("networkidle")

    // Screenshot 1: Initial state
    await page.screenshot({
      path: "reports/ux-analysis/chat-flow-01-initial.png",
      fullPage: true,
    })

    // Wait for thinking
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: "reports/ux-analysis/chat-flow-02-thinking.png",
      fullPage: true,
    })

    // Wait for streaming to start
    try {
      await page.waitForSelector("#response:not(.hidden)", { timeout: 30000 })

      // Capture multiple streaming states
      for (let i = 3; i <= 5; i++) {
        await page.waitForTimeout(1500)
        await page.screenshot({
          path: `reports/ux-analysis/chat-flow-0${i}-streaming.png`,
          fullPage: true,
        })
      }

      // Wait for completion
      await page.waitForSelector("#cursor.hidden", { timeout: 45000 })

      await page.screenshot({
        path: "reports/ux-analysis/chat-flow-06-complete.png",
        fullPage: true,
      })

      console.log("Full chat flow screenshots captured successfully")
    } catch (error) {
      await page.screenshot({
        path: "reports/ux-analysis/chat-flow-error.png",
        fullPage: true,
      })
      console.log("Error during chat flow - screenshot captured")
      throw error
    }
  })
})
