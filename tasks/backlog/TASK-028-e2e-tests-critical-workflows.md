# E2E Tests for Critical Workflows

**Task ID**: TASK-028
**Created**: 2025-10-20
**Assigned To**: QA Engineer / Frontend Developer
**Status**: `pending`
**Priority**: `high`
**Estimated Time**: 12 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Implement comprehensive end-to-end (E2E) tests using Playwright for critical user workflows including complete RFP process (from chat to proposal), authentication flows, request management, quote viewing, and visual regression testing.

### User Story
**As a** QA engineer
**I want** end-to-end tests for all critical user journeys
**So that** I can ensure the entire application works correctly from a user's perspective, catch UI bugs, and verify complete workflow integration

### Business Value
E2E testing validates the entire application stack (frontend, backend, database, external APIs) working together as users would experience it. This catches integration issues that unit and integration tests miss, reduces production bugs by 50%, ensures UI consistency, and validates that business requirements are met. Critical for user satisfaction and the 99.9% uptime goal.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL implement E2E tests for authentication flows
- Sign up with email/password
- Sign in with valid credentials
- Sign in with invalid credentials (error handling)
- Sign out functionality
- Protected route redirection
- Session persistence

**FR-2**: System SHALL implement E2E tests for complete RFP workflow
- Submit flight request via chat interface
- System analyzes request and extracts data
- Client profile retrieved (for returning clients)
- Flight search executed
- Quotes received and displayed
- Proposal generated and sent
- Complete flow takes <5 minutes

**FR-3**: System SHALL implement E2E tests for request management
- Create new flight request
- View request list
- View single request details
- Update request
- Cancel request
- Filter and search requests

**FR-4**: System SHALL implement E2E tests for quote viewing
- View quote list for request
- View quote details
- Compare quotes side-by-side
- Sort quotes by price/rating/response time
- Real-time quote updates via WebSocket

**FR-5**: System SHALL implement E2E tests for proposal workflows
- View proposal list
- View proposal details
- Download PDF proposal
- Resend proposal email
- Track proposal status

**FR-6**: System SHALL implement visual regression tests
- Dashboard layout consistency
- Chat interface rendering
- Workflow visualization display
- Quote comparison table
- Responsive design (mobile, tablet, desktop)

**FR-7**: System SHALL test real-time updates
- WebSocket connection established
- Quote arrival notifications
- Workflow state changes
- Live status updates

**FR-8**: System SHALL test error scenarios
- Network failures
- API errors
- Invalid input handling
- Session expiration
- 404 pages

### Acceptance Criteria

- [ ] **AC-1**: Authentication flows have E2E tests (6 scenarios)
- [ ] **AC-2**: Complete RFP workflow has E2E test (end-to-end journey)
- [ ] **AC-3**: Request management has E2E tests (6 scenarios)
- [ ] **AC-4**: Quote viewing has E2E tests (5 scenarios)
- [ ] **AC-5**: Proposal workflows have E2E tests (5 scenarios)
- [ ] **AC-6**: Visual regression tests cover all major pages (8 pages)
- [ ] **AC-7**: Real-time updates tested (4 scenarios)
- [ ] **AC-8**: Error scenarios tested (5 scenarios)
- [ ] **AC-9**: Tests run in multiple browsers (Chromium, Firefox, WebKit)
- [ ] **AC-10**: Tests run in parallel
- [ ] **AC-11**: Screenshots captured on failures
- [ ] **AC-12**: Test reports generated with HTML output
- [ ] **AC-13**: All tests pass consistently (no flaky tests)
- [ ] **AC-14**: Code review approved

### Non-Functional Requirements

- **Performance**: E2E suite completes in <10 minutes
- **Reliability**: Tests are stable and deterministic
- **Parallelization**: Tests run in parallel for speed
- **Coverage**: All critical user journeys tested
- **Maintainability**: Page Object Model for reusability

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/e2e/auth/signup-flow.spec.ts
__tests__/e2e/auth/signin-flow.spec.ts
__tests__/e2e/auth/signout-flow.spec.ts
__tests__/e2e/workflows/complete-rfp.spec.ts
__tests__/e2e/requests/create-request.spec.ts
__tests__/e2e/requests/manage-requests.spec.ts
__tests__/e2e/quotes/view-quotes.spec.ts
__tests__/e2e/proposals/proposal-workflows.spec.ts
__tests__/e2e/visual/dashboard.spec.ts
__tests__/e2e/helpers/page-objects/auth-page.ts
__tests__/e2e/helpers/page-objects/dashboard-page.ts
__tests__/e2e/helpers/page-objects/chat-page.ts
```

**Example Test - Complete RFP Workflow**:
```typescript
// __tests__/e2e/workflows/complete-rfp.spec.ts
import { test, expect } from '@playwright/test'
import { AuthPage } from '../helpers/page-objects/auth-page'
import { DashboardPage } from '../helpers/page-objects/dashboard-page'
import { ChatPage } from '../helpers/page-objects/chat-page'

