# E2E Test Report — Jetvision Assistant

**Date:** 2026-02-26
**Tester:** Claude Code (agent-browser automation)
**App Version:** Next.js 14, Clerk Auth, Supabase

---

## Summary

| Metric | Value |
|--------|-------|
| **Journeys Tested** | 5 of 11 |
| **Screenshots Captured** | 24 |
| **Issues Found** | 10 |
| **Issues Fixed** | 4 |
| **Issues Remaining** | 6 |

---

## Test Environment

- **Platform:** macOS (Darwin)
- **Browser:** Chromium (agent-browser 0.15.0)
- **Server:** Next.js dev server on localhost:3000
- **Auth:** Clerk development mode
- **Database:** Supabase (PostgreSQL)

---

## Journey 1: Sign-In Flow

**Status:** PASS

### Steps Executed
1. Navigated to `/sign-in`
2. Verified page loads with "Welcome to Jetvision" heading
3. Confirmed Clerk sign-in form renders: Google OAuth button, email field, password field, Continue button
4. Tested empty form submission — browser validation "Please fill out this field" appears
5. Tested invalid email — validation shows "Please match the requested format. Example format: name@example.com"
6. Tested "Sign up" link — navigates to Clerk hosted sign-up page
7. Verified "Development mode" badge visible at bottom

### Screenshots
- `e2e-screenshots/00-initial-load-signin.png` — Initial page load
- `e2e-screenshots/signin/01-annotated.png` — Annotated interactive elements
- `e2e-screenshots/signin/02-empty-validation.png` — Empty form validation
- `e2e-screenshots/signin/03-invalid-email-error.png` — Invalid email error
- `e2e-screenshots/signin/04-signup-navigation.png` — Sign-up page navigation

### Issues Found
- None

---

## Journey 2: Sign-Up Page

**Status:** PASS

### Steps Executed
1. Clicked "Sign up" link from sign-in page
2. Navigated to Clerk's hosted sign-up page
3. Verified form fields: First name, Last name, Email address, Password, Continue button
4. Verified "Already have an account? Sign in" link present

### Screenshots
- `e2e-screenshots/signin/04-signup-navigation.png` — Sign-up form

### Issues Found
- None

---

## Journey 3: Public Pages

**Status:** PARTIAL PASS

### Steps Executed
1. Attempted `/aircraft` — redirected to sign-in (requires auth)
2. Attempted `/gallery` — redirected to sign-in (requires auth)
3. Attempted `/design-system` — redirected to sign-in (requires auth)

### Finding
Routes `/aircraft`, `/gallery`, and `/design-system` are NOT public despite being reference/showcase pages. Only `/component-demo/**` routes are truly public (no auth required).

### Screenshots
- None (redirected to sign-in)

### Issues Found
- **Info:** Three content pages require authentication unnecessarily. Consider making them public if they contain no sensitive data.

---

## Journey 4: Component Demo Pages

**Status:** PASS (after fix)

### Steps Executed

#### `/component-demo/all-tool-ui`
- Loaded successfully — 24 registered MCP UI components
- Sidebar navigation with categories: System Status, Workflow & Progress, Trip Creation, User Input, Quotes & RFQs
- Tab filters: All Trip Types, One Way, Round Trip, Multi City
- Components render with success/failure state variants

#### `/component-demo/flight-search-progress`
- 4-step workflow widget renders correctly
- Step control buttons functional
- Sidebar with sample flight requests visible
- Step descriptions clear and informative

#### `/component-demo/multi-city-trip`
- Filter buttons: Show All, One-Way, Round-Trip, Multi-City
- Trip cards render with route info (KTEB → KMIA), dates, passengers
- Status badges (One-Way, Active) display correctly
- Copy button for Trip ID present

#### `/component-demo/proposal-sent-confirmation`
- Success card with "Proposal Sent Successfully" heading
- Flight details: route, departure date, total price (USD 45,000.00)
- "View Full Proposal PDF" link and "Generate Contract" button
- Filter buttons for trip type variants

#### `/component-demo/email-approval` — **BUG FOUND & FIXED**
- Email preview card with "Review Email Before Sending" heading
- "Pending Approval" badge, recipient info, subject, message body
- **ISSUE:** 2 hydration errors (SSR/client mismatch on timestamp)
- **ROOT CAUSE:** `new Date().toISOString()` called in component props during SSR produces different value on client
- **FIX:** Replaced dynamic `new Date().toISOString()` with static timestamp `"2026-02-26T12:00:00.000Z"` in demo page
- **VERIFICATION:** Reloaded page — "2 errors" badge gone, no hydration errors

#### `/component-demo/contract-confirmation`
- Contract card with "Contract Generated" heading and "Sent" badge
- Contract number (CONTRACT-2026-001), client info, route, pricing
- "View Contract PDF" and "Mark Payment Received" buttons
- Round-trip variant also visible below

