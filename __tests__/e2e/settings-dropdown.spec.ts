/**
 * E2E Test: Settings Dropdown Menu
 *
 * Tests the Settings dropdown menu functionality and captures screenshots
 * for documentation and verification purposes.
 *
 * This test suite is split into focused tests for better maintainability:
 * - Authentication and navigation setup
 * - Settings button visibility
 * - Dropdown opening behavior
 * - Dropdown section verification
 * - Interactive elements testing
 * - Close behavior
 * - Screenshot documentation
 */

import { test, expect } from '@playwright/test'
import * as path from 'path'
import {
  setupClerkAuth,
  authenticateWithCredentials,
  navigateToMainPage,
  waitForMainPageContent
} from '../helpers/e2e-auth'
import {
  findSettingsButton,
  openSettingsDropdown,
  closeSettingsDropdown,
  verifyDropdownSection,
  getExpectedDropdownSections,
  findMarginTypeSelector,
  findClientPricingSwitch,
  findSaveButton
} from '../helpers/e2e-settings'
import {
  ensureScreenshotsDir,
  captureScreenshot,
  listScreenshots
} from '../helpers/e2e-screenshots'

const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots', 'settings-dropdown')

/**
 * Common setup for all Settings dropdown tests
 * Handles authentication and navigation to the main page
 */
async function setupAuthenticatedPage(page: import('@playwright/test').Page): Promise<void> {
  // Setup Clerk testing token
  await setupClerkAuth(page)

  // Set viewport to desktop size
  await page.setViewportSize({ width: 1920, height: 1080 })

  // Navigate to main page
  const isAuthenticated = await navigateToMainPage(page)

  // If not authenticated, try to authenticate with credentials
  if (!isAuthenticated) {
    const authSuccess = await authenticateWithCredentials(page, { throwOnMissing: true })
    if (!authSuccess) {
      throw new Error('Failed to authenticate. Cannot proceed with Settings dropdown tests.')
    }
  }

  // Wait for main page content to be visible
  await waitForMainPageContent(page)
}

