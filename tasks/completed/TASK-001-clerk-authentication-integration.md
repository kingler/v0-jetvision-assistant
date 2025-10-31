# TASK-001: Implement Clerk Authentication Integration

**Status**: 🟡 Active
**Priority**: HIGH
**Estimated Time**: 4-6 hours
**Assigned To**: Neo Agent
**Created**: October 20, 2025
**Due Date**: October 23, 2025

---

## 1. Task Overview

### Objective
Integrate Clerk authentication into the Jetvision AI Assistant application to enable secure user authentication, session management, and user profile synchronization with Supabase.

### User Story
```
As a broker user
I want to securely log in to the Jetvision AI Assistant
So that I can access my private flight requests and client data
```

### Business Value
- **Security**: Industry-standard authentication with JWT tokens
- **User Experience**: Social login (Google, Microsoft) + email/password
- **Multi-tenancy**: User isolation via Clerk user IDs
- **Compliance**: SOC 2 compliant authentication provider
- **Developer Experience**: Simplified auth implementation with middleware

### Success Metrics
- ✅ Users can sign up with email/password
- ✅ Users can log in with Google OAuth
- ✅ Protected routes redirect unauthenticated users to login
- ✅ User profiles automatically sync to Supabase
- ✅ Session persists across browser refreshes
- ✅ All auth tests pass with >80% coverage

---

## 2. Requirements & Acceptance Criteria

### Functional Requirements

**FR-1: User Sign Up**
- [ ] Users can create account with email/password
- [ ] Password meets security requirements (8+ chars, 1 number, 1 special)
- [ ] Email verification required before access
- [ ] New user profile created in Supabase `users` table
- [ ] Welcome email sent (Clerk handles this)

**FR-2: User Sign In**
- [ ] Users can log in with email/password
- [ ] Users can log in with Google OAuth
- [ ] "Remember me" functionality (30-day session)
- [ ] Failed login attempts tracked and rate-limited
- [ ] Session token stored in secure HTTP-only cookie

**FR-3: Protected Routes**
- [ ] `/dashboard` requires authentication
- [ ] `/rfp/*` requires authentication
- [ ] `/clients/*` requires authentication
- [ ] `/proposals/*` requires authentication
- [ ] Unauthenticated access redirects to `/sign-in`

**FR-4: User Profile Management**
- [ ] Users can view profile in settings
- [ ] Users can update name and email
- [ ] Users can change password
- [ ] Profile changes sync to Supabase

**FR-5: User Synchronization**
- [ ] Clerk webhook receives user.created event
- [ ] Webhook creates corresponding record in Supabase
- [ ] User data includes: clerk_user_id, email, full_name, role
- [ ] Default role is "broker"
- [ ] Sync failures logged and retried

### Non-Functional Requirements

**NFR-1: Performance**
- Auth check completes in <50ms
- Sign-in flow completes in <2 seconds

**NFR-2: Security**
- JWT tokens validated on every request
- Tokens expire after 1 hour (refresh after 30 min)
- Secure HTTP-only cookies
- CSRF protection enabled

**NFR-3: User Experience**
- Loading states during auth operations
- Clear error messages for auth failures
- Seamless redirect after login

### Acceptance Criteria

- [ ] ✅ Unit tests pass for auth utilities
- [ ] ✅ Integration tests pass for auth flows
- [ ] ✅ E2E tests pass for sign-up, sign-in, sign-out
- [ ] ✅ Code coverage >80% for new auth code
- [ ] ✅ ESLint passes with no errors
- [ ] ✅ TypeScript compiles with no errors
- [ ] ✅ Build succeeds
- [ ] ✅ Manual testing completed on Chrome, Firefox, Safari
- [ ] ✅ Documentation updated

---

## 3. Test-Driven Development (TDD) Approach

### Phase 1: Red - Write Failing Tests

