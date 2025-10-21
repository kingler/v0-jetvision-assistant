# Task Template
# [Feature/Component Name]

**Task ID**: TASK-XXX
**Created**: YYYY-MM-DD
**Assigned To**: [Agent Name / Developer Name]
**Status**: `pending` | `in-progress` | `in-review` | `completed`
**Priority**: `urgent` | `high` | `normal` | `low`
**Estimated Time**: X hours
**Actual Time**: X hours (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Clear, concise description of what needs to be accomplished.

**Example**: Implement Clerk authentication integration including user signup, login, and automatic user sync to Supabase via webhooks.

### User Story
**As a** [user type]
**I want** [goal/desire]
**So that** [benefit/value]

**Example**:
**As an** ISO agent
**I want to** sign in securely to the application
**So that** I can access my flight requests and client data

### Business Value
Explain why this task is important and what problem it solves.

**Example**: Provides secure multi-tenant authentication, ensuring each broker can only access their own data, which is critical for market viability and regulatory compliance.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: [Requirement description]
- Specific detail 1
- Specific detail 2
- Specific detail 3

**FR-2**: [Another requirement]
- Detail...

**Example**:
**FR-1**: System SHALL authenticate users via Clerk
- Support email/password authentication
- Generate JWT tokens for session management
- Automatic session refresh
- Sign-out functionality

**FR-2**: System SHALL sync user data to Supabase
- Webhook receives Clerk user events (created, updated, deleted)
- User data stored in Supabase `users` table
- Include: clerk_user_id, email, full_name, role

### Acceptance Criteria

Clear, testable conditions that must be met for the task to be considered complete.

- [ ] **AC-1**: User can sign up with email and password
- [ ] **AC-2**: User can sign in and access protected routes
- [ ] **AC-3**: Clerk webhook successfully syncs new users to Supabase
- [ ] **AC-4**: User data appears in Supabase `users` table
- [ ] **AC-5**: Sign-out functionality works correctly
- [ ] **AC-6**: Protected routes redirect unauthenticated users to sign-in
- [ ] **AC-7**: All tests pass with >75% coverage
- [ ] **AC-8**: Code review approved by at least one reviewer

### Non-Functional Requirements

- **Performance**: [e.g., API response time <2s]
- **Security**: [e.g., HTTPS enforced, secrets not exposed]
- **Scalability**: [e.g., Support 100+ concurrent users]
- **Usability**: [e.g., Intuitive sign-in flow]

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

Before writing any implementation code, write failing tests that define the expected behavior.

**Test Files to Create**:
```
__tests__/unit/auth/clerk-integration.test.ts
__tests__/integration/auth/user-sync.test.ts
__tests__/e2e/auth/signin-flow.test.ts (if applicable)
```

**Example Test (Write This First)**:
```typescript
// __tests__/unit/auth/clerk-integration.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { auth } from '@clerk/nextjs/server'

describe('Clerk Authentication', () => {
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
```

**Run Tests** (they should FAIL):
```bash
npm test
# Expected: Tests fail because implementation doesn't exist yet
```

### Step 2: Implement Minimal Code (Green Phase)

Write the minimum code necessary to make the tests pass.

**Implementation Checklist**:
- [ ] Create required files
- [ ] Implement core functionality
- [ ] Make tests pass

**Example**:
```typescript
// middleware.ts
import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware()

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)']
}
```

**Run Tests Again**:
```bash
npm test
# Expected: Tests now pass ✓
```

### Step 3: Refactor (Blue Phase)

Improve code quality without changing behavior. Tests should still pass.

**Refactoring Checklist**:
- [ ] Remove code duplication
- [ ] Improve naming and readability
- [ ] Add comments for complex logic
- [ ] Ensure consistent formatting
- [ ] Update type definitions

**Run Tests After Refactoring**:
```bash
npm test
# Expected: All tests still pass ✓
```

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

Before starting:
- [ ] Review PRD.md and BRD.md for context
- [ ] Review IMPLEMENTATION_PLAN.md for detailed specifications
- [ ] Check DEVELOPMENT_PREREQUISITES.md for setup requirements
- [ ] Ensure all dependencies are installed
- [ ] Verify environment variables are configured
- [ ] Read related documentation in `docs/` directory

### Step-by-Step Implementation

**Step 1**: [First action]
- Detailed sub-step 1
- Detailed sub-step 2

**Step 2**: [Second action]
- Details...

**Example**:

**Step 1**: Install Dependencies
```bash
npm install @clerk/nextjs
```

**Step 2**: Configure Environment Variables
Add to `.env.local`:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx
```

**Step 3**: Create Middleware
File: `middleware.ts`
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect()
  }
})
```

**Step 4**: Wrap App with Provider
File: `app/layout.tsx`
```typescript
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

**Step 5**: Create Webhook Handler
File: `app/api/webhooks/clerk/route.ts`
[Implementation details...]

### Implementation Validation

After each step, validate that:
- [ ] Code compiles without errors (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Types are correct (no TypeScript errors)

---

## 5. GIT WORKFLOW

### Branch Creation

**Branch Naming Convention**:
```
<type>/<description>

Types:
- feature/   New feature or enhancement
- fix/       Bug fix
- refactor/  Code refactoring
- docs/      Documentation changes
- test/      Test additions or changes
- chore/     Build process or tooling changes
```

**Create Feature Branch**:
```bash
# Ensure you're on main and up-to-date
git checkout main
git pull origin main

# Create and switch to feature branch
git checkout -b feature/clerk-authentication

# Verify branch
git branch
```

### Commit Guidelines

**Commit Message Format** (Conventional Commits):
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code formatting (no logic change)
- `refactor`: Code change that neither fixes bug nor adds feature
- `test`: Adding or updating tests
- `chore`: Changes to build process or auxiliary tools

**Examples**:
```bash
# Good commit messages
git commit -m "feat(auth): implement Clerk authentication integration"
git commit -m "test(auth): add unit tests for Clerk middleware"
git commit -m "docs(auth): update authentication setup guide"

# Bad commit messages (avoid)
git commit -m "changes"
git commit -m "fixed stuff"
git commit -m "WIP"
```

**Commit Workflow**:
```bash
# Make changes to files

# Run tests BEFORE committing
npm test

# Stage specific files (not git add .)
git add middleware.ts
git add app/layout.tsx
git add __tests__/unit/auth/clerk-integration.test.ts

# Commit with descriptive message
git commit -m "feat(auth): implement Clerk middleware and app provider"

# Push to remote
git push origin feature/clerk-authentication
```

### Pull Request Process

**Step 1**: Create Pull Request

```bash
# Push branch to remote
git push origin feature/clerk-authentication

# Create PR via GitHub CLI (optional)
gh pr create --title "Feature: Clerk Authentication Integration" \
  --body "Implements Clerk authentication with user sync to Supabase. Closes #TASK-XXX"

# Or create PR via GitHub web interface
```

**Step 2**: Fill Out PR Template

Use the PR template (`.github/PULL_REQUEST_TEMPLATE.md`) to provide:
- Description of changes
- Related issue/task number
- Testing performed
- Screenshots (if UI changes)
- Checklist completion

**Step 3**: Request Review

- Assign at least 1 reviewer
- Apply appropriate labels (`enhancement`, `authentication`, etc.)
- Link to task issue if applicable

**Step 4**: Address Review Comments

```bash
# Make requested changes

# Run tests
npm test

# Commit changes
git add .
git commit -m "fix(auth): address PR review comments - improve error handling"

# Push updates
git push origin feature/clerk-authentication
```

**Step 5**: Merge After Approval

- Wait for approval from reviewer(s)
- Ensure all CI checks pass
- Use "Squash and merge" for clean history
- Delete branch after merge

```bash
# After merge, update local main
git checkout main
git pull origin main

# Delete local feature branch
git branch -d feature/clerk-authentication
```

---

## 6. CODE REVIEW CHECKLIST

### Reviewer Checklist

When reviewing this PR, verify:

**Functionality**:
- [ ] Code meets all acceptance criteria
- [ ] Feature works as described
- [ ] No regressions in existing functionality
- [ ] Edge cases are handled

**Code Quality**:
- [ ] Follows project coding standards (see AGENTS.md)
- [ ] No code duplication
- [ ] Functions are small and focused
- [ ] Variable/function names are clear and descriptive
- [ ] Comments explain complex logic

**Testing**:
- [ ] Tests are comprehensive and cover happy path, edge cases, errors
- [ ] Test coverage is >75% for new code
- [ ] All tests pass locally
- [ ] Tests are well-named and maintainable

**TypeScript**:
- [ ] No `any` types (use proper types or `unknown`)
- [ ] Interfaces/types are well-defined
- [ ] No type errors or warnings
- [ ] Proper use of nullable types

**Security**:
- [ ] No secrets or API keys in code
- [ ] Input validation where appropriate
- [ ] SQL injection protection (use parameterized queries)
- [ ] XSS protection (proper escaping)
- [ ] Authentication/authorization checks present

**Performance**:
- [ ] No unnecessary re-renders (React)
- [ ] Database queries are optimized
- [ ] No N+1 query problems
- [ ] Proper caching where appropriate

**Documentation**:
- [ ] Public functions have JSDoc comments
- [ ] Complex algorithms are explained
- [ ] README updated if needed
- [ ] API documentation updated if applicable

**Git Hygiene**:
- [ ] Commit messages follow conventional commits format
- [ ] No merge commits (use rebase)
- [ ] No debugging code or console.logs
- [ ] No commented-out code

### Approval Criteria

**Approve When**:
- All checklist items are satisfied
- No major concerns remain
- Minor suggestions can be addressed in follow-up

**Request Changes When**:
- Critical bugs found
- Major architectural concerns
- Security vulnerabilities present
- Test coverage insufficient

**Comment When**:
- Suggestions for improvement (non-blocking)
- Questions about approach
- Best practice recommendations

---

## 7. TESTING REQUIREMENTS

### Unit Tests

**Coverage Target**: 75%+ for new code

**Test Files**:
- `__tests__/unit/[feature]/[component].test.ts`

**What to Test**:
- Individual functions in isolation
- Component rendering (if React)
- Business logic
- Error handling
- Edge cases

**Example**:
```typescript
// __tests__/unit/auth/webhook-handler.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/webhooks/clerk/route'

describe('Clerk Webhook Handler', () => {
  it('should create user in Supabase on user.created event', async () => {
    // Arrange
    const mockRequest = createMockRequest('user.created', userData)

    // Act
    const response = await POST(mockRequest)

    // Assert
    expect(response.status).toBe(200)
    expect(supabase.from).toHaveBeenCalledWith('users')
  })

  it('should return 400 if signature is invalid', async () => {
    const mockRequest = createMockRequestWithInvalidSignature()
    const response = await POST(mockRequest)
    expect(response.status).toBe(400)
  })
})
```

### Integration Tests

**Coverage Target**: Key workflows and integrations

**Test Files**:
- `__tests__/integration/[feature]/[workflow].test.ts`

**What to Test**:
- Multiple components working together
- API endpoint flows
- Database interactions
- External service integrations (mocked)

**Example**:
```typescript
// __tests__/integration/auth/user-sync.test.ts
describe('User Sync Integration', () => {
  it('should sync user from Clerk to Supabase end-to-end', async () => {
    // Simulate Clerk webhook
    const webhook = await triggerClerkWebhook('user.created', testUser)

    // Verify user in database
    const user = await supabase.from('users').select().eq('clerk_user_id', testUser.id)
    expect(user.data).toHaveLength(1)
    expect(user.data[0].email).toBe(testUser.email)
  })
})
```

### E2E Tests (if applicable)

**Coverage Target**: Critical user journeys

**Test Files**:
- `__tests__/e2e/[feature]/[user-journey].test.ts`

**What to Test**:
- Complete user workflows
- UI interactions
- Real browser testing

**Example** (Playwright):
```typescript
// __tests__/e2e/auth/signin-flow.test.ts
import { test, expect } from '@playwright/test'

test('user can sign in and access dashboard', async ({ page }) => {
  await page.goto('http://localhost:3000')

  // Click sign in
  await page.click('text=Sign In')

  // Fill credentials
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'password123')

  // Submit
  await page.click('button[type="submit"]')

  // Verify redirect to dashboard
  await expect(page).toHaveURL('/dashboard')
  await expect(page.locator('text=Welcome')).toBeVisible()
})
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- clerk-integration.test.ts

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests (when configured)
npx playwright test
```

---

## 8. DEFINITION OF DONE

This task is considered **DONE** when ALL of the following are true:

### Code Complete
- [ ] All acceptance criteria met
- [ ] Code compiles without errors
- [ ] No TypeScript errors or warnings
- [ ] Linting passes (`npm run lint`)

### Testing Complete
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing (if applicable)
- [ ] E2E tests written and passing (if applicable)
- [ ] Test coverage >75% for new code
- [ ] Manual testing completed (if applicable)

### Documentation Complete
- [ ] Code comments added for complex logic
- [ ] JSDoc comments for public functions
- [ ] README updated (if needed)
- [ ] API documentation updated (if needed)
- [ ] Task completion notes added below

### Code Review Complete
- [ ] Pull request created
- [ ] PR description filled out
- [ ] At least 1 approval received
- [ ] All review comments addressed
- [ ] No unresolved conversations

### Deployment Ready
- [ ] Merged to main branch
- [ ] CI/CD pipeline passes
- [ ] Feature deployed to preview environment (if applicable)
- [ ] Smoke testing passed
- [ ] Feature flag configured (if applicable)

### Cleanup Complete
- [ ] Feature branch deleted
- [ ] No temporary/debug code remaining
- [ ] No console.logs or debugging statements
- [ ] No commented-out code

---

## 9. RESOURCES & REFERENCES

### Documentation
- [Project PRD](../docs/PRD.md)
- [Project BRD](../docs/BRD.md)
- [Implementation Plan](../docs/IMPLEMENTATION_PLAN.md)
- [System Architecture](../docs/SYSTEM_ARCHITECTURE.md)
- [Coding Guidelines](../docs/AGENTS.md)
- [Development Prerequisites](../docs/DEVELOPMENT_PREREQUISITES.md)

### External Documentation
- [Clerk Documentation](https://clerk.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vitest Documentation](https://vitest.dev/)

### Related Tasks
- TASK-XXX: [Related task name]
- TASK-YYY: [Dependency task]

### Design/Mockups
- [Figma Link] (if applicable)
- [Screenshots] (if applicable)

---

## 10. NOTES & QUESTIONS

### Implementation Notes
[Add notes during implementation about decisions made, challenges faced, etc.]

### Open Questions
- [ ] Question 1?
- [ ] Question 2?

### Assumptions
- Assumption 1
- Assumption 2

### Risks/Blockers
- Risk 1: [Description and mitigation]
- Blocker 1: [Description and resolution plan]

---

## 11. COMPLETION SUMMARY

### What Was Accomplished
[Fill out after task completion]
- Completed item 1
- Completed item 2

### Changes Made
[List all files created/modified]
- Created: `middleware.ts`
- Modified: `app/layout.tsx`
- Created: `app/api/webhooks/clerk/route.ts`
- Created: `__tests__/unit/auth/clerk-integration.test.ts`

### Test Results
```
Test Suites: X passed, X total
Tests:       X passed, X total
Coverage:    XX% statements, XX% branches, XX% functions, XX% lines
```

### Known Issues/Future Work
- Issue 1: [Description]
- Future enhancement 1: [Description]

### Time Tracking
- **Estimated**: X hours
- **Actual**: X hours
- **Variance**: +/- X hours

### Lessons Learned
- Lesson 1
- Lesson 2

---

**Task Status**: ✅ COMPLETED | 🚧 IN PROGRESS | ⏳ PENDING | 🚫 BLOCKED

**Completed By**: [Name]
**Completed Date**: YYYY-MM-DD
**Reviewed By**: [Reviewer Name(s)]
**Review Date**: YYYY-MM-DD
