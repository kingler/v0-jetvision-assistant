import { test, expect, Page } from '@playwright/test';
import { setupClerkTestingToken } from '@clerk/testing/playwright';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Chat Response Screenshot Tests
 *
 * Captures screenshots of:
 * 1. Landing page (empty state)
 * 2. Sign-in flow
 * 3. Chat interface components
 * 4. API responses
 */

const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots', 'chat-responses');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function captureScreenshot(page: Page, name: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot: ${filename}`);
  return filepath;
}

test.describe('Chat Response Screenshots', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test('Capture landing and sign-in flow', async ({ page }) => {
    console.log('\n=== Capturing Landing Page Flow ===\n');

    // Step 1: Navigate to app
    console.log('Step 1: Navigate to app');
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    await captureScreenshot(page, '01-initial-load');

    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // Step 2: Capture sign-in page if redirected
    if (currentUrl.includes('sign-in')) {
      console.log('Step 2: Capturing sign-in page');
      await captureScreenshot(page, '02-sign-in-page');

      // Check for Clerk sign-in elements
      const signInForm = page.locator('form, [data-clerk-component]');
      if (await signInForm.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('Sign-in form detected');
        await captureScreenshot(page, '02b-sign-in-form');
      }
    }

    // Step 3: Try to access chat page directly
    console.log('Step 3: Try /chat route');
    await page.goto('/chat');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    await captureScreenshot(page, '03-chat-route');

    // Step 4: Try dashboard
    console.log('Step 4: Try /dashboard route');
    await page.goto('/dashboard');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    await captureScreenshot(page, '04-dashboard-route');
  });

  test('Capture API health response', async ({ request, page }) => {
    console.log('\n=== Capturing API Health Response ===\n');

    // Get API health status
    const response = await request.get('/api/chat');
    const data = await response.json();

    console.log('API Health Response:');
    console.log(JSON.stringify(data, null, 2));

    // Create a page that displays the API response
    await page.goto('about:blank');
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Chat API Health</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1a2e;
            color: #eee;
            padding: 40px;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
          }
          h1 {
            color: #00d4ff;
            border-bottom: 2px solid #00d4ff;
            padding-bottom: 10px;
          }
          .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-weight: bold;
            margin-left: 10px;
          }
          .status.ok { background: #22c55e; color: #fff; }
          .status.mock { background: #f59e0b; color: #fff; }
          pre {
            background: #16213e;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            border: 1px solid #0f3460;
          }
          .tools {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 20px;
          }
          .tool {
            background: #0f3460;
            padding: 8px 16px;
            border-radius: 6px;
            border: 1px solid #00d4ff;
          }
          .section {
            margin: 30px 0;
          }
          .label {
            color: #888;
            font-size: 14px;
            margin-bottom: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>
            JetVision Chat API
            <span class="status ${data.status === 'ok' ? 'ok' : ''}">${data.status?.toUpperCase()}</span>
            <span class="status mock">${data.avinode_status?.toUpperCase()}</span>
          </h1>

          <div class="section">
            <div class="label">Configuration</div>
            <pre>${JSON.stringify({
              openai_configured: data.openai_configured,
              avinode_status: data.avinode_status,
              model: data.model
            }, null, 2)}</pre>
          </div>

          <div class="section">
            <div class="label">Available Avinode Tools</div>
            <div class="tools">
              ${data.tools?.map((t: string) => `<div class="tool">${t}</div>`).join('') || ''}
            </div>
          </div>

          <div class="section">
            <div class="label">Full Response</div>
            <pre>${JSON.stringify(data, null, 2)}</pre>
          </div>
        </div>
      </body>
      </html>
    `);

    await captureScreenshot(page, '05-api-health-response');
  });

  test('Capture Avinode MCP workflow simulation', async ({ page }) => {
    console.log('\n=== Capturing Avinode MCP Workflow ===\n');

    // Simulate the workflow response visualization
    const workflowSteps = [
      { step: 1, name: 'Search Flights', status: 'completed', result: 'Found 3 aircraft' },
      { step: 2, name: 'Create RFP', status: 'completed', result: 'Trip ID: atrip-64956151' },
      { step: 3, name: 'Get Quotes', status: 'completed', result: '2 quotes received' },
    ];

    const mockDeeplink = 'https://marketplace.avinode.com/trip/atrip-64956151';
    const mockQuotes = [
      { operator: 'Executive Jet Management', aircraft: 'Gulfstream G650', price: '$47,650' },
      { operator: 'NetJets', aircraft: 'Bombardier Global 7500', price: '$62,898' },
    ];

    await page.goto('about:blank');
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Avinode Workflow Simulation</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a1a;
            color: #eee;
            padding: 40px;
            margin: 0;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
          }
          h1 {
            color: #00d4ff;
            margin-bottom: 30px;
          }
          .workflow {
            background: #16213e;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 30px;
          }
          .step {
            display: flex;
            align-items: center;
            padding: 16px;
            margin: 10px 0;
            background: #1a1a2e;
            border-radius: 8px;
            border-left: 4px solid #22c55e;
          }
          .step-number {
            background: #22c55e;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            margin-right: 16px;
          }
          .step-content {
            flex: 1;
          }
          .step-name {
            font-weight: 600;
            color: #fff;
          }
          .step-result {
            color: #22c55e;
            font-size: 14px;
            margin-top: 4px;
          }
          .deeplink-card {
            background: linear-gradient(135deg, #0f3460 0%, #16213e 100%);
            border: 2px solid #00d4ff;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 30px;
          }
          .deeplink-title {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 16px;
          }
          .deeplink-title h3 {
            margin: 0;
            color: #00d4ff;
          }
          .deeplink-url {
            background: #0a0a1a;
            padding: 12px 16px;
            border-radius: 8px;
            font-family: monospace;
            color: #00d4ff;
            word-break: break-all;
          }
          .btn {
            background: #00d4ff;
            color: #000;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 16px;
          }
          .quotes {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
          }
          .quote-card {
            background: #16213e;
            border-radius: 12px;
            padding: 20px;
            border: 1px solid #0f3460;
          }
          .quote-operator {
            font-weight: 600;
            color: #fff;
            margin-bottom: 8px;
          }
          .quote-aircraft {
            color: #888;
            font-size: 14px;
          }
          .quote-price {
            font-size: 24px;
            font-weight: bold;
            color: #22c55e;
            margin-top: 12px;
          }
          .section-title {
            color: #888;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 16px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🛩️ Avinode Flight Request Workflow</h1>

          <div class="section-title">Workflow Progress</div>
          <div class="workflow">
            ${workflowSteps.map(s => `
              <div class="step">
                <div class="step-number">${s.step}</div>
                <div class="step-content">
                  <div class="step-name">${s.name}</div>
                  <div class="step-result">✓ ${s.result}</div>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="section-title">Avinode Deep Link</div>
          <div class="deeplink-card">
            <div class="deeplink-title">
              <span style="font-size: 24px;">🔗</span>
              <h3>Open in Avinode Marketplace</h3>
            </div>
            <div class="deeplink-url">${mockDeeplink}</div>
            <button class="btn">Open in Avinode →</button>
          </div>

          <div class="section-title">Received Quotes</div>
          <div class="quotes">
            ${mockQuotes.map((q, i) => `
              <div class="quote-card">
                <div class="quote-operator">${i === 0 ? '⭐ ' : ''}${q.operator}</div>
                <div class="quote-aircraft">${q.aircraft}</div>
                <div class="quote-price">${q.price}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </body>
      </html>
    `);

    await captureScreenshot(page, '06-avinode-workflow-simulation');
  });

  test('Capture chat interface mockup', async ({ page }) => {
    console.log('\n=== Capturing Chat Interface Mockup ===\n');

    const messages = [
      { type: 'user', content: 'I need a private jet from Teterboro (KTEB) to Miami (KMIA) for 6 passengers on January 20th, 2025' },
      { type: 'agent', content: 'I\'ll help you find the perfect aircraft for your trip from Teterboro to Miami. Let me search for available options...', showWorkflow: true },
      { type: 'agent', content: 'Great news! I found 3 suitable aircraft for your route. I\'ve created a request in the Avinode marketplace to get you the best quotes from our trusted operators.', showDeeplink: true },
    ];

    await page.goto('about:blank');
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>JetVision Chat Interface</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a1a;
            color: #eee;
            margin: 0;
            padding: 0;
            min-height: 100vh;
          }
          .chat-container {
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: #000;
            padding: 16px 24px;
            border-bottom: 1px solid #333;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .logo {
            color: #00d4ff;
            font-size: 24px;
            font-weight: bold;
          }
          .chat-header {
            background: #16213e;
            padding: 16px 24px;
            border-radius: 12px 12px 0 0;
            margin-top: 20px;
          }
          .chat-header h2 {
            margin: 0;
            font-size: 18px;
          }
          .chat-header p {
            margin: 4px 0 0;
            color: #888;
            font-size: 14px;
          }
          .messages {
            background: #1a1a2e;
            padding: 24px;
            min-height: 400px;
          }
          .message {
            max-width: 80%;
            margin-bottom: 20px;
            animation: fadeIn 0.3s ease;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .message.user {
            margin-left: auto;
          }
          .message.agent {
            margin-right: auto;
          }
          .message-bubble {
            padding: 16px 20px;
            border-radius: 16px;
            line-height: 1.5;
          }
          .message.user .message-bubble {
            background: #2563eb;
            border-bottom-right-radius: 4px;
          }
          .message.agent .message-bubble {
            background: #16213e;
            border: 1px solid #0f3460;
            border-bottom-left-radius: 4px;
          }
          .agent-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
          }
          .agent-avatar {
            width: 28px;
            height: 28px;
            background: #2563eb;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
          }
          .agent-name {
            font-size: 12px;
            color: #2563eb;
            font-weight: 600;
          }
          .workflow-card {
            background: #0f3460;
            border-radius: 8px;
            padding: 16px;
            margin-top: 12px;
          }
          .workflow-step {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 0;
          }
          .workflow-step .icon {
            color: #22c55e;
          }
          .deeplink-card {
            background: linear-gradient(135deg, #0f3460 0%, #1a1a2e 100%);
            border: 1px solid #00d4ff;
            border-radius: 8px;
            padding: 16px;
            margin-top: 12px;
          }
          .deeplink-btn {
            background: #00d4ff;
            color: #000;
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            margin-top: 12px;
            cursor: pointer;
          }
          .input-area {
            background: #16213e;
            padding: 16px 24px;
            border-radius: 0 0 12px 12px;
            display: flex;
            gap: 12px;
          }
          .input-field {
            flex: 1;
            background: #0a0a1a;
            border: 1px solid #0f3460;
            border-radius: 8px;
            padding: 12px 16px;
            color: #fff;
            font-size: 14px;
          }
          .send-btn {
            background: #2563eb;
            border: none;
            border-radius: 8px;
            padding: 12px 20px;
            color: #fff;
            cursor: pointer;
          }
          .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
          }
          .badge.mock {
            background: #f59e0b;
            color: #000;
          }
          .quick-actions {
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
            flex-wrap: wrap;
          }
          .quick-action {
            background: #0f3460;
            border: 1px solid #16213e;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            color: #888;
          }
          .quick-action:hover {
            border-color: #00d4ff;
            color: #00d4ff;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">✈️ JetVision</div>
          <div>
            <span class="badge mock">MOCK MODE</span>
          </div>
        </div>

        <div class="chat-container">
          <div class="chat-header">
            <h2>Flight Request #1</h2>
            <p>KTEB → KMIA • 6 passengers • January 20, 2025</p>
          </div>

          <div class="messages">
            ${messages.map((m, i) => `
              <div class="message ${m.type}" style="animation-delay: ${i * 0.2}s">
                ${m.type === 'agent' ? `
                  <div class="agent-header">
                    <div class="agent-avatar">🤖</div>
                    <span class="agent-name">JetVision Agent</span>
                  </div>
                ` : ''}
                <div class="message-bubble">
                  ${m.content}
                  ${m.showWorkflow ? `
                    <div class="workflow-card">
                      <div class="workflow-step">
                        <span class="icon">✓</span>
                        <span>Understanding request</span>
                      </div>
                      <div class="workflow-step">
                        <span class="icon">✓</span>
                        <span>Searching aircraft</span>
                      </div>
                      <div class="workflow-step">
                        <span class="icon">⏳</span>
                        <span>Requesting quotes...</span>
                      </div>
                    </div>
                  ` : ''}
                  ${m.showDeeplink ? `
                    <div class="deeplink-card">
                      <strong>🔗 Avinode Trip Created</strong>
                      <p style="margin: 8px 0; color: #888; font-size: 13px;">
                        Trip ID: atrip-64956151
                      </p>
                      <button class="deeplink-btn">Open in Avinode Marketplace →</button>
                    </div>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>

          <div class="input-area">
            <div style="flex: 1;">
              <div class="quick-actions">
                <button class="quick-action">🔗 Connect Trip</button>
                <button class="quick-action">📋 View Quotes</button>
                <button class="quick-action">✏️ Update Details</button>
              </div>
              <input type="text" class="input-field" placeholder="Message about Flight Request #1..." />
            </div>
            <button class="send-btn">Send</button>
          </div>
        </div>
      </body>
      </html>
    `);

    await captureScreenshot(page, '07-chat-interface-mockup');
  });

  test('Capture empty sidebar state', async ({ page }) => {
    console.log('\n=== Capturing Empty Sidebar State ===\n');

    await page.goto('about:blank');
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>JetVision - Empty State</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a1a;
            color: #eee;
            margin: 0;
            display: flex;
            min-height: 100vh;
          }
          .sidebar {
            width: 320px;
            background: #16213e;
            border-right: 1px solid #0f3460;
            padding: 20px;
          }
          .sidebar-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          .sidebar-header h2 {
            margin: 0;
            font-size: 18px;
          }
          .new-btn {
            background: #00d4ff;
            color: #000;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
          }
          .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: #888;
          }
          .empty-state .icon {
            font-size: 48px;
            margin-bottom: 16px;
          }
          .empty-state h3 {
            color: #fff;
            margin-bottom: 8px;
          }
          .count {
            font-size: 12px;
            color: #888;
            margin-top: 8px;
          }
          .main-content {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #1a1a2e;
          }
          .landing {
            text-align: center;
            max-width: 600px;
            padding: 40px;
          }
          .landing h1 {
            font-size: 32px;
            margin-bottom: 16px;
          }
          .landing p {
            color: #888;
            line-height: 1.6;
          }
          .landing-input {
            margin-top: 30px;
            display: flex;
            gap: 12px;
          }
          .landing-input input {
            flex: 1;
            background: #16213e;
            border: 1px solid #0f3460;
            padding: 16px 20px;
            border-radius: 8px;
            color: #fff;
            font-size: 16px;
          }
          .landing-input button {
            background: #00d4ff;
            color: #000;
            border: none;
            padding: 16px 24px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
          }
          .highlight {
            color: #00d4ff;
          }
        </style>
      </head>
      <body>
        <div class="sidebar">
          <div class="sidebar-header">
            <h2>Open Chats</h2>
            <button class="new-btn">+ New</button>
          </div>
          <p class="count">0 active flight requests</p>

          <div class="empty-state">
            <div class="icon">✈️</div>
            <h3>No Flight Requests Yet</h3>
            <p>Start a new conversation to search for flights and get quotes from operators.</p>
          </div>
        </div>

        <div class="main-content">
          <div class="landing">
            <h1>Welcome to <span class="highlight">JetVision</span></h1>
            <p>Your AI-powered private jet booking assistant. Tell me about your trip and I'll find the perfect aircraft for you.</p>

            <div class="landing-input">
              <input type="text" placeholder="e.g., I need a flight from New York to Miami for 6 passengers next Friday" />
              <button>Send →</button>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);

    await captureScreenshot(page, '08-empty-sidebar-state');
  });
});