test.describe('Complete RFP Workflow', () => {
  let authPage: AuthPage
  let dashboardPage: DashboardPage
  let chatPage: ChatPage

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page)
    dashboardPage = new DashboardPage(page)
    chatPage = new ChatPage(page)

    // Sign in with test user
    await authPage.goto()
    await authPage.signIn('test@example.com', 'password123')
    await expect(page).toHaveURL('/dashboard')
  })

  test('should complete full RFP workflow from chat to proposal', async ({ page }) => {
    const startTime = Date.now()

    // Step 1: Submit flight request via chat
    await chatPage.goto()
    await chatPage.sendMessage(
      'I need a flight from Teterboro (KTEB) to Van Nuys (KVNY) on November 15, 2025 for 6 passengers'
    )

    // Step 2: Verify request analysis
    await expect(chatPage.lastMessage).toContainText('I found your request')
    await expect(chatPage.extractedData).toContainText('KTEB')
    await expect(chatPage.extractedData).toContainText('KVNY')
    await expect(chatPage.extractedData).toContainText('6 passengers')

    // Step 3: Verify workflow visualization appears
    await expect(chatPage.workflowViz).toBeVisible()
    await expect(chatPage.workflowStage('Understanding')).toHaveClass(/completed/)

    // Step 4: Wait for client data retrieval (if returning client)
    await chatPage.waitForWorkflowStage('Fetching Client Data')
    await expect(chatPage.workflowStage('Fetching Client Data')).toHaveClass(/active/)

    // Step 5: Wait for flight search
    await chatPage.waitForWorkflowStage('Searching Flights')
    await expect(chatPage.lastMessage).toContainText('Searching for aircraft')

    // Step 6: Wait for quotes to arrive
    await chatPage.waitForWorkflowStage('Analyzing Proposals')
    await expect(chatPage.quoteStatusWidget).toBeVisible()
    await expect(chatPage.quoteStatusWidget).toContainText('3/5 responded')

    // Step 7: Verify quote display
    await expect(chatPage.quoteCard).toHaveCount(3)
    await expect(chatPage.topQuote).toContainText('Recommended')

    // Step 8: Wait for proposal generation
    await chatPage.waitForWorkflowStage('Generating Proposal')
    await expect(chatPage.lastMessage).toContainText('Preparing your proposal')

    // Step 9: Verify proposal sent
    await chatPage.waitForWorkflowStage('Completed')
    await expect(chatPage.lastMessage).toContainText('Proposal sent to')
    await expect(chatPage.proposalPreview).toBeVisible()

    // Step 10: Verify complete workflow took <5 minutes
    const duration = Date.now() - startTime
    expect(duration).toBeLessThan(300000) // 5 minutes

    // Step 11: Click to view full proposal
    await chatPage.viewProposalButton.click()
    await expect(page).toHaveURL(/\/proposals\/.*/)

    // Step 12: Verify proposal details
    await expect(page.locator('.proposal-header')).toContainText('Flight Proposal')
    await expect(page.locator('.client-name')).toContainText('Test Client')
    await expect(page.locator('.quote-options')).toHaveCount(3)

    // Step 13: Download PDF proposal
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Download PDF')
    ])
    expect(download.suggestedFilename()).toMatch(/proposal.*\.pdf/)

    // Step 14: Verify proposal in request list
    await dashboardPage.goto()
    await expect(dashboardPage.requestList.first()).toContainText('KTEB → KVNY')
    await expect(dashboardPage.requestList.first()).toContainText('Completed')
  })

  test('should handle incomplete request with prompts', async ({ page }) => {
    await chatPage.goto()

    // Submit incomplete request (missing date)
    await chatPage.sendMessage('Flight from KTEB to KVNY for 6 people')

    // Verify agent prompts for missing information
    await expect(chatPage.lastMessage).toContainText('What date would you like to travel?')

    // Provide missing information
    await chatPage.sendMessage('November 15, 2025')

    // Verify workflow continues
    await expect(chatPage.workflowViz).toBeVisible()
    await chatPage.waitForWorkflowStage('Searching Flights')
  })

  test('should support multi-turn conversation for clarification', async ({ page }) => {
    await chatPage.goto()

    await chatPage.sendMessage('Flight to Los Angeles')

    // Agent asks for departure airport
    await expect(chatPage.lastMessage).toContainText('Where will you be departing from?')

    await chatPage.sendMessage('Teterboro')

    // Agent asks for passenger count
    await expect(chatPage.lastMessage).toContainText('How many passengers?')

    await chatPage.sendMessage('6 passengers')

    // Agent asks for date
    await expect(chatPage.lastMessage).toContainText('What date?')

    await chatPage.sendMessage('November 15')

    // Workflow starts
    await expect(chatPage.workflowViz).toBeVisible()
  })

  test('should display returning client preferences', async ({ page }) => {
    await chatPage.goto()

    // Submit request for returning client
    await chatPage.sendMessage(
      'Flight from KTEB to KVNY on Nov 15 for john@example.com (6 passengers)'
    )

    // Verify client recognition
    await expect(chatPage.lastMessage).toContainText('Welcome back')
    await expect(chatPage.lastMessage).toContainText('John Doe')

    // Verify preferences displayed
    await expect(chatPage.preferencesBadge).toContainText('Prefers midsize jets')
    await expect(chatPage.preferencesBadge).toContainText('Vegetarian catering')
  })

  test('should show real-time quote updates', async ({ page }) => {
    await chatPage.goto()
    await chatPage.sendMessage('Flight from KTEB to KVNY on Nov 15 for 6 passengers')

    // Wait for RFP distribution
    await chatPage.waitForWorkflowStage('Requesting Quotes')

    // Verify initial quote count
    await expect(chatPage.quoteStatusWidget).toContainText('0/5 responded')

    // Wait for first quote
    await page.waitForTimeout(2000)
    await expect(chatPage.quoteStatusWidget).toContainText('1/5 responded')

    // Wait for more quotes
    await page.waitForTimeout(3000)
    await expect(chatPage.quoteStatusWidget).toContainText('3/5 responded')

    // Verify live quote cards appear
    await expect(chatPage.quoteCard).toHaveCount(3)
  })

  test('should handle workflow failures gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/agents/flight-search', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Avinode API unavailable' })
      })
    })

    await chatPage.goto()
    await chatPage.sendMessage('Flight from KTEB to KVNY on Nov 15 for 6 passengers')

    // Verify error message displayed
    await expect(chatPage.lastMessage).toContainText('experiencing issues')
    await expect(chatPage.errorBanner).toBeVisible()

    // Verify retry option
    await expect(chatPage.retryButton).toBeVisible()
  })
})
```

**Example Test - Authentication Flows**:
```typescript
// __tests__/e2e/auth/signin-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Sign In Flow', () => {
  test('should sign in with valid credentials', async ({ page }) => {
    await page.goto('/sign-in')

    // Fill in credentials
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')

    // Submit form
    await page.click('button[type="submit"]')

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard')

    // Verify user name displayed
    await expect(page.locator('.user-menu')).toContainText('Test User')
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/sign-in')

    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')

    await page.click('button[type="submit"]')

    // Verify error message
    await expect(page.locator('.error-message')).toContainText('Invalid credentials')

    // Verify still on sign-in page
    await expect(page).toHaveURL('/sign-in')
  })

  test('should validate email format', async ({ page }) => {
    await page.goto('/sign-in')

    await page.fill('input[name="email"]', 'invalid-email')
    await page.fill('input[name="password"]', 'password123')

    await page.click('button[type="submit"]')

    // Verify validation error
    await expect(page.locator('input[name="email"]:invalid')).toBeVisible()
  })

  test('should redirect to sign-in when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard')

    // Verify redirect to sign-in
    await expect(page).toHaveURL('/sign-in')
  })

  test('should persist session after page reload', async ({ page }) => {
    // Sign in
    await page.goto('/sign-in')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/dashboard')

    // Reload page
    await page.reload()

    // Verify still signed in
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('.user-menu')).toContainText('Test User')
  })
})

