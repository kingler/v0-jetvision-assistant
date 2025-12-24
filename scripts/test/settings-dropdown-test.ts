/**
 * Settings Dropdown Menu Test Script
 *
 * Tests the Settings dropdown menu functionality and captures screenshots
 * for documentation and verification purposes.
 */

import { chromium, Browser, Page } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

const BASE_URL = 'http://localhost:3000'
const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots', 'settings-dropdown')

/**
 * Ensures the screenshots directory exists, creating it if necessary.
 * Uses async fs.promises APIs to properly handle async operations.
 */
async function ensureScreenshotsDir(): Promise<void> {
  try {
    // Check if directory exists by attempting to access it
    await fs.promises.access(SCREENSHOTS_DIR)
  } catch {
    // Directory doesn't exist, create it recursively
    await fs.promises.mkdir(SCREENSHOTS_DIR, { recursive: true })
  }
}

async function testSettingsDropdown() {
  let browser: Browser | null = null
  let page: Page | null = null

  try {
    console.log('🚀 Starting Settings Dropdown Test...\n')

    // Ensure screenshots directory exists
    await ensureScreenshotsDir()
    console.log(`📁 Screenshots will be saved to: ${SCREENSHOTS_DIR}\n`)

    // Launch browser
    browser = await chromium.launch({ headless: false })
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    })
    page = await context.newPage()

    // Step 1: Navigate to the application
    console.log('1️⃣  Navigating to http://localhost:3000...')
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')

    // Check if we're on the sign-in page
    const currentUrl = page.url()
    console.log(`   Current URL: ${currentUrl}`)

    if (currentUrl.includes('/sign-in')) {
      console.log('   ⚠️  Application redirected to sign-in page')
      console.log('   📸 Taking screenshot of sign-in page...')
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '01_sign_in_page.png'),
        fullPage: true
      })

      console.log('\n❌ Cannot proceed with Settings dropdown test - Authentication required')
      console.log('   Please sign in to the application first and re-run this script.\n')
      return
    }

    // Step 2: Wait for main page to load
    console.log('   ✅ Loaded main page')
    await page.waitForLoadState('domcontentloaded') // Wait for DOM to be ready

    console.log('   📸 Taking screenshot of main page...')
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01_main_page_with_settings_button.png'),
      fullPage: true
    })

    // Step 3: Locate the Settings button
    console.log('\n2️⃣  Locating Settings button...')

    // Try multiple selectors to find the Settings button
    // Use let to allow reassignment if alternative selector is found
    let settingsButton = page.locator('button:has-text("Settings")').first()

    if (!(await settingsButton.isVisible())) {
      // Try alternative selector with Settings icon
      const altSettingsButton = page.locator('button').filter({
        has: page.locator('svg').filter({ hasText: /Settings/ })
      }).first()

      if (await altSettingsButton.isVisible()) {
        // Switch to alternative selector if it's visible
        settingsButton = altSettingsButton
        console.log('   ℹ️  Using alternative Settings button selector')
      } else {
        console.log('   ❌ Settings button not found')
        console.log('   📸 Taking screenshot of header area...')
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'error_settings_button_not_found.png'),
          fullPage: false
        })
        return
      }
    }

    console.log('   ✅ Settings button located')

    // Highlight the Settings button for visual reference
    await settingsButton.evaluate((el) => {
      el.style.outline = '3px solid red'
    })

    console.log('   📸 Taking screenshot with Settings button highlighted...')
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02_settings_button_highlighted.png'),
      fullPage: false
    })

    // Remove highlight
    await settingsButton.evaluate((el) => {
      el.style.outline = ''
    })

    // Step 4: Click the Settings button to open dropdown
    console.log('\n3️⃣  Clicking Settings button to open dropdown...')
    await settingsButton.click()
    // Wait for dropdown menu to become visible after click
    const dropdownContent = page.locator('[role="menu"]').first()
    await dropdownContent.waitFor({ state: 'visible' })

    // Check if dropdown is open (it should be visible after waitFor)
    const isDropdownVisible = await dropdownContent.isVisible()

    if (!isDropdownVisible) {
      console.log('   ❌ Dropdown menu did not open')
      console.log('   📸 Taking screenshot after click...')
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'error_dropdown_not_opened.png'),
        fullPage: true
      })
      return
    }

    console.log('   ✅ Dropdown menu opened successfully')

    // Step 5: Take screenshot of opened dropdown
    console.log('   📸 Taking screenshot of opened Settings dropdown...')
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03_settings_dropdown_opened.png'),
      fullPage: false
    })

    // Step 6: Verify dropdown sections
    console.log('\n4️⃣  Verifying dropdown sections...')

    const sections = [
      { name: 'Margin Configuration', icon: 'DollarSign' },
      { name: 'Commission Split Configuration', icon: 'Users' },
      { name: 'Margin Calculator Preview', icon: 'Calculator' }
    ]

    for (const section of sections) {
      const sectionHeader = page.locator(`text=${section.name}`).first()
      const isVisible = await sectionHeader.isVisible()

      if (isVisible) {
        console.log(`   ✅ ${section.name} section found`)

        // Scroll section into view and wait for it to be visible
        await sectionHeader.scrollIntoViewIfNeeded()
        await sectionHeader.waitFor({ state: 'visible' })

        // Take screenshot of this section
        const sectionFileName = section.name.toLowerCase().replace(/\s+/g, '_')
        console.log(`   📸 Taking screenshot of ${section.name}...`)
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `04_${sectionFileName}_section.png`),
          fullPage: false
        })
      } else {
        console.log(`   ❌ ${section.name} section not found`)
      }
    }

    // Step 7: Test interactive elements
    console.log('\n5️⃣  Testing interactive elements...')

    // Test margin type selector
    const marginTypeSelect = page.locator('label:has-text("Base Margin Type")').locator('..').locator('[role="combobox"]').first()
    if (await marginTypeSelect.isVisible()) {
      console.log('   ✅ Margin Type selector found')
      await marginTypeSelect.click()
      // Wait for the options dropdown/listbox to appear
      const optionsMenu = page.locator('[role="listbox"], [role="option"]').first()
      await optionsMenu.waitFor({ state: 'visible' })
      console.log('   📸 Taking screenshot of margin type options...')
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '05_margin_type_options.png'),
        fullPage: false
      })
      // Close the select and wait for options menu to be hidden
      await page.keyboard.press('Escape')
      await optionsMenu.waitFor({ state: 'hidden' })
    }

    // Test switches
    const clientPricingSwitch = page.locator('#client-pricing')
    if (await clientPricingSwitch.isVisible()) {
      console.log('   ✅ Dynamic pricing switches found')
      // Toggle client-based pricing and wait for switch state to update
      await clientPricingSwitch.click()
      await clientPricingSwitch.waitFor({ state: 'attached' }) // Ensure switch state has updated
      console.log('   📸 Taking screenshot with client pricing enabled...')
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '06_client_pricing_enabled.png'),
        fullPage: false
      })
    }

    // Step 8: Scroll to bottom to show full dropdown
    console.log('\n6️⃣  Capturing full dropdown view...')
    const saveButton = page.locator('button:has-text("Save Settings")')
    if (await saveButton.isVisible()) {
      await saveButton.scrollIntoViewIfNeeded()
      await saveButton.waitFor({ state: 'visible' }) // Wait for button to be visible after scroll
      console.log('   📸 Taking screenshot of bottom section with Save button...')
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '07_save_button_section.png'),
        fullPage: false
      })
    }

    // Step 9: Take final full-page screenshot with dropdown open
    console.log('\n7️⃣  Taking final full-page screenshot...')
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '08_full_page_dropdown_open.png'),
      fullPage: true
    })

    // Step 10: Close dropdown by clicking outside
    console.log('\n8️⃣  Testing dropdown close behavior...')
    await page.mouse.click(100, 100) // Click outside dropdown
    // Wait for dropdown to close (become hidden)
    await dropdownContent.waitFor({ state: 'hidden' })

    const isDropdownStillVisible = await dropdownContent.isVisible()
    if (!isDropdownStillVisible) {
      console.log('   ✅ Dropdown closed successfully when clicking outside')
    } else {
      console.log('   ⚠️  Dropdown did not close when clicking outside')
    }

    console.log('   📸 Taking screenshot after closing dropdown...')
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '09_dropdown_closed.png'),
      fullPage: false
    })

    console.log('\n✅ Settings Dropdown Test Completed Successfully!')
    console.log(`\n📁 All screenshots saved to: ${SCREENSHOTS_DIR}`)
    console.log('\nScreenshots captured:')
    const files = fs.readdirSync(SCREENSHOTS_DIR)
    files.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`)
    })

  } catch (error) {
    console.error('\n❌ Test failed with error:', error)

    if (page) {
      // Take error screenshot
      const errorPath = path.join(SCREENSHOTS_DIR, 'error_test_failure.png')
      await page.screenshot({ path: errorPath, fullPage: true })
      console.log(`📸 Error screenshot saved to: ${errorPath}`)
    }
  } finally {
    if (browser) {
      await browser.close()
    }
    console.log('\n🏁 Browser closed\n')
  }
}

// Run the test
testSettingsDropdown()
