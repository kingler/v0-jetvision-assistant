# E2E Test Quick Start - Clerk Authentication

> **Quick guide to test Clerk login and Supabase connection locally**

## Prerequisites

- Node.js 18+ installed
- Clerk account with test user
- Supabase project configured

## 1. Install Playwright (One-time setup)

```bash
# Install Playwright
npm install -D @playwright/test

# Install browsers (Chromium recommended for testing)
npx playwright install chromium
```

## 2. Configure Environment Variables

Copy the test environment template:

```bash
cp .env.test.example .env.local
```

Edit `.env.local` and fill in:

```env
# Clerk (from https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase (from https://supabase.com/dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Test user credentials (create in Clerk Dashboard)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!
```

## 3. Create Test User in Clerk

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Users** → **Create User**
3. Enter:
   - Email: `test@example.com`
   - Password: `TestPassword123!`
4. Click **Create**

## 4. Run the Tests

### Option A: Run with visible browser (recommended for first time)

```bash
npm run test:e2e:headed
```

You'll see the browser:
1. Navigate to sign-in page
2. Fill in email and password
3. Sign in
4. Redirect to landing page
5. Verify user synced to Supabase

### Option B: Run authentication test only

```bash
npm run test:e2e:auth -- --headed
```

### Option C: Run all tests in background

```bash
npm run test:e2e
```

### Option D: Interactive UI mode

```bash
npm run test:e2e:ui
```

## 5. Expected Output

```
Running 6 tests using 1 worker

✅ should redirect unauthenticated user to sign-in (2.3s)
   📍 Navigated to /sign-in
   ✅ Unauthenticated user redirected to /sign-in

✅ should complete full authentication flow and sync to Supabase (8.7s)
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

6 passed (15.2s)
```

## 6. View Test Report

After running tests:

```bash
npm run test:e2e:report
```

This opens an HTML report in your browser showing:
- Test results
- Screenshots (on failure)
- Videos (on failure)
- Detailed logs

## Troubleshooting

### "User not found in Supabase"

**Cause**: Webhook not syncing users

**Fix**:
1. Check webhook is configured in Clerk Dashboard
2. Verify `CLERK_WEBHOOK_SECRET` matches
3. For local testing, use ngrok to expose webhook:
   ```bash
   ngrok http 3000
   # Update webhook URL in Clerk to: https://your-ngrok-url.ngrok.io/api/webhooks/clerk
   ```

### "Cannot find email input"

**Cause**: Clerk component not loading

**Fix**:
1. Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is correct
2. Clear browser cache: `npx playwright clean`
3. Run with `--headed` to see what's rendering

### "Timeout waiting for redirect"

**Cause**: Middleware or authentication issue

**Fix**:
1. Verify middleware.ts is using `auth.protect()`
2. Check dev server logs for errors
3. Test credentials manually in browser first

### Dev server not starting

**Fix**:
```bash
# Kill any process on port 3000
lsof -ti:3000 | xargs kill -9

# Start manually to see errors
npm run dev:app
```

## What Gets Tested

✅ **Clerk Authentication**
- Unauthenticated redirect to `/sign-in`
- Sign-in form submission
- OAuth callback completion
- Redirect to landing page after auth
- Session persistence across reloads
- Authenticated user redirect from auth pages

✅ **Supabase Integration**
- User created in Clerk
- Webhook fires to `/api/webhooks/clerk`
- User record created in `iso_agents` table
- Data matches (email, clerk_user_id)

✅ **Middleware Protection**
- Protected routes require authentication
- API routes return 401/403 when unauthenticated

## Advanced Usage

### Debug a specific test

```bash
npx playwright test --debug -g "should complete full authentication"
```

### Run with slow motion (easier to watch)

```bash
npx playwright test --headed --slow-mo=1000
```

### Generate trace for debugging

```bash
npx playwright test --trace on
npx playwright show-trace trace.zip
```

### Record a new test

```bash
npx playwright codegen localhost:3000
```

## Next Steps

- ✅ Tests passing? Authentication is working correctly!
- ❌ Tests failing? Check [Full E2E Testing Guide](docs/E2E_TESTING_GUIDE.md)
- 📖 Learn more: [Playwright Docs](https://playwright.dev)

---

**Quick Commands Summary**

```bash
# Installation (one-time)
npm install -D @playwright/test
npx playwright install chromium

# Run tests
npm run test:e2e:headed        # Visual mode (recommended)
npm run test:e2e:auth          # Auth test only
npm run test:e2e               # All tests
npm run test:e2e:ui            # Interactive UI

# View results
npm run test:e2e:report        # HTML report
```