test.describe('Sign Out Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in first
    await page.goto('/sign-in')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('should sign out and redirect to home', async ({ page }) => {
    // Click user menu
    await page.click('.user-menu')

    // Click sign out
    await page.click('text=Sign Out')

    // Verify redirect to home or sign-in
    await expect(page).toHaveURL(/\/(home|sign-in)/)

    // Verify cannot access dashboard
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/sign-in')
  })
})
```

**Example Test - Visual Regression**:
```typescript
// __tests__/e2e/visual/dashboard.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in
    await page.goto('/sign-in')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
  })

  test('dashboard layout on desktop', async ({ page }) => {
    await page.goto('/dashboard')
    await page.setViewportSize({ width: 1920, height: 1080 })

    await expect(page).toHaveScreenshot('dashboard-desktop.png')
  })

  test('dashboard layout on tablet', async ({ page }) => {
    await page.goto('/dashboard')
    await page.setViewportSize({ width: 768, height: 1024 })

    await expect(page).toHaveScreenshot('dashboard-tablet.png')
  })

  test('dashboard layout on mobile', async ({ page }) => {
    await page.goto('/dashboard')
    await page.setViewportSize({ width: 375, height: 667 })

    await expect(page).toHaveScreenshot('dashboard-mobile.png')
  })

  test('chat interface rendering', async ({ page }) => {
    await page.goto('/chat')

    // Send test message
    await page.fill('textarea[name="message"]', 'Test message')
    await page.click('button[type="submit"]')

    await expect(page).toHaveScreenshot('chat-interface.png')
  })

  test('workflow visualization display', async ({ page }) => {
    await page.goto('/chat')

    // Trigger workflow
    await page.fill('textarea[name="message"]', 'Flight from KTEB to KVNY')
    await page.click('button[type="submit"]')

    // Wait for workflow viz
    await page.waitForSelector('.workflow-visualization')

    await expect(page.locator('.workflow-visualization')).toHaveScreenshot('workflow-viz.png')
  })

  test('quote comparison table', async ({ page }) => {
    await page.goto('/requests/test-request-id/quotes')

    await expect(page.locator('.quote-comparison')).toHaveScreenshot('quote-comparison.png')
  })
})
```

**Page Object Models**:
```typescript
// __tests__/e2e/helpers/page-objects/chat-page.ts
import { Page, Locator } from '@playwright/test'