**Step 1**: Create test file structure
```bash
mkdir -p __tests__/unit/auth
mkdir -p __tests__/integration/auth
mkdir -p __tests__/e2e/auth
```

**Step 2**: Write unit tests for auth utilities

File: `__tests__/unit/auth/clerk-auth.test.ts`
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { auth, currentUser } from '@clerk/nextjs/server'

describe('Clerk Authentication', () => {
  describe('auth()', () => {
    it('should return user ID for authenticated users', async () => {
      const { userId } = await auth()
      expect(userId).toBeDefined()
      expect(typeof userId).toBe('string')
    })

    it('should return null for unauthenticated users', async () => {
      // Mock unauthenticated state
      const { userId } = await auth()
      expect(userId).toBeNull()
    })
  })

  describe('currentUser()', () => {
    it('should return user object with email and name', async () => {
      const user = await currentUser()
      expect(user).toHaveProperty('id')
      expect(user).toHaveProperty('emailAddresses')
      expect(user).toHaveProperty('firstName')
      expect(user).toHaveProperty('lastName')
    })
  })
})
```

**Step 3**: Write integration tests for auth flow

File: `__tests__/integration/auth/auth-flow.test.ts`
```typescript
import { describe, it, expect } from 'vitest'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

describe('Authentication Flow', () => {
  it('should sync user to Supabase after Clerk sign-up', async () => {
    const { userId } = await auth()

    const supabase = await createClient()
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_user_id', userId)
      .single()

    expect(user).toBeDefined()
    expect(user.clerk_user_id).toBe(userId)
    expect(user.email).toBeDefined()
    expect(user.role).toBe('broker')
  })

  it('should deny access to protected routes without auth', async () => {
    const { userId } = await auth()
    expect(userId).toBeNull()

    // Attempt to access protected route should fail
    const response = await fetch('http://localhost:3000/dashboard')
    expect(response.status).toBe(302) // Redirect to sign-in
  })
})
```

**Step 4**: Write E2E tests with Playwright

File: `__tests__/e2e/auth/sign-in.test.ts`
```typescript
import { test, expect } from '@playwright/test'

test.describe('User Sign In', () => {
  test('should sign in with email and password', async ({ page }) => {
    await page.goto('http://localhost:3000/sign-in')

    await page.fill('input[name="identifier"]', 'test@example.com')
    await page.fill('input[name="password"]', 'Test123!')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('http://localhost:3000/dashboard')
    await expect(page.locator('text=Welcome back')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:3000/sign-in')

    await page.fill('input[name="identifier"]', 'test@example.com')
    await page.fill('input[name="password"]', 'WrongPassword')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=Invalid credentials')).toBeVisible()
  })
})
```

**Commit Tests**:
```bash
git add __tests__/
git commit -m "test(auth): add comprehensive auth tests for Clerk integration

- Unit tests for auth() and currentUser()
- Integration tests for user sync
- E2E tests for sign-in flow
- Tests currently failing (Red phase)

Related to: TASK-001"
```

### Phase 2: Green - Write Minimal Code to Pass Tests

**Step 1**: Install Clerk dependencies
```bash
pnpm add @clerk/nextjs
```

**Step 2**: Add environment variables to `.env.local`
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx
```

**Step 3**: Create Clerk middleware

File: `middleware.ts`
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/',
  '/api/webhooks(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

**Step 4**: Create sign-in page

File: `app/sign-in/[[...sign-in]]/page.tsx`
```typescript
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-lg',
          },
        }}
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        afterSignInUrl="/dashboard"
      />
    </div>
  )
}
```

**Step 5**: Create sign-up page

File: `app/sign-up/[[...sign-up]]/page.tsx`
```typescript
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-lg',
          },
        }}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        afterSignUpUrl="/dashboard"
      />
    </div>
  )
}
```

**Step 6**: Create webhook handler for user sync

File: `app/api/webhooks/clerk/route.ts`
```typescript
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env.local')
  }

  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', { status: 400 })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error: Verification failed', { status: 400 })
  }

  if (evt.type === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data

    const supabase = await createClient()
    const { error } = await supabase.from('users').insert({
      clerk_user_id: id,
      email: email_addresses[0]?.email_address,
      full_name: `${first_name || ''} ${last_name || ''}`.trim(),
      role: 'broker',
    })

    if (error) {
      console.error('Error syncing user to Supabase:', error)
      return new Response('Error: Database sync failed', { status: 500 })
    }
  }

  return new Response('Success', { status: 200 })
}
```

**Step 7**: Update layout to include ClerkProvider

File: `app/layout.tsx`
```typescript
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

**Commit Implementation**:
```bash
git add .
git commit -m "feat(auth): implement Clerk authentication integration

- Add Clerk middleware for route protection
- Create sign-in and sign-up pages
- Implement webhook for user sync to Supabase
- Add ClerkProvider to root layout
- Configure protected routes
- All tests now passing (Green phase)

Implements: TASK-001"
```

### Phase 3: Blue - Refactor and Improve

**Step 1**: Extract auth utilities

File: `lib/auth/clerk-utils.ts`
```typescript
import { auth, currentUser } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth()
  return userId
}

