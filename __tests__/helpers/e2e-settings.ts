/**
 * E2E Settings Dropdown Helper Functions
 *
 * Reusable utilities for interacting with the Settings dropdown in E2E tests.
 * Provides functions for finding, opening, and interacting with the Settings dropdown.
 */

import { Page, Locator } from '@playwright/test'

/**
 * Find the Settings button using multiple selector strategies
 *
 * @param page - Playwright page instance
 * @returns Locator for the Settings button, or null if not found
 */
export async function findSettingsButton(page: Page): Promise<Locator | null> {
  // Try to find by text first
  let settingsButton = page.locator('button').filter({ hasText: 'Settings' }).first()

  if (await settingsButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    return settingsButton
  }

  // If not found by text, try by icon
  settingsButton = page.locator('button').filter({
    has: page.locator('svg')
  }).filter({ hasText: /Settings|settings/ }).first()

  if (await settingsButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    return settingsButton
  }

  return null
}

/**
 * Open the Settings dropdown by clicking the Settings button
 *
 * @param page - Playwright page instance
 * @returns Locator for the dropdown content
 */
export async function openSettingsDropdown(page: Page): Promise<Locator> {
  const settingsButton = await findSettingsButton(page)

  if (!settingsButton) {
    throw new Error('Settings button not found on page. Cannot open dropdown.')
  }

  await settingsButton.click()

  // Wait for dropdown menu to appear
  const dropdownContent = page.locator('[role="menu"]').first()
  await dropdownContent.waitFor({ state: 'visible', timeout: 5000 })

  return dropdownContent
}

/**
 * Close the Settings dropdown by clicking outside
 *
 * @param page - Playwright page instance
 * @param dropdownContent - Locator for the dropdown content
 */
export async function closeSettingsDropdown(
  page: Page,
  dropdownContent: Locator
): Promise<void> {
  // Click outside the dropdown (top-left corner)
  await page.mouse.click(100, 100)

  // Wait for dropdown to close
  await dropdownContent.waitFor({ state: 'hidden', timeout: 2000 })
}

/**
 * Verify that a dropdown section is visible
 *
 * @param page - Playwright page instance
 * @param sectionName - Name of the section to verify
 * @returns Locator for the section
 */
export async function verifyDropdownSection(
  page: Page,
  sectionName: string
): Promise<Locator> {
  const section = page.locator(`text=${sectionName}`).first()
  await section.waitFor({ state: 'visible', timeout: 5000 })
  await section.scrollIntoViewIfNeeded()
  return section
}

/**
 * Get all expected dropdown sections
 *
 * @returns Array of section names
 */
export function getExpectedDropdownSections(): string[] {
  return [
    'Margin Configuration',
    'Commission Split Configuration',
    'Margin Calculator Preview'
  ]
}

/**
 * Find the commission percentage input in the dropdown
 *
 * @param page - Playwright page instance
 * @returns Locator for the commission percentage input, or null if not found
 */
export async function findCommissionInput(page: Page): Promise<Locator | null> {
  const input = page
    .locator('label:has-text("Commission Percentage")')
    .locator('..')
    .locator('input')
    .first()

  if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
    return input
  }

  return null
}

/**
 * @deprecated Use findCommissionInput instead. Kept for backward compatibility.
 */
export async function findMarginTypeSelector(page: Page): Promise<Locator | null> {
  return findCommissionInput(page)
}

/**
 * Find the client pricing toggle switch
 *
 * @param page - Playwright page instance
 * @returns Locator for the toggle switch, or null if not found
 */
export async function findClientPricingSwitch(page: Page): Promise<Locator | null> {
  const toggle = page.locator('#client-pricing')

  if (await toggle.isVisible({ timeout: 2000 }).catch(() => false)) {
    return toggle
  }

  return null
}

/**
 * Find the Save Settings button
 *
 * @param page - Playwright page instance
 * @returns Locator for the Save button, or null if not found
 */
export async function findSaveButton(page: Page): Promise<Locator | null> {
  const button = page.locator('button:has-text("Save Settings")')

  if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
    return button
  }

  return null
}