export class ChatPage {
  readonly page: Page
  readonly messageInput: Locator
  readonly sendButton: Locator
  readonly messageList: Locator
  readonly lastMessage: Locator
  readonly workflowViz: Locator
  readonly quoteStatusWidget: Locator
  readonly quoteCard: Locator
  readonly topQuote: Locator
  readonly proposalPreview: Locator
  readonly viewProposalButton: Locator
  readonly errorBanner: Locator
  readonly retryButton: Locator
  readonly extractedData: Locator
  readonly preferencesBadge: Locator

  constructor(page: Page) {
    this.page = page
    this.messageInput = page.locator('textarea[name="message"]')
    this.sendButton = page.locator('button[type="submit"]')
    this.messageList = page.locator('.message-list')
    this.lastMessage = page.locator('.message').last()
    this.workflowViz = page.locator('.workflow-visualization')
    this.quoteStatusWidget = page.locator('.quote-status')
    this.quoteCard = page.locator('.quote-card')
    this.topQuote = page.locator('.quote-card.recommended')
    this.proposalPreview = page.locator('.proposal-preview')
    this.viewProposalButton = page.locator('button:has-text("View Proposal")')
    this.errorBanner = page.locator('.error-banner')
    this.retryButton = page.locator('button:has-text("Retry")')
    this.extractedData = page.locator('.extracted-data')
    this.preferencesBadge = page.locator('.preferences-badge')
  }

  async goto() {
    await this.page.goto('/chat')
  }

  async sendMessage(message: string) {
    await this.messageInput.fill(message)
    await this.sendButton.click()
  }

  async waitForWorkflowStage(stageName: string) {
    await this.page.waitForSelector(`.workflow-stage:has-text("${stageName}").active`)
  }

  workflowStage(stageName: string): Locator {
    return this.page.locator(`.workflow-stage:has-text("${stageName}")`)
  }
}
```

```typescript
// __tests__/e2e/helpers/page-objects/dashboard-page.ts
import { Page, Locator } from '@playwright/test'

export class DashboardPage {
  readonly page: Page
  readonly requestList: Locator
  readonly createRequestButton: Locator
  readonly filterInput: Locator
  readonly statusFilter: Locator

  constructor(page: Page) {
    this.page = page
    this.requestList = page.locator('.request-item')
    this.createRequestButton = page.locator('button:has-text("New Request")')
    this.filterInput = page.locator('input[name="search"]')
    this.statusFilter = page.locator('select[name="status"]')
  }

