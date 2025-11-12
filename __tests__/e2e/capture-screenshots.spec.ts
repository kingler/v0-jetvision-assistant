import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots');
const GOOGLE_EMAIL = process.env.TEST_GOOGLE_EMAIL!;
const GOOGLE_PASSWORD = process.env.TEST_GOOGLE_PASSWORD!;

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
  // Use 'load' instead of 'networkidle' for Next.js dev server
  await page.waitForLoadState('load');
  await page.waitForTimeout(2000); // Wait for React hydration and animations
}

test.describe('Jetvision App Screenshot Capture', () => {
  test.setTimeout(180000); // 3 minutes for full flow with authentication

  let capturedScreenshots: Array<{ name: string; description: string; filename: string }> = [];

  test.beforeAll(async () => {
    console.log('\n🎬 Starting comprehensive screenshot capture...\n');
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

  test('Complete app flow with authentication', async ({ page, context }) => {
    // ========================================================================
    // 1. LANDING PAGE (Pre-auth)
    // ========================================================================
    console.log('\n📍 Section 1: Landing Page (Pre-auth)');

    await page.goto('/');
    await waitForPageLoad(page);
    capturedScreenshots.push({
      name: '01-landing-page-pre-auth',
      description: 'Initial landing page before authentication',
      filename: await captureScreenshot(page, '01-landing-page-pre-auth', 'Landing page before login')
    });

    // ========================================================================
    // 2. SIGN IN PAGE
    // ========================================================================
    console.log('\n📍 Section 2: Sign In Flow');

    // Click sign in button
    const signInButton = page.locator('a[href*="sign-in"], button:has-text("Sign in")').first();
    if (await signInButton.isVisible()) {
      await signInButton.click();
      await waitForPageLoad(page);
    }

    capturedScreenshots.push({
      name: '02-sign-in-page',
      description: 'Clerk sign-in page',
      filename: await captureScreenshot(page, '02-sign-in-page', 'Sign in page')
    });

    // ========================================================================
    // 3. GOOGLE OAUTH FLOW
    // ========================================================================
    console.log('\n📍 Section 3: Google OAuth Authentication');

    // Click "Continue with Google"
    const googleButton = page.locator('button:has-text("Continue with Google"), .cl-socialButtonsIconButton__google').first();

    if (await googleButton.isVisible()) {
      capturedScreenshots.push({
        name: '03-google-oauth-button',
        description: 'Google OAuth button before clicking',
        filename: await captureScreenshot(page, '03-google-oauth-button', 'Before Google OAuth')
      });

      // Start waiting for popup before clicking
      const popupPromise = context.waitForEvent('page');
      await googleButton.click();
      const popup = await popupPromise;

      await popup.waitForLoadState('networkidle');
      await popup.waitForTimeout(2000);

      capturedScreenshots.push({
        name: '04-google-login-page',
        description: 'Google login page',
        filename: await captureScreenshot(popup, '04-google-login-page', 'Google login page')
      });

      // Enter email
      const emailInput = popup.locator('input[type="email"]').first();
      await emailInput.waitFor({ state: 'visible' });
      await emailInput.fill(GOOGLE_EMAIL);

      capturedScreenshots.push({
        name: '05-google-email-entered',
        description: 'Email entered in Google login',
        filename: await captureScreenshot(popup, '05-google-email-entered', 'Email filled')
      });

      await popup.locator('button:has-text("Next"), #identifierNext').first().click();
      await popup.waitForLoadState('networkidle');
      await popup.waitForTimeout(2000);

      capturedScreenshots.push({
        name: '06-google-password-page',
        description: 'Google password entry page',
        filename: await captureScreenshot(popup, '06-google-password-page', 'Password page')
      });

      // Enter password
      const passwordInput = popup.locator('input[type="password"]').first();
      await passwordInput.waitFor({ state: 'visible' });
      await passwordInput.fill(GOOGLE_PASSWORD);

      capturedScreenshots.push({
        name: '07-google-password-entered',
        description: 'Password entered (hidden)',
        filename: await captureScreenshot(popup, '07-google-password-entered', 'Password filled')
      });

      await popup.locator('button:has-text("Next"), #passwordNext').first().click();

      // Wait for authentication to complete
      await page.waitForURL('/', { timeout: 30000 });
      await waitForPageLoad(page);

      console.log('✓ Google authentication successful!');
    }

    // ========================================================================
    // 4. AUTHENTICATED LANDING PAGE
    // ========================================================================
    console.log('\n📍 Section 4: Authenticated Landing Page');

    await waitForPageLoad(page);
    capturedScreenshots.push({
      name: '08-landing-page-authenticated',
      description: 'Landing page after successful authentication',
      filename: await captureScreenshot(page, '08-landing-page-authenticated', 'Authenticated landing')
    });

    // ========================================================================
    // 5. CHAT INTERFACE - INITIAL STATE
    // ========================================================================
    console.log('\n📍 Section 5: Chat Interface - Initial State');

    // Wait for chat interface to load
    await page.waitForTimeout(2000);

    capturedScreenshots.push({
      name: '09-chat-initial-empty',
      description: 'Chat interface in empty state',
      filename: await captureScreenshot(page, '09-chat-initial-empty', 'Empty chat state')
    });

    // Capture suggested prompts if visible
    const suggestedPrompts = page.locator('[class*="suggested"], [class*="prompt-card"]');
    if (await suggestedPrompts.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      capturedScreenshots.push({
        name: '10-suggested-prompts',
        description: 'Suggested prompt cards',
        filename: await captureScreenshot(page, '10-suggested-prompts', 'Suggested prompts')
      });
    }

    // ========================================================================
    // 6. SIDEBAR STATES
    // ========================================================================
    console.log('\n📍 Section 6: Sidebar and Navigation');

    // Capture sidebar if visible
    const sidebar = page.locator('[class*="sidebar"], aside, nav').first();
    if (await sidebar.isVisible({ timeout: 2000 }).catch(() => false)) {
      capturedScreenshots.push({
        name: '11-sidebar-navigation',
        description: 'Chat sidebar with navigation',
        filename: await captureScreenshot(page, '11-sidebar-navigation', 'Sidebar visible')
      });
    }

    // Try to toggle sidebar
    const menuButton = page.locator('button[aria-label*="menu"], button:has-text("Menu")').first();
    if (await menuButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await menuButton.click();
      await page.waitForTimeout(500);
      capturedScreenshots.push({
        name: '12-sidebar-toggled',
        description: 'Sidebar in toggled state',
        filename: await captureScreenshot(page, '12-sidebar-toggled', 'Sidebar toggled')
      });
    }

    // ========================================================================
    // 7. SETTINGS PANEL
    // ========================================================================
    console.log('\n📍 Section 7: Settings Panel');

    // Try to open settings
    const settingsButton = page.locator('button[aria-label*="settings"], button:has-text("Settings"), [class*="settings"]').first();
    if (await settingsButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await settingsButton.click();
      await page.waitForTimeout(1000);

      capturedScreenshots.push({
        name: '13-settings-panel',
        description: 'Settings panel opened',
        filename: await captureScreenshot(page, '13-settings-panel', 'Settings panel')
      });

      // Capture margin slider interactions
      const marginSlider = page.locator('input[type="range"], [class*="slider"]').first();
      if (await marginSlider.isVisible({ timeout: 1000 }).catch(() => false)) {
        capturedScreenshots.push({
          name: '14-settings-sliders',
          description: 'Settings sliders and controls',
          filename: await captureScreenshot(page, '14-settings-sliders', 'Slider controls')
        });
      }

      // Close settings
      const closeButton = page.locator('button:has-text("Close"), [aria-label*="close"]').first();
      if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeButton.click();
        await page.waitForTimeout(500);
      }
    }

    // ========================================================================
    // 8. CHAT INTERACTION - SENDING MESSAGE
    // ========================================================================
    console.log('\n📍 Section 8: Chat Interaction');

    // Find chat input
    const chatInput = page.locator('textarea, input[type="text"]').last();
    await chatInput.waitFor({ state: 'visible', timeout: 5000 });

    // Focus on input
    await chatInput.focus();
    await page.waitForTimeout(500);
    capturedScreenshots.push({
      name: '15-chat-input-focused',
      description: 'Chat input field focused',
      filename: await captureScreenshot(page, '15-chat-input-focused', 'Input focused')
    });

    // Type a test message
    const testMessage = 'I need to charter a private jet from Los Angeles to New York for 6 passengers on December 15th.';
    await chatInput.fill(testMessage);
    await page.waitForTimeout(500);

    capturedScreenshots.push({
      name: '16-chat-message-typed',
      description: 'Message typed in chat input',
      filename: await captureScreenshot(page, '16-chat-message-typed', 'Message typed')
    });

    // Send message
    const sendButton = page.locator('button[type="submit"], button:has-text("Send"), button[aria-label*="send"]').last();
    if (await sendButton.isVisible()) {
      capturedScreenshots.push({
        name: '17-chat-send-button-ready',
        description: 'Send button ready to click',
        filename: await captureScreenshot(page, '17-chat-send-button-ready', 'Send button ready')
      });

      await sendButton.click();
      await page.waitForTimeout(2000);

      capturedScreenshots.push({
        name: '18-chat-message-sent',
        description: 'Message sent, awaiting response',
        filename: await captureScreenshot(page, '18-chat-message-sent', 'Message sent')
      });
    }

    // ========================================================================
    // 9. LOADING AND RESPONSE STATES
    // ========================================================================
    console.log('\n📍 Section 9: Loading and Response States');

    // Wait for and capture loading state
    await page.waitForTimeout(1000);
    const loadingIndicator = page.locator('[class*="loading"], [class*="spinner"], [class*="pulse"]').first();
    if (await loadingIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
      capturedScreenshots.push({
        name: '19-chat-loading-state',
        description: 'Chat showing loading state',
        filename: await captureScreenshot(page, '19-chat-loading-state', 'Loading state')
      });
    }

    // Wait for response (up to 30 seconds)
    await page.waitForTimeout(5000);
    capturedScreenshots.push({
      name: '20-chat-with-response',
      description: 'Chat with AI response',
      filename: await captureScreenshot(page, '20-chat-with-response', 'Response received')
    });

    // ========================================================================
    // 10. WORKFLOW VISUALIZATION
    // ========================================================================
    console.log('\n📍 Section 10: Workflow Visualization');

    // Look for workflow visualization elements
    const workflowElements = page.locator('[class*="workflow"], [class*="progress"], [class*="step"]');
    if (await workflowElements.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      capturedScreenshots.push({
        name: '21-workflow-visualization',
        description: 'Workflow progress visualization',
        filename: await captureScreenshot(page, '21-workflow-visualization', 'Workflow view')
      });
    }

    // ========================================================================
    // 11. MOBILE RESPONSIVE VIEWS
    // ========================================================================
    console.log('\n📍 Section 11: Mobile Responsive Views');

    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X
    await page.waitForTimeout(1000);

    capturedScreenshots.push({
      name: '22-mobile-chat-view',
      description: 'Chat interface on mobile (375px)',
      filename: await captureScreenshot(page, '22-mobile-chat-view', 'Mobile view')
    });

    // Tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.waitForTimeout(1000);

    capturedScreenshots.push({
      name: '23-tablet-chat-view',
      description: 'Chat interface on tablet (768px)',
      filename: await captureScreenshot(page, '23-tablet-chat-view', 'Tablet view')
    });

    // Desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
    await page.waitForTimeout(1000);

    capturedScreenshots.push({
      name: '24-desktop-wide-view',
      description: 'Chat interface on wide desktop (1920px)',
      filename: await captureScreenshot(page, '24-desktop-wide-view', 'Desktop wide view')
    });

    // ========================================================================
    // 12. ERROR STATES (IF ACCESSIBLE)
    // ========================================================================
    console.log('\n📍 Section 12: Error and Edge States');

    // Try to trigger empty input validation
    const inputField = page.locator('textarea, input[type="text"]').last();
    await inputField.fill('');
    const submitButton = page.locator('button[type="submit"]').last();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(500);

      if (await page.locator('[class*="error"], [role="alert"]').first().isVisible({ timeout: 1000 }).catch(() => false)) {
        capturedScreenshots.push({
          name: '25-validation-error-state',
          description: 'Validation error for empty input',
          filename: await captureScreenshot(page, '25-validation-error-state', 'Validation error')
        });
      }
    }

    // ========================================================================
    // 13. USER PROFILE/MENU
    // ========================================================================
    console.log('\n📍 Section 13: User Profile and Menu');

    // Try to open user menu
    const userButton = page.locator('[class*="user"], button[aria-label*="user"], button[aria-label*="account"]').first();
    if (await userButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await userButton.click();
      await page.waitForTimeout(1000);

      capturedScreenshots.push({
        name: '26-user-menu-open',
        description: 'User profile menu opened',
        filename: await captureScreenshot(page, '26-user-menu-open', 'User menu')
      });
    }

    console.log('\n✨ All sections captured successfully!');
  });
});
