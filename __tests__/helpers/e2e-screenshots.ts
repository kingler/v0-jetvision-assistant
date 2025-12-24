/**
 * E2E Screenshot Helper Functions
 *
 * Reusable utilities for capturing screenshots in E2E tests.
 * Provides consistent screenshot naming and directory management.
 */

import { Page } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Ensure a screenshots directory exists
 *
 * @param dirPath - Path to the screenshots directory
 */
export function ensureScreenshotsDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

/**
 * Capture a screenshot with consistent naming
 *
 * @param page - Playwright page instance
 * @param dirPath - Directory path for screenshots
 * @param filename - Filename for the screenshot (without extension)
 * @param options - Screenshot options
 * @returns Full path to the saved screenshot
 */
export async function captureScreenshot(
  page: Page,
  dirPath: string,
  filename: string,
  options?: { fullPage?: boolean }
): Promise<string> {
  ensureScreenshotsDir(dirPath)

  const filepath = path.join(dirPath, `${filename}.png`)
  await page.screenshot({
    path: filepath,
    fullPage: options?.fullPage ?? false
  })

  return filepath
}

/**
 * List all screenshots in a directory
 *
 * @param dirPath - Directory path to list screenshots from
 * @returns Array of screenshot filenames, sorted
 */
export function listScreenshots(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) {
    return []
  }

  return fs
    .readdirSync(dirPath)
    .filter((file) => file.endsWith('.png'))
    .sort()
}