export async function requireAuth(): Promise<string> {
  const userId = await getCurrentUserId()
  if (!userId) {
    throw new Error('Unauthorized')
  }
  return userId
}

export async function getUserProfile() {
  const user = await currentUser()
  if (!user) return null

  return {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
  }
}

export async function syncUserToDatabase(clerkUserId: string) {
  const supabase = await createClient()

  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (existingUser) {
    return existingUser
  }

  const user = await currentUser()
  if (!user) {
    throw new Error('User not found in Clerk')
  }

  const { data, error } = await supabase
    .from('users')
    .insert({
      clerk_user_id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      role: 'broker',
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}
```

**Step 2**: Add loading states to auth pages

File: `components/auth/auth-loading.tsx`
```typescript
export function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    </div>
  )
}
```

**Step 3**: Add JSDoc comments

```typescript
/**
 * Gets the current authenticated user's ID from Clerk session
 * @returns {Promise<string | null>} User ID or null if not authenticated
 * @example
 * const userId = await getCurrentUserId()
 * if (!userId) {
 *   redirect('/sign-in')
 * }
 */
export async function getCurrentUserId(): Promise<string | null> {
  // ... implementation
}
```

**Commit Refactoring**:
```bash
git add .
git commit -m "refactor(auth): extract auth utilities and improve UX

- Create reusable auth helper functions
- Add loading states for better UX
- Add JSDoc comments for public functions
- Improve error handling
- Tests still passing (Blue phase)

Related to: TASK-001"
```

---

## 4. Implementation Steps

### Step 1: Environment Setup
- [ ] Create Clerk account at clerk.com
- [ ] Create new application "Jetvision AI Assistant"
- [ ] Copy publishable key and secret key
- [ ] Add keys to `.env.local`
- [ ] Enable Google OAuth in Clerk dashboard

### Step 2: Installation
- [ ] Install `@clerk/nextjs` package
- [ ] Install `svix` for webhook verification

### Step 3: Middleware Configuration
- [ ] Create `middleware.ts` in project root
- [ ] Configure protected routes
- [ ] Configure public routes
- [ ] Test middleware redirects

### Step 4: Auth Pages
- [ ] Create `/sign-in/[[...sign-in]]/page.tsx`
- [ ] Create `/sign-up/[[...sign-up]]/page.tsx`
- [ ] Style pages with Tailwind
- [ ] Add loading states
- [ ] Test sign-up flow manually
- [ ] Test sign-in flow manually

### Step 5: User Synchronization
- [ ] Create webhook endpoint `/api/webhooks/clerk/route.ts`
- [ ] Implement `user.created` event handler
- [ ] Add webhook URL in Clerk dashboard
- [ ] Test webhook delivery
- [ ] Verify user created in Supabase

### Step 6: Protected Routes
- [ ] Update dashboard to require auth
- [ ] Add user profile display
- [ ] Add sign-out button
- [ ] Test route protection

### Step 7: Testing
- [ ] Run unit tests
- [ ] Run integration tests
- [ ] Run E2E tests
- [ ] Verify coverage >80%
- [ ] Manual testing on all browsers

### Step 8: Documentation
- [ ] Update README with auth setup instructions
- [ ] Document environment variables
- [ ] Add troubleshooting guide
- [ ] Update API documentation

---

## 5. Git Workflow

### Branch Creation
```bash
git checkout main
git pull origin main
git checkout -b feature/TASK-001-clerk-authentication
```

### Commit Messages
Follow conventional commits format:
```bash
# Tests (Red phase)
git commit -m "test(auth): add unit tests for Clerk authentication"