### Screenshots
- `e2e-screenshots/public-pages/01-all-tool-ui.png`
- `e2e-screenshots/public-pages/02-flight-search-progress.png`
- `e2e-screenshots/public-pages/03-multi-city-trip.png`
- `e2e-screenshots/public-pages/04-proposal-sent-confirmation.png`
- `e2e-screenshots/public-pages/05-email-approval.png` (before fix)
- `e2e-screenshots/public-pages/06-contract-confirmation.png`
- `e2e-screenshots/public-pages/07-email-approval-fixed.png` (after fix)

### Issues Found & Fixed
- **Hydration mismatch** in `EmailPreviewCard` — `app/component-demo/email-approval/page.tsx` lines 121, 157, 197, 238, 336 + `components/email/email-preview-card.tsx:511`

---

## Journey 5: Google OAuth Sign-In

**Status:** BLOCKED

### Steps Executed
1. Navigated to `/sign-in`
2. Clicked "Continue with Google"
3. Google sign-in page loaded
4. Entered email: kinglerbercy@gmail.com
5. Clicked "Next"
6. **Google rejected:** "Couldn't sign you in — This browser or app may not be secure"

### Finding
Google OAuth blocks headless/automated browsers. This is a known limitation of Google's security measures and not an application bug.

### Screenshots
- `e2e-screenshots/signin/05-google-auth.png` — Google sign-in form
- `e2e-screenshots/signin/06-google-password.png` — Google rejection page

---

## Responsive Testing

### Sign-In Page

| Viewport | Status | Notes |
|----------|--------|-------|
| Mobile (375x812) | PASS | Clean layout, no overflow, good touch targets |
| Tablet (768x1024) | PASS | Properly centered |
| Desktop (1440x900) | PASS | Well-proportioned |

### Component Demo: All Tool UI

| Viewport | Status | Notes |
|----------|--------|-------|
| Mobile (375x812) | PASS | Sidebar collapses to hamburger, content stacks vertically |

### Component Demo: Multi-City Trip

| Viewport | Status | Notes |
|----------|--------|-------|
| Mobile (375x812) | PASS | Filter buttons wrap, cards stack, route display readable |

### Component Demo: Email Approval

| Viewport | Status | Notes |
|----------|--------|-------|
| Mobile (375x812) | PASS | Cards readable, filters wrap properly |

### Component Demo: Contract Confirmation

| Viewport | Status | Notes |
|----------|--------|-------|
| Mobile (375x812) | PASS | Clean card layout, proper button sizing |

### Component Demo: Proposal Sent Confirmation

| Viewport | Status | Notes |
|----------|--------|-------|
| Mobile (375x812) | MINOR | Title "ProposalSentConfirmati..." truncates |

### Component Demo: Flight Search Progress

| Viewport | Status | Notes |
|----------|--------|-------|
| Mobile (375x812) | **FAIL** | Sidebar doesn't collapse, main content clipped/overflows |
| Tablet (768x1024) | PASS | Layout works correctly with sidebar visible |

### Responsive Screenshots
- `e2e-screenshots/responsive/01-signin-mobile.png`
- `e2e-screenshots/responsive/02-signin-tablet.png`
- `e2e-screenshots/responsive/03-signin-desktop.png`
- `e2e-screenshots/responsive/04-all-tool-ui-mobile.png`
- `e2e-screenshots/responsive/05-multi-city-mobile.png`
- `e2e-screenshots/responsive/06-email-approval-mobile.png`
- `e2e-screenshots/responsive/07-flight-progress-mobile.png`
- `e2e-screenshots/responsive/08-flight-progress-tablet.png`
- `e2e-screenshots/responsive/09-contract-mobile.png`
- `e2e-screenshots/responsive/10-proposal-mobile.png`

---

## Bug Hunt Findings (Code Analysis)

### Critical

#### 1. Unauthenticated Health Endpoint Leaks Data & Burns API Quota
- **File:** `app/api/chat/route.ts:682-713`
- **Issue:** `GET /api/chat` has no auth check. It creates a live OpenAI client, calls `models.list()`, and returns the count of ISO agents in the database.
- **Impact:** Anyone can enumerate agent counts, probe connectivity, and burn API quota.
- **Fix:** Add `await auth()` check at the top, identical to the POST handler.

#### 2. Missing Ownership Check on Proposal Margin Update
- **File:** `app/api/proposal/[id]/margin/route.ts:22-61`
- **Issue:** Authenticates via Clerk but fetches/updates ANY proposal by UUID without verifying ownership.
- **Impact:** Any authenticated user who knows another agent's proposal UUID can modify its margin.
- **Fix:** Resolve `iso_agent_id` from Clerk `userId`, add `.eq('iso_agent_id', isoAgentId)` to queries.

