# E2E Testing Guide - Clerk Authentication + Supabase Integration

This guide walks you through setting up and running end-to-end tests for the Clerk authentication flow and Supabase user synchronization.

## Prerequisites

- Node.js 18+ installed
- pnpm or npm
- Local development environment configured
- Clerk account with test users
- Supabase project with `iso_agents` table

## 1. Installation

### Install Playwright and Dependencies

```bash
# Install Playwright
npm install -D @playwright/test

# Install Playwright browsers
npx playwright install

# Or install specific browsers only
npx playwright install chromium
```

### Verify Installation

```bash
npx playwright --version
```

## 2. Environment Setup

### Required Environment Variables

Create or update `.env.local` with the following:

```env
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Test User Credentials (for E2E tests)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!
```

### Create Test User in Clerk

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Users** → **Create User**
3. Create a test user with:
   - Email: `test@example.com` (or your choice)
   - Password: `TestPassword123!` (or your choice)
4. Update `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` in `.env.local`

## 3. Test Files Overview

### Configuration

- **[playwright.config.ts](../playwright.config.ts)** - Playwright configuration
  - Test directory: `__tests__/e2e`
  - Base URL: `http://localhost:3000`
  - Auto-starts dev server before tests
  - Supports multiple browsers (Chrome, Firefox, Safari, Mobile)

### Test Suites

#### 1. Basic Auth Flow (`__tests__/e2e/auth/auth-flow.spec.ts`)

Tests basic authentication UI:
- Unauthenticated redirect to sign-in
- Sign-in page loads correctly
- Sign-up page loads correctly
- Page metadata

#### 2. Clerk + Supabase Integration (`__tests__/e2e/auth/clerk-supabase-integration.spec.ts`)

Comprehensive integration test:
- ✅ Unauthenticated user redirect
- ✅ Complete sign-in flow
- ✅ Redirect to landing page
- ✅ User sync to Supabase via webhook
- ✅ Authenticated user redirect from auth pages
- ✅ Session persistence across reloads
- ✅ API route protection

## 4. Running Tests

### Run All E2E Tests

```bash
npx playwright test
```

### Run Specific Test File

```bash
# Basic auth flow
npx playwright test auth-flow.spec.ts

# Clerk + Supabase integration
npx playwright test clerk-supabase-integration.spec.ts
```

### Run in Headed Mode (See Browser)

```bash
npx playwright test --headed
```

### Run in Debug Mode

```bash
npx playwright test --debug
```

### Run in Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run and Show Report

```bash
npx playwright test
npx playwright show-report
```

## 5. Understanding Test Output

### Successful Test Output

```
Running 6 tests using 1 worker

✅ [chromium] › auth/clerk-supabase-integration.spec.ts:35:3 › should redirect unauthenticated user to sign-in (2.3s)
   📍 Navigated to /sign-in
   ✅ Unauthenticated user redirected to /sign-in

✅ [chromium] › auth/clerk-supabase-integration.spec.ts:45:3 › should complete full authentication flow and sync to Supabase (8.7s)
   📍 Navigated to /sign-in
   ✅ Clerk component loaded
   📧 Entered email: test@example.com
   🔘 Clicked continue button
   🔒 Entered password
   🔘 Clicked submit button
   ✅ Redirected to landing page (/)
   ✅ User button visible - authenticated state confirmed
   👤 Clerk User ID: user_2abc123xyz
   ✅ User synced to Supabase:
      - ID: 550e8400-e29b-41d4-a716-446655440000
      - Clerk ID: user_2abc123xyz
      - Email: test@example.com
      - Created: 2025-11-01T10:30:00.000Z

6 passed (15.2s)
```

### Failed Test - Example

```
❌ [chromium] › auth/clerk-supabase-integration.spec.ts:45:3 › should complete full authentication flow

Error: User not found in Supabase: relation "iso_agents" does not exist

  at __tests__/e2e/auth/clerk-supabase-integration.spec.ts:102:15
```