# Implementation (Green phase)
git commit -m "feat(auth): implement Clerk authentication integration"

# Refactoring (Blue phase)
git commit -m "refactor(auth): extract auth utilities"
```

### Pull Request
```bash
git push -u origin feature/TASK-001-clerk-authentication
# Create PR on GitHub using template
# Title: [TASK-001] Implement Clerk authentication integration
```

### PR Description Highlights
- Link this task file
- Include screenshots of sign-in/sign-up pages
- Paste test coverage report
- Note any environment variable setup required by reviewers

---

## 6. Code Review Checklist

### Functionality
- [ ] Sign-up flow works end-to-end
- [ ] Sign-in flow works end-to-end
- [ ] Protected routes redirect properly
- [ ] User sync to Supabase works
- [ ] Session persists across refreshes
- [ ] Sign-out works correctly

### Code Quality
- [ ] No hardcoded secrets in code
- [ ] Environment variables properly typed
- [ ] Error handling comprehensive
- [ ] Loading states implemented
- [ ] TypeScript strict mode passing
- [ ] No `any` types used

### Security
- [ ] Webhook signature verified
- [ ] JWT tokens validated
- [ ] Secure HTTP-only cookies used
- [ ] CSRF protection enabled
- [ ] Rate limiting configured

### Testing
- [ ] Unit tests comprehensive
- [ ] Integration tests cover sync
- [ ] E2E tests cover flows
- [ ] Edge cases tested
- [ ] Error scenarios tested
- [ ] Coverage >80%

### Performance
- [ ] Auth check <50ms
- [ ] Sign-in flow <2s
- [ ] No unnecessary re-renders
- [ ] Proper loading states

### Documentation
- [ ] JSDoc comments added
- [ ] README updated
- [ ] Environment variables documented
- [ ] Troubleshooting guide added

---

## 7. Testing Requirements

### Unit Tests (Target: >85% coverage)
```bash
npm run test __tests__/unit/auth
```

**Required Test Cases**:
- [ ] `auth()` returns userId for authenticated users
- [ ] `auth()` returns null for unauthenticated users
- [ ] `currentUser()` returns user object
- [ ] `getCurrentUserId()` helper works
- [ ] `requireAuth()` throws for unauthenticated
- [ ] `getUserProfile()` returns formatted profile
- [ ] `syncUserToDatabase()` creates new user
- [ ] `syncUserToDatabase()` skips existing user

### Integration Tests (Target: >80% coverage)
```bash
npm run test __tests__/integration/auth
```

**Required Test Cases**:
- [ ] User created in Supabase after sign-up
- [ ] Clerk user ID matches Supabase record
- [ ] Default role is "broker"
- [ ] Email synced correctly
- [ ] Full name synced correctly
- [ ] Protected routes deny access without auth
- [ ] Public routes allow access without auth

### E2E Tests (All scenarios must pass)
```bash
npm run test:e2e __tests__/e2e/auth
```

**Required Test Cases**:
- [ ] Sign-up with email/password
- [ ] Sign-in with email/password
- [ ] Sign-in with Google OAuth
- [ ] Invalid credentials show error
- [ ] Protected route redirects to sign-in
- [ ] After sign-in, redirect to dashboard
- [ ] Sign-out clears session
- [ ] Session persists after refresh

### Manual Testing
- [ ] Test on Chrome (latest)
- [ ] Test on Firefox (latest)
- [ ] Test on Safari (latest)
- [ ] Test on mobile viewport
- [ ] Test error scenarios (network failure, invalid token)
- [ ] Test edge cases (special characters in email, very long names)

---

## 8. Definition of Done

### Code Complete
- [x] All implementation steps completed
- [x] Tests written using TDD (Red-Green-Blue)
- [x] All tests passing
- [x] Code coverage >80%
- [x] ESLint passes
- [x] TypeScript compiles
- [x] Build succeeds

### Quality Verified
- [ ] Code reviewed and approved
- [ ] Manual testing completed
- [ ] No security vulnerabilities
- [ ] Performance benchmarks met
- [ ] Accessibility requirements met

### Documentation Updated
- [ ] Code comments added
- [ ] JSDoc comments for public functions
- [ ] README updated
- [ ] Environment variables documented
- [ ] Troubleshooting guide created

### Deployed
- [ ] PR merged to main
- [ ] Task file moved to `tasks/completed/`
- [ ] Feature deployed to staging
- [ ] Smoke tests passed on staging
- [ ] Ready for production

---

## 9. Resources & References

### Documentation
- [Clerk Next.js Documentation](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk Webhooks Guide](https://clerk.com/docs/integrations/webhooks)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

### Internal Documentation
- `docs/SYSTEM_ARCHITECTURE.md` - System overview
- `docs/PRD.md` - Product requirements (FR-2 Authentication)
- `docs/AGENTS.md` - Coding guidelines
- `docs/GIT_WORKFLOW.md` - Git workflow process

### Related Tasks
- TASK-002: Supabase Database Schema (depends on this)
- TASK-005: User Profile Management (builds on this)

### Code Examples
- See `.github/PULL_REQUEST_TEMPLATE.md` for PR format
- See `tasks/templates/TASK_TEMPLATE.md` for task structure

---

## 10. Notes & Questions

### Open Questions
- [ ] Should we enable multi-factor authentication (MFA) in Phase 1 or Phase 2?
  - **Decision**: Phase 2 (nice-to-have, not critical for MVP)

- [ ] Do we need role-based access control (RBAC) beyond "broker" role?
  - **Decision**: Phase 3 (admin role for future)

- [ ] Should we implement custom sign-in/sign-up pages or use Clerk components?
  - **Decision**: Use Clerk components for Phase 1 (faster), customize in Phase 2

### Known Issues
- None yet

### Future Enhancements
- Custom email templates for Clerk
- Multi-factor authentication (MFA)
- Social login with Microsoft Azure AD
- Admin role and permissions

### Dependencies
- **Blocked by**: None (can start immediately)
- **Blocks**: TASK-002 (Supabase schema needs user auth working)
- **Blocks**: TASK-015 (Agents need user context)

---

## 11. Completion Summary

**To be filled out when task is completed**

### Implementation Summary
<!-- Brief description of what was implemented -->

### Test Results
<!-- Paste test coverage report -->
```
Test Suites: X passed, X total
Tests:       X passed, X total
Coverage:    XX% statements, XX% branches, XX% functions, XX% lines
```

### Performance Metrics
<!-- Paste performance measurements -->
```
Auth check: XXms
Sign-in flow: XXms
```

### Challenges & Solutions
<!-- Document any issues encountered and how they were resolved -->

### Lessons Learned
<!-- What did we learn from this task? -->

### Follow-up Tasks Created
<!-- Any new tasks identified during implementation? -->

---

**Task Created By**: Development Team
**Last Updated**: October 20, 2025
**Completion Date**: _TBD_
