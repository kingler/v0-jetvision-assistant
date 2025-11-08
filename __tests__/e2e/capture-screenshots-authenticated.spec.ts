import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots');
const AUTH_STATE_PATH = path.join(process.cwd(), '.auth', 'user.json');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function captureScreenshot(page: Page, name: string, description: string) {
  const filename = `${name}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`✓ Captured: ${name} - ${description}`);
  return filename;
}

async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('load');
  await page.waitForTimeout(2000); // Wait for React hydration
}

test.describe('Authenticated Screenshot Capture', () => {
  test.setTimeout(180000); // 3 minutes for full flow

  let capturedScreenshots: Array<{ name: string; description: string; filename: string }> = [];

  // Use saved authentication state
  test.use({ storageState: AUTH_STATE_PATH });

  test.beforeAll(async () => {
    // Check if auth state exists
    if (!fs.existsSync(AUTH_STATE_PATH)) {
      throw new Error(`Authentication state not found at ${AUTH_STATE_PATH}. Please run: npx playwright test auth-setup --headed --debug`);
    }
    console.log('\n🎬 Starting comprehensive screenshot capture (using saved authentication)...\n');
  });

  test.afterAll(async () => {
    // Generate index of captured screenshots
    const indexPath = path.join(SCREENSHOTS_DIR, 'INDEX.md');
    let indexContent = '# Jetvision App Screenshots\n\n';
    indexContent += `**Captured on**: ${new Date().toLocaleString()}\n`;
    indexContent += `**Total screenshots**: ${capturedScreenshots.length}\n\n`;
    indexContent += '## Screenshot Index\n\n';

    capturedScreenshots.forEach((item, index) => {
      indexContent += `${index + 1}. **${item.name}**: ${item.description}\n`;
      indexContent += `   ![${item.name}](${item.filename})\n\n`;
    });

    fs.writeFileSync(indexPath, indexContent);
    console.log(`\n✅ Screenshot capture complete! ${capturedScreenshots.length} screenshots saved to ./screenshots/`);
    console.log(`📄 Index created at: ${indexPath}\n`);
  });

  test('Complete authenticated app flow', async ({ page }) => {
    // ========================================================================
    // 1. AUTHENTICATED LANDING PAGE
    // ========================================================================
    console.log('\n📍 Section 1: Authenticated Landing Page');

    await page.goto('/');
    await waitForPageLoad(page);

    capturedScreenshots.push({
      name: '01-landing-page-authenticated',
      description: 'Landing page after authentication',
      filename: await captureScreenshot(page, '01-landing-page-authenticated', 'Authenticated landing')
    });

    // ========================================================================
    // 2. CHAT INTERFACE - INITIAL STATE
    // ========================================================================
    console.log('\n📍 Section 2: Chat Interface - Initial State');

    await page.waitForTimeout(1000);

    capturedScreenshots.push({
      name: '02-chat-initial-empty',
      description: 'Chat interface in empty state',
      filename: await captureScreenshot(page, '02-chat-initial-empty', 'Empty chat state')
    });

    // Capture suggested prompts if visible
    const suggestedPrompts = page.locator('[class*="suggested"], [class*="prompt-card"], button').first();
    if (await suggestedPrompts.isVisible({ timeout: 2000 }).catch(() => false)) {
      capturedScreenshots.push({
        name: '03-suggested-prompts',
        description: 'Suggested prompt cards or buttons',
        filename: await captureScreenshot(page, '03-suggested-prompts', 'Suggested prompts')
      });
    }

    // ========================================================================
    // 3. SIDEBAR STATES
    // ========================================================================
    console.log('\n📍 Section 3: Sidebar and Navigation');

    // Capture sidebar if visible
    const sidebar = page.locator('[class*="sidebar"], aside, nav').first();
    if (await sidebar.isVisible({ timeout: 2000 }).catch(() => false)) {
      capturedScreenshots.push({
        name: '04-sidebar-navigation',
        description: 'Chat sidebar with navigation',
        filename: await captureScreenshot(page, '04-sidebar-navigation', 'Sidebar visible')
      });
    }

    // Try to toggle sidebar/menu
    const menuButtons = page.locator('button[aria-label*="menu" i], button[aria-label*="sidebar" i], button:has-text("Menu")');
    const menuButton = menuButtons.first();
    if (await menuButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await menuButton.click();
      await page.waitForTimeout(500);
      capturedScreenshots.push({
        name: '05-sidebar-toggled',
        description: 'Sidebar in toggled state',
        filename: await captureScreenshot(page, '05-sidebar-toggled', 'Sidebar toggled')
      });

      // Toggle back
      await menuButton.click();
      await page.waitForTimeout(500);
    }

    // ========================================================================
    // 4. SETTINGS PANEL
    // ========================================================================
    console.log('\n📍 Section 4: Settings Panel');

    // Try to open settings (look for various possible selectors)
    const settingsSelectors = [
      'button[aria-label*="settings" i]',
      'button:has-text("Settings")',
      '[class*="settings"]',
      'button[aria-label*="configure" i]',
      'svg[class*="settings"], svg[class*="gear"], svg[class*="cog"]'
    ];

    let settingsOpened = false;
    for (const selector of settingsSelectors) {
      const settingsButton = page.locator(selector).first();
      if (await settingsButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await settingsButton.click();
        await page.waitForTimeout(1000);
        settingsOpened = true;
        break;
      }
    }

    if (settingsOpened) {
      capturedScreenshots.push({
        name: '06-settings-panel',
        description: 'Settings panel opened',
        filename: await captureScreenshot(page, '06-settings-panel', 'Settings panel')
      });

      // Capture sliders/controls if present
      const sliders = page.locator('input[type="range"], [class*="slider"], [role="slider"]');
      if (await sliders.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        capturedScreenshots.push({
          name: '07-settings-controls',
          description: 'Settings sliders and controls',
          filename: await captureScreenshot(page, '07-settings-controls', 'Slider controls')
        });
      }

      // Close settings
      const closeButtons = page.locator('button:has-text("Close"), [aria-label*="close" i], button[aria-label*="dismiss" i]');
      const closeButton = closeButtons.first();
      if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeButton.click();
        await page.waitForTimeout(500);
      }
    }

    // ========================================================================
    // 5. CHAT INTERACTION - FOCUS STATE
    // ========================================================================
    console.log('\n📍 Section 5: Chat Input Focus');

    // Find and focus chat input
    const chatInputSelectors = [
      'textarea[placeholder*="message" i]',
      'textarea[placeholder*="type" i]',
      'textarea',
      'input[type="text"]'
    ];

    let chatInput;
    for (const selector of chatInputSelectors) {
      const input = page.locator(selector).last();
      if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
        chatInput = input;
        break;
      }
    }

    if (chatInput) {
      await chatInput.focus();
      await page.waitForTimeout(500);
      capturedScreenshots.push({
        name: '08-chat-input-focused',
        description: 'Chat input field focused',
        filename: await captureScreenshot(page, '08-chat-input-focused', 'Input focused')
      });

      // Type a test message
      const testMessage = 'I need to charter a private jet from Los Angeles to New York for 6 passengers on December 15th.';
      await chatInput.fill(testMessage);
      await page.waitForTimeout(500);

      capturedScreenshots.push({
        name: '09-chat-message-typed',
        description: 'Message typed in chat input',
        filename: await captureScreenshot(page, '09-chat-message-typed', 'Message typed')
      });

      // Find and capture send button
      const sendButtons = page.locator('button[type="submit"], button:has-text("Send"), button[aria-label*="send" i]');
      const sendButton = sendButtons.last();
      if (await sendButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        capturedScreenshots.push({
          name: '10-chat-send-button-ready',
          description: 'Send button ready to click',
          filename: await captureScreenshot(page, '10-chat-send-button-ready', 'Send button ready')
        });

        // Send message
        await sendButton.click();
        await page.waitForTimeout(2000);

        capturedScreenshots.push({
          name: '11-chat-message-sent',
          description: 'Message sent, awaiting response',
          filename: await captureScreenshot(page, '11-chat-message-sent', 'Message sent')
        });

        // ========================================================================
        // 6. LOADING AND RESPONSE STATES
        // ========================================================================
        console.log('\n📍 Section 6: Loading and Response States');

        // Wait for and capture loading state if present
        await page.waitForTimeout(1000);
        const loadingIndicators = page.locator('[class*="loading"], [class*="spinner"], [class*="pulse"], [role="status"]');
        if (await loadingIndicators.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          capturedScreenshots.push({
            name: '12-chat-loading-state',
            description: 'Chat showing loading state',
            filename: await captureScreenshot(page, '12-chat-loading-state', 'Loading state')
          });
        }

        // Wait for response (up to 15 seconds)
        await page.waitForTimeout(15000);
        capturedScreenshots.push({
          name: '13-chat-with-response',
          description: 'Chat with AI response (if received)',
          filename: await captureScreenshot(page, '13-chat-with-response', 'Response state')
        });

        // ========================================================================
        // 7. WORKFLOW VISUALIZATION
        // ========================================================================
        console.log('\n📍 Section 7: Workflow Visualization');

        // Look for workflow visualization elements
        const workflowSelectors = [
          '[class*="workflow"]',
          '[class*="progress"]',
          '[class*="step"]',
          '[role="progressbar"]',
          '[class*="timeline"]'
        ];

        for (const selector of workflowSelectors) {
          const workflowElements = page.locator(selector);
          if (await workflowElements.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            capturedScreenshots.push({
              name: '14-workflow-visualization',
              description: 'Workflow progress visualization',
              filename: await captureScreenshot(page, '14-workflow-visualization', 'Workflow view')
            });
            break;
          }
        }
      }
    }

    // ========================================================================
    // 8. MOBILE RESPONSIVE VIEWS
    // ========================================================================
    console.log('\n📍 Section 8: Responsive Design Testing');

    // Mobile viewport (iPhone 13)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1000);

    capturedScreenshots.push({
      name: '15-mobile-chat-view',
      description: 'Chat interface on mobile (390px)',
      filename: await captureScreenshot(page, '15-mobile-chat-view', 'Mobile view')
    });

    // Tablet viewport (iPad)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);

    capturedScreenshots.push({
      name: '16-tablet-chat-view',
      description: 'Chat interface on tablet (768px)',
      filename: await captureScreenshot(page, '16-tablet-chat-view', 'Tablet view')
    });

    // Desktop viewport (standard)
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(1000);

    capturedScreenshots.push({
      name: '17-desktop-standard-view',
      description: 'Chat interface on desktop (1280px)',
      filename: await captureScreenshot(page, '17-desktop-standard-view', 'Desktop view')
    });

    // Wide desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);

    capturedScreenshots.push({
      name: '18-desktop-wide-view',
      description: 'Chat interface on wide desktop (1920px)',
      filename: await captureScreenshot(page, '18-desktop-wide-view', 'Desktop wide view')
    });

    // Reset to standard desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);

    // ========================================================================
    // 9. USER PROFILE/MENU
    // ========================================================================
    console.log('\n📍 Section 9: User Profile and Menu');

    // Try to open user menu/profile
    const userMenuSelectors = [
      '[class*="user"]',
      'button[aria-label*="user" i]',
      'button[aria-label*="account" i]',
      'button[aria-label*="profile" i]',
      '[class*="avatar"]'
    ];

    for (const selector of userMenuSelectors) {
      const userButton = page.locator(selector).first();
      if (await userButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await userButton.click();
        await page.waitForTimeout(1000);

        capturedScreenshots.push({
          name: '19-user-menu-open',
          description: 'User profile menu opened',
          filename: await captureScreenshot(page, '19-user-menu-open', 'User menu')
        });
        break;
      }
    }

    // ========================================================================
    // 10. HOVER STATES (sample)
    // ========================================================================
    console.log('\n📍 Section 10: Interactive Hover States');

    // Find first button and capture hover state
    const firstButton = page.locator('button').first();
    if (await firstButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await firstButton.hover();
      await page.waitForTimeout(300);

      capturedScreenshots.push({
        name: '20-button-hover-state',
        description: 'Button hover state example',
        filename: await captureScreenshot(page, '20-button-hover-state', 'Button hover')
      });
    }

    console.log('\n✨ All sections captured successfully!');
  });
});
