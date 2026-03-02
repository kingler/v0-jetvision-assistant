import { Page, expect } from '@playwright/test';
import { setupClerkTestingToken, clerk } from '@clerk/testing/playwright';
import * as fs from 'fs';
import * as path from 'path';

/** Base directory for demo screenshots (PNGs only — videos go to e2e-recordings/) */
export const SCREENSHOTS_DIR = path.join(
  process.cwd(),
  'e2e-screenshots'
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

/** Setup Clerk authentication and navigate to the chat interface */
export async function navigateToChat(page: Page): Promise<void> {
  const email = process.env.E2E_CLERK_USER_USERNAME;
  if (!email) {
    throw new Error(
      'Demo tests require E2E_CLERK_USER_USERNAME env var.'
    );
  }

  // Navigate to the app first so Clerk JS loads in the browser
  await setupClerkTestingToken({ page });
  await page.goto('/');
  await waitForPageLoad(page);

  // If redirected to sign-in, use Clerk Backend API sign-in
  // (bypasses UI form AND email OTP — uses CLERK_SECRET_KEY to create a sign-in token)
  if (page.url().includes('sign-in')) {
    await clerk.signIn({
      page,
      emailAddress: email,
    });

    // Navigate to main app after programmatic sign-in
    await page.goto('/');
    await waitForPageLoad(page);

    if (page.url().includes('sign-in')) {
      throw new Error(
        'Still on sign-in page after clerk.signIn(). Verify CLERK_SECRET_KEY is set and the test user exists.'
      );
    }
  }

  // Wait for chat interface (landing page uses <input>, chat view uses <input>)
  // Allow extra time — app may show "Loading..." while fetching user data
  await page.waitForSelector('textarea, input[placeholder*="message" i], [role="textbox"]', {
    timeout: 60_000,
  });
}

/** Type a message into the chat input and send it */
export async function sendChatMessage(
  page: Page,
  message: string
): Promise<void> {
  // Landing page uses <input placeholder="Type your message...">,
  // Active chat uses <input placeholder="Message about this request...">
  // Use case-insensitive CSS attribute selector (i flag)
  const chatInput = page.locator('textarea, input[placeholder*="message" i]').last();

  // Wait for input to be enabled (disabled during agent streaming)
  await chatInput.waitFor({ state: 'attached', timeout: 90_000 });
  await expect(chatInput).toBeEnabled({ timeout: 90_000 });

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

/** Wait for a new assistant message to appear after the current count */
export async function waitForAssistantReply(
  page: Page,
  timeout = 60_000
): Promise<void> {
  // Count existing agent messages so we can detect a NEW one
  const existingCount = await page.locator('text="Jetvision Agent"').count();

  // Wait for one more agent message than currently exists
  await page.waitForFunction(
    (expected) => {
      const labels = document.querySelectorAll('*');
      let count = 0;
      labels.forEach((el) => {
        if (el.textContent?.trim() === 'Jetvision Agent') count++;
      });
      return count > expected;
    },
    existingCount,
    { timeout }
  );

  // Wait for the input to re-enable (signals streaming is done)
  const chatInput = page.locator('textarea, input[placeholder*="message" i]').last();
  await expect(chatInput).toBeEnabled({ timeout: 60_000 });
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
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
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

/**
 * Supabase verification helper.
 *
 * Calls the Supabase REST API directly using the service-role key so that
 * RLS is bypassed and we can inspect any table.  Returns the first matching
 * row (most recent by created_at), or null if no rows match.
 */
export async function querySupabase(
  table: string,
  filters: Record<string, string>,
): Promise<Record<string, unknown> | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const params = new URLSearchParams();
  for (const [col, val] of Object.entries(filters)) {
    params.append(col, `eq.${val}`);
  }
  params.append('order', 'created_at.desc');
  params.append('limit', '1');

  const res = await fetch(`${url}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(
      `Supabase query failed: ${res.status} ${res.statusText} (table=${table})`
    );
  }
  const rows = await res.json();
  return rows[0] ?? null;
}

/**
 * Query Supabase and return ALL matching rows (ordered by created_at desc).
 */
export async function querySupabaseAll(
  table: string,
  filters: Record<string, string>,
): Promise<Record<string, unknown>[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const params = new URLSearchParams();
  for (const [col, val] of Object.entries(filters)) {
    params.append(col, `eq.${val}`);
  }
  params.append('order', 'created_at.desc');

  const res = await fetch(`${url}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(
      `Supabase query failed: ${res.status} ${res.statusText} (table=${table})`
    );
  }
  return res.json();
}
