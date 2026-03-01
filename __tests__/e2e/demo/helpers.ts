import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/** Base directory for demo screenshots */
export const SCREENSHOTS_DIR = path.join(
  process.cwd(),
  'e2e-screenshots',
  'recordings'
);

/** Ensure screenshots directory exists */
export function ensureScreenshotDir(subdir?: string): string {
  const dir = subdir
    ? path.join(SCREENSHOTS_DIR, subdir)
    : SCREENSHOTS_DIR;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/** Capture a named screenshot in the given subdirectory */
export async function captureScreenshot(
  page: Page,
  name: string,
  subdir?: string
): Promise<string> {
  const dir = ensureScreenshotDir(subdir);
  const filepath = path.join(dir, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  return filepath;
}

/** Wait for the page to reach a stable loaded state */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('load');
  await page.waitForTimeout(1500);
}

/** Navigate to the app root and wait for the chat interface */
export async function navigateToChat(page: Page): Promise<void> {
  await page.goto('/');
  await waitForPageLoad(page);
  await page.waitForSelector('textarea, input[type="text"]', {
    timeout: 30_000,
  });
}

/** Type a message into the chat input and send it */
export async function sendChatMessage(
  page: Page,
  message: string
): Promise<void> {
  const chatInput = page.locator('textarea').last();
  await chatInput.fill(message);
  await chatInput.press('Enter');
}

/** Wait for the agent to respond with a specific component */
export async function waitForComponent(
  page: Page,
  selector: string,
  timeout = 60_000
): Promise<void> {
  await page.waitForSelector(selector, { timeout });
}

/** Wait for any new assistant message to appear after sending */
export async function waitForAssistantReply(
  page: Page,
  timeout = 60_000
): Promise<void> {
  await page.waitForSelector(
    '[data-role="assistant"], .assistant-message, [data-testid="assistant-message"]',
    { timeout }
  );
}

/** Assert that a component is NOT visible (useful for ambiguous flow checks) */
export async function assertNotVisible(
  page: Page,
  selector: string,
  timeout = 5_000
): Promise<void> {
  const count = await page.locator(selector).count();
  expect(count).toBe(0);
}

/** Verify text content is visible on the page */
export async function assertTextVisible(
  page: Page,
  text: string
): Promise<void> {
  await expect(page.getByText(text, { exact: false })).toBeVisible();
}

/** Click a button by its text content */
export async function clickButton(
  page: Page,
  text: string
): Promise<void> {
  await page.getByRole('button', { name: text }).click();
}

/** Pause briefly for demo pacing (on top of slowMo) */
export async function demoPause(
  page: Page,
  ms = 1000
): Promise<void> {
  await page.waitForTimeout(ms);
}