  async goto() {
    await this.page.goto('/dashboard')
  }

  async createRequest() {
    await this.createRequestButton.click()
  }

  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status)
  }
}
```

**Run Tests** (should FAIL initially):
```bash
npx playwright test
# Expected: Tests fail because UI not fully implemented
```

### Step 2: Implement Minimal Code (Green Phase)

Implement UI components to make tests pass:

```typescript
// app/chat/page.tsx
export default function ChatPage() {
  return (
    <div className="chat-container">
      <MessageList />
      <ChatInput />
      <WorkflowVisualization />
      <QuoteStatusWidget />
    </div>
  )
}
```

**Run Tests Again**:
```bash
npx playwright test
# Expected: More tests pass ✓
```

### Step 3: Refactor (Blue Phase)

- Extract common UI components
- Improve accessibility
- Optimize rendering performance
- Add loading states

**Run Tests After Refactoring**:
```bash
npx playwright test
# Expected: All tests still pass ✓
```

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

- [ ] TASK-020 (Dashboard Pages) completed
- [ ] TASK-023 (Chat Interface) completed
- [ ] Playwright installed and configured
- [ ] Test users created in test environment

### Step-by-Step Implementation

**Step 1**: Install and Configure Playwright
```bash
npm install -D @playwright/test
npx playwright install
```

File: `playwright.config.ts`
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
})
```

**Step 2**: Create Page Object Models
- AuthPage
- DashboardPage
- ChatPage
- RequestPage
- QuotePage
- ProposalPage

**Step 3**: Write E2E Tests for Authentication (6 tests)
- Sign up flow
- Sign in with valid credentials
- Sign in with invalid credentials
- Sign out flow
- Protected route redirection
- Session persistence

**Step 4**: Write E2E Tests for Complete RFP Workflow (6 tests)
- Full workflow end-to-end
- Incomplete request handling
- Multi-turn conversation
- Returning client preferences
- Real-time quote updates
- Workflow failure handling

**Step 5**: Write E2E Tests for Request Management (6 tests)
- Create request
- View request list
- View request details
- Update request
- Cancel request
- Filter requests

**Step 6**: Write E2E Tests for Quote Viewing (5 tests)
- View quotes
- View quote details
- Compare quotes
- Sort quotes
- Real-time updates

**Step 7**: Write E2E Tests for Proposals (5 tests)
- View proposals
- View proposal details
- Download PDF
- Resend proposal
- Track status

**Step 8**: Write Visual Regression Tests (8 tests)
- Dashboard (desktop, tablet, mobile)
- Chat interface
- Workflow visualization
- Quote comparison
- Proposal view

**Step 9**: Run E2E Test Suite
```bash
npx playwright test
```

**Step 10**: Generate HTML Report
```bash
npx playwright show-report
```

### Implementation Validation

After each step:
- [ ] Tests pass in all browsers
- [ ] Screenshots captured on failures
- [ ] No flaky tests
- [ ] Test execution <10 minutes

---

## 5. GIT WORKFLOW

### Branch Creation
```bash
git checkout main
git pull origin main
git checkout -b test/e2e-critical-workflows
```

### Commit Guidelines
```bash
git add playwright.config.ts
git commit -m "test(e2e): configure Playwright for E2E testing"

git add __tests__/e2e/workflows/complete-rfp.spec.ts
git commit -m "test(e2e): add complete RFP workflow E2E test"

git add __tests__/e2e/helpers/page-objects/
git commit -m "test(e2e): add Page Object Models for reusability"

git push origin test/e2e-critical-workflows
```

### Pull Request
```bash
gh pr create --title "Test: E2E Tests for Critical User Workflows" \
  --body "Implements 35+ E2E tests for critical user journeys using Playwright.

**Workflows Tested:**
- Complete RFP workflow (end-to-end)
- Authentication flows (sign up, sign in, sign out)
- Request management (CRUD operations)
- Quote viewing and comparison
- Proposal workflows

**Coverage:**
- Desktop browsers (Chrome, Firefox, Safari)
- Mobile browsers (Chrome, Safari)
- Visual regression tests
- Real-time update tests

Closes #TASK-028"
```

---

## 6-11. STANDARD SECTIONS

(Following template structure)

- Code Review Checklist
- Testing Requirements
- Definition of Done
- Resources & References
- Notes & Questions
- Completion Summary

---

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