**Common Failure Causes**:
1. Supabase table `iso_agents` doesn't exist
2. Webhook not configured (user not syncing)
3. Incorrect test credentials
4. Dev server not running

## 6. What the Tests Verify

### Clerk Authentication Flow

1. **Redirect Behavior**
   - Unauthenticated users → `/sign-in`
   - Authenticated users trying to access `/sign-in` → `/`

2. **Sign-in Process**
   - Clerk component loads
   - Email input accepts input
   - Password input accepts input
   - Form submission works
   - OAuth callback completes
   - Redirect to landing page

3. **Session Management**
   - Session persists across page reloads
   - Middleware properly protects routes

### Supabase Integration

1. **Webhook Sync**
   - User created in Clerk
   - Webhook fires to `/api/webhooks/clerk`
   - User record created in Supabase `iso_agents` table
   - Data matches (email, clerk_user_id)

2. **Data Verification**
   - User exists in database
   - Correct fields populated
   - Timestamps set

## 7. Troubleshooting

### Test Fails: "User not found in Supabase"

**Cause**: Webhook not syncing users

**Fix**:
1. Verify webhook is configured in Clerk Dashboard
2. Check webhook endpoint is publicly accessible (use ngrok for local testing)
3. Verify `CLERK_WEBHOOK_SECRET` matches Clerk dashboard
4. Check webhook logs in Clerk dashboard

### Test Fails: "Cannot find email input"

**Cause**: Clerk component not loading or selector changed

**Fix**:
1. Run with `--headed` to see what's happening
2. Check Clerk publishable key is correct
3. Verify Clerk component is rendering (check browser console)

### Test Fails: "Timeout waiting for redirect"

**Cause**: Authentication not completing or middleware blocking

**Fix**:
1. Verify middleware is using `auth.protect()` (not manual redirects)
2. Check test credentials are correct
3. Run with `--debug` to step through

### Dev Server Not Starting

**Cause**: Port 3000 already in use or build errors

**Fix**:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Start manually to see errors
npm run dev:app
```

## 8. CI/CD Integration

### GitHub Actions Example

Add to `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npx playwright test
        env:
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.CLERK_PUBLISHABLE_KEY }}
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## 9. Best Practices

### Test Data Management

- Use dedicated test accounts (not production users)
- Clean up test data after runs (if needed)
- Use Supabase test projects for CI/CD

### Test Isolation

- Each test should be independent
- Don't rely on test execution order
- Use `beforeEach` for setup, `afterEach` for cleanup

### Debugging

```bash
# Slow down test execution
npx playwright test --slow-mo=1000

# Generate trace for debugging
npx playwright test --trace on

# Show trace
npx playwright show-trace trace.zip
```

### Screenshots and Videos

Playwright automatically captures:
- Screenshots on failure (saved to `test-results/`)
- Videos on failure (if configured)
- Traces on first retry

## 10. Adding More Tests

### Template for New Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Setup - navigate, authenticate, etc.
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await page.goto('/my-page');

    // Act
    await page.click('button');

    // Assert
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

## 11. Resources

- [Playwright Documentation](https://playwright.dev)
- [Clerk Testing Guide](https://clerk.com/docs/testing)
- [Supabase Testing](https://supabase.com/docs/guides/getting-started/testing)
- [Debugging Playwright Tests](https://playwright.dev/docs/debug)

---

## Quick Reference

```bash
# Install
npm install -D @playwright/test
npx playwright install

# Run tests
npx playwright test                    # All tests
npx playwright test --headed           # See browser
npx playwright test --debug            # Debug mode
npx playwright test --ui               # Interactive UI mode

# Reports
npx playwright show-report             # HTML report
npx playwright show-trace trace.zip    # Trace viewer

# Codegen (record tests)
npx playwright codegen localhost:3000
```

---

**Next Steps**: Run `npx playwright test clerk-supabase-integration.spec.ts --headed` to see the authentication flow in action!