#### 3. PostgREST `.update().order().limit()` is a No-Op
- **File:** `app/api/webhooks/avinode/route.ts:180-186, 231-237, 264-270`
- **Issue:** PostgREST silently ignores `.order()` and `.limit()` on UPDATE statements. ALL matching rows get updated instead of just the most recent.
- **Impact:** Corrupts audit trail — all historical webhook events for a trip get their status overwritten.
- **Fix:** SELECT the specific row ID first, then UPDATE using `.eq('id', specificId)`.

### High

#### 4. Module-Level MCP Singleton Unsafe in Serverless
- **File:** `app/api/chat/route.ts:50-57`
- **Issue:** `AvinodeMCPServer` singleton persists across requests. If it enters an error state, it stays broken for all subsequent requests in that warm instance.
- **Fix:** Add health check or `reset()` method called on errors.

#### 5. `Date.now()` in Webhook Event ID Causes Permanent Pending State
- **File:** `app/api/webhooks/avinode/route.ts:361, 398, 415, 472, 503`
- **Issue:** Event ID built with `Date.now()` differs between INSERT and UPDATE (milliseconds pass). The UPDATE WHERE clause never matches.
- **Fix:** Compute `avinodeEventId` once and reuse in both INSERT and UPDATE.

#### 6. Race Condition in `findOrCreateOperatorProfile`
- **File:** `app/api/webhooks/avinode/route.ts:288-329`
- **Issue:** SELECT-then-INSERT without handling duplicate key errors. Concurrent webhooks for same operator cause null operator ID.
- **Fix:** Catch `23505` unique violation and retry SELECT (same pattern as `getIsoAgentIdFromClerkUserId`).

#### 7. `margin_applied` Stores Dollar Amount But Code Expects Percentage
- **File:** `app/api/proposal/[id]/margin/route.ts:50-58`
- **Issue:** Field stores `$1,500` but downstream code reads it as `10%`. Could produce 150,000% markup on next PDF generation.
- **Fix:** Store `marginPercentage` in `margin_applied`, store dollar amount in a separate field.

### Medium

#### 8. RLS Migration References Non-Existent Column
- **File:** `supabase/migrations/039_enable_rls_all_tables.sql:211-232`
- **Issue:** Policy references `messages.conversation_id` but schema was consolidated to use `request_id` (migrations 030-033).
- **Impact:** If applied, the migration will either fail or block all authenticated reads on messages table.
- **Fix:** Update policy to use `messages.request_id` and join against `requests` table.

### Low

#### 9. Flight Search Progress Demo Layout Overflow on Mobile
- **File:** `app/component-demo/flight-search-progress/page.tsx`
- **Issue:** Sidebar doesn't collapse below ~640px viewport width, causing content overflow.
- **Fix:** Add responsive hiding (`hidden md:block`) to sidebar element.

### Console Warnings (Non-Critical)
- Clerk: `afterSignInUrl` prop deprecated — replace with `fallbackRedirectUrl` or `forceRedirectUrl`
- CSP: `script-src` not explicitly set, falls back to `default-src`
- Clerk: Development keys warning (expected in dev mode)

---

## Critical Bug Fixes Applied

The following 3 critical bugs were fixed during this E2E testing session:

### Fix 1: Unauthenticated GET /api/chat (Bug #1)
- **File:** `app/api/chat/route.ts`
- **Change:** Added `await auth()` + 401 guard at top of GET handler. Replaced live `openai.models.list()` call with `process.env.OPENAI_API_KEY` check.

### Fix 2: Missing Ownership Check on Proposal Margin (Bug #2)
- **File:** `app/api/proposal/[id]/margin/route.ts`
- **Change:** Added `iso_agents` lookup by `clerk_user_id` to get `agentId`. Added `.eq('iso_agent_id', agentId)` to both SELECT and UPDATE queries.

### Fix 3: PostgREST `.update().order().limit()` No-Op (Bug #3)
- **File:** `app/api/webhooks/avinode/route.ts`
- **Change:** Added `updateLatestWebhookEvent()` helper that SELECTs the specific row by ID first, then UPDATEs by primary key. Replaced all 3 broken `.update().order().limit()` patterns.

### Fix 4: Hydration Mismatch on Email Approval Demo (Browser Bug)
- **File:** `app/component-demo/email-approval/page.tsx` + `components/email/email-preview-card.tsx`
- **Change:** Replaced `new Date().toISOString()` with static `"2026-02-26T12:00:00.000Z"` in demo props. Added `suppressHydrationWarning` to timestamp `<p>` element.

---

## Recommendations

1. **Priority 1:** ~~Fix critical bugs #1-3~~ **DONE** (auth bypass, ownership check, PostgREST misuse)
2. **Priority 2:** Fix high bugs #5-7 (webhook event ID, race condition, margin semantics)
3. **Priority 3:** Update RLS migration (#8) before applying to production
4. **Priority 4:** Add responsive breakpoints to demo pages (#9)
5. **Future:** Set up Clerk test accounts with email/password for automated E2E testing (Google OAuth blocks headless browsers)