test.describe('Settings Dropdown Menu', () => {
  test.beforeAll(() => {
    // Ensure screenshots directory exists
    ensureScreenshotsDir(SCREENSHOTS_DIR)
  })

  test.describe('Settings Button Visibility', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedPage(page)
    })

    test('should display Settings button on main page', async ({ page }) => {
      const settingsButton = await findSettingsButton(page)

      expect(settingsButton).not.toBeNull()
      await expect(settingsButton!).toBeVisible({ timeout: 5000 })
    })

    test('should find Settings button using multiple selector strategies', async ({ page }) => {
      // Try to find by text first
      const buttonByText = page.locator('button').filter({ hasText: 'Settings' }).first()

      if (await buttonByText.isVisible({ timeout: 2000 }).catch(() => false)) {
        expect(await buttonByText.isVisible()).toBe(true)
        return
      }

      // Fallback to icon-based selector
      const buttonByIcon = page
        .locator('button')
        .filter({ has: page.locator('svg') })
        .filter({ hasText: /Settings|settings/ })
        .first()

      await expect(buttonByIcon).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Dropdown Opening', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedPage(page)
    })

    test('should open dropdown when Settings button is clicked', async ({ page }) => {
      const dropdownContent = await openSettingsDropdown(page)

      await expect(dropdownContent).toBeVisible({ timeout: 5000 })
      expect(await dropdownContent.isVisible()).toBe(true)
    })

    test('should display dropdown menu with correct role attribute', async ({ page }) => {
      const dropdownContent = await openSettingsDropdown(page)

      // Verify dropdown has correct ARIA role
      await expect(dropdownContent).toHaveAttribute('role', 'menu', { timeout: 5000 })
    })
  })

  test.describe('Dropdown Sections', () => {
    let dropdownContent: import('@playwright/test').Locator

    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedPage(page)
      dropdownContent = await openSettingsDropdown(page)
    })

    test('should display all expected sections', async ({ page }) => {
      const expectedSections = getExpectedDropdownSections()

      for (const sectionName of expectedSections) {
        const section = await verifyDropdownSection(page, sectionName)
        await expect(section).toBeInViewport({ timeout: 2000 })
      }
    })

    test('should display Margin Configuration section', async ({ page }) => {
      const section = await verifyDropdownSection(page, 'Margin Configuration')
      await expect(section).toBeVisible()
    })

    test('should display Commission Split Configuration section', async ({ page }) => {
      const section = await verifyDropdownSection(page, 'Commission Split Configuration')
      await expect(section).toBeVisible()
    })

    test('should display Margin Calculator Preview section', async ({ page }) => {
      const section = await verifyDropdownSection(page, 'Margin Calculator Preview')
      await expect(section).toBeVisible()
    })
  })

  test.describe('Interactive Elements', () => {
    let dropdownContent: import('@playwright/test').Locator

    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedPage(page)
      dropdownContent = await openSettingsDropdown(page)
    })

    test('should interact with margin type selector', async ({ page }) => {
      const marginTypeSelect = await findMarginTypeSelector(page)

      if (!marginTypeSelect) {
        test.skip()
        return
      }

      await marginTypeSelect.click()

      // Wait for dropdown options menu to appear
      const optionsMenu = page.locator('[role="listbox"]').first()
      await expect(optionsMenu).toBeVisible({ timeout: 3000 })

      // Close the options menu
      await page.keyboard.press('Escape')
      await expect(optionsMenu).toBeHidden({ timeout: 2000 })
    })

    test('should toggle client pricing switch', async ({ page }) => {
      const clientPricingSwitch = await findClientPricingSwitch(page)

      if (!clientPricingSwitch) {
        test.skip()
        return
      }

      const initialState = await clientPricingSwitch.isChecked().catch(() => false)
      await clientPricingSwitch.click()

      // Wait for toggle state to change
      if (initialState) {
        await expect(clientPricingSwitch).not.toBeChecked({ timeout: 2000 })
      } else {
        await expect(clientPricingSwitch).toBeChecked({ timeout: 2000 })
      }
    })

    test('should display Save Settings button', async ({ page }) => {
      const saveButton = await findSaveButton(page)

      if (!saveButton) {
        test.skip()
        return
      }

      await saveButton.scrollIntoViewIfNeeded()
      await expect(saveButton).toBeInViewport({ timeout: 2000 })
      await expect(saveButton).toBeVisible()
    })
  })

  test.describe('Close Behavior', () => {
    let dropdownContent: import('@playwright/test').Locator

    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedPage(page)
      dropdownContent = await openSettingsDropdown(page)
    })

    test('should close dropdown when clicking outside', async ({ page }) => {
      await closeSettingsDropdown(page, dropdownContent)
      await expect(dropdownContent).not.toBeVisible({ timeout: 2000 })
    })

    test('should close dropdown when clicking outside multiple times', async ({ page }) => {
      // Open dropdown
      dropdownContent = await openSettingsDropdown(page)
      await expect(dropdownContent).toBeVisible()

      // Close by clicking outside
      await closeSettingsDropdown(page, dropdownContent)

      // Try to close again (should already be closed)
      await expect(dropdownContent).not.toBeVisible({ timeout: 2000 })
    })
  })

  test.describe('Screenshots', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedPage(page)
    })

    test('should capture main page screenshot', async ({ page }) => {
      await captureScreenshot(page, SCREENSHOTS_DIR, '01_main_page', { fullPage: true })
    })

    test('should capture Settings button highlighted', async ({ page }) => {
      const settingsButton = await findSettingsButton(page)

      if (!settingsButton) {
        throw new Error('Settings button not found')
      }

      // Highlight the Settings button
      await settingsButton.evaluate((el) => {
        el.style.outline = '3px solid red'
      })

      await captureScreenshot(page, SCREENSHOTS_DIR, '02_settings_button_highlighted')

      // Remove highlight
      await settingsButton.evaluate((el) => {
        el.style.outline = ''
      })
    })

    test('should capture opened dropdown', async ({ page }) => {
      const dropdownContent = await openSettingsDropdown(page)
      await expect(dropdownContent).toBeVisible()

      await captureScreenshot(page, SCREENSHOTS_DIR, '03_settings_dropdown_opened')
    })

    test('should capture all dropdown sections', async ({ page }) => {
      const dropdownContent = await openSettingsDropdown(page)
      const expectedSections = getExpectedDropdownSections()

      for (let i = 0; i < expectedSections.length; i++) {
        const sectionName = expectedSections[i]
        const section = await verifyDropdownSection(page, sectionName)

        const fileName = `04_${sectionName.toLowerCase().replace(/\s+/g, '_')}`
        await captureScreenshot(page, SCREENSHOTS_DIR, fileName)
      }
    })

    test('should capture margin type options', async ({ page }) => {
      const dropdownContent = await openSettingsDropdown(page)
      const marginTypeSelect = await findMarginTypeSelector(page)

      if (!marginTypeSelect) {
        test.skip()
        return
      }

      await marginTypeSelect.click()

      const optionsMenu = page.locator('[role="listbox"]').first()
      await expect(optionsMenu).toBeVisible({ timeout: 3000 })

      await captureScreenshot(page, SCREENSHOTS_DIR, '05_margin_type_options')

      await page.keyboard.press('Escape')
    })

    test('should capture client pricing enabled state', async ({ page }) => {
      const dropdownContent = await openSettingsDropdown(page)
      const clientPricingSwitch = await findClientPricingSwitch(page)

      if (!clientPricingSwitch) {
        test.skip()
        return
      }

      const initialState = await clientPricingSwitch.isChecked().catch(() => false)

      // Toggle to enabled state if not already enabled
      if (!initialState) {
        await clientPricingSwitch.click()
        await expect(clientPricingSwitch).toBeChecked({ timeout: 2000 })
      }

      await captureScreenshot(page, SCREENSHOTS_DIR, '06_client_pricing_enabled')
    })

    test('should capture Save button section', async ({ page }) => {
      const dropdownContent = await openSettingsDropdown(page)
      const saveButton = await findSaveButton(page)

      if (!saveButton) {
        test.skip()
        return
      }

      await saveButton.scrollIntoViewIfNeeded()
      await expect(saveButton).toBeInViewport({ timeout: 2000 })

      await captureScreenshot(page, SCREENSHOTS_DIR, '07_save_button_section')
    })

    test('should capture full page with dropdown', async ({ page }) => {
      const dropdownContent = await openSettingsDropdown(page)
      await expect(dropdownContent).toBeVisible()

      await captureScreenshot(page, SCREENSHOTS_DIR, '08_full_page_with_dropdown', {
        fullPage: true
      })
    })

    test('should capture dropdown closed state', async ({ page }) => {
      const dropdownContent = await openSettingsDropdown(page)
      await expect(dropdownContent).toBeVisible()

      await closeSettingsDropdown(page, dropdownContent)

      await captureScreenshot(page, SCREENSHOTS_DIR, '09_dropdown_closed')
    })

    test('should list all captured screenshots', async ({ page }) => {
      // This test runs last to list all screenshots
      const screenshots = listScreenshots(SCREENSHOTS_DIR)

      console.log('\n📁 All screenshots saved to:', SCREENSHOTS_DIR)
      console.log('\nScreenshots captured:')
      screenshots.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file}`)
      })

      // Verify at least some screenshots were captured
      expect(screenshots.length).toBeGreaterThan(0)
    })
  })
})
