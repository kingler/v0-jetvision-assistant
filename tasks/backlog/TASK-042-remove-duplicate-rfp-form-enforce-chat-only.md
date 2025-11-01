# TASK-042: Remove Duplicate RFP Form - Enforce Chat-Only Creation

**Status**: 🔴 Critical
**Priority**: URGENT
**Estimated Time**: 2-3 hours
**Assigned To**: Frontend Developer
**Created**: October 22, 2025
**Due Date**: Week 1
**Linear Issue**: DES-124

---

## 1. Task Overview

### Objective
Remove the form-based RFP creation interface at `/app/dashboard/new-request/page.tsx` which directly violates PRD requirements for chat-based input, enforcing the specified conversational interface.

### User Story
```
As an ISO agent
I want to submit flight requests through natural conversation
So that I don't have to fill out complex forms (as stated in PRD User Story 1)
```

### Business Value
- **PRD Compliance**: FR-2.1 explicitly requires "chat-based input interface"
- **User Experience**: PRD User Story 1 emphasizes "without filling out complex forms"
- **Product Differentiation**: Conversational AI is the key differentiator vs competitors
- **Reduced Confusion**: Single entry point eliminates user uncertainty

### Critical PRD Violation

**PRD User Story 1** (docs/PRD.md:41):
> "As an ISO agent, I want to submit a client's flight request through a conversational chat interface **without filling out complex forms**"

**Current Violation**:
- `/app/dashboard/new-request/page.tsx` implements 284-line **traditional form**
- Form has 12+ input fields requiring manual data entry
- Contradicts the entire chat-first product vision

**PRD FR-2.1** (docs/PRD.md:185):
> "The system SHALL provide a **chat-based input interface** for ISO agents"

---

## 2. Requirements & Acceptance Criteria

### Functional Requirements

**FR-1: Remove Form-Based RFP Creation**
- Delete `/app/dashboard/new-request/page.tsx` (284 lines)
- Remove any components used exclusively by this form
- Remove any API routes specific to form submission

**FR-2: Redirect to Chat Interface**
- Create redirect from `/dashboard/new-request` → `/` (chat)
- Add explanation message about conversational interface
- Update all links pointing to form-based creation

**FR-3: Ensure Chat Can Handle All RFP Fields**
- Verify chat interface collects all required RFP data
- Ensure multi-turn conversation covers:
  - Client selection/information
  - Flight details (departure, arrival, dates, times)
  - Passenger count
  - Aircraft preferences
  - Special requirements
  - Budget constraints

**FR-4: Update Navigation and CTAs**
- Update dashboard "New RFP Request" button
- Update any "Create Request" links
- Update any documentation referencing form creation

### Acceptance Criteria

- [ ] **AC-1**: `/app/dashboard/new-request/page.tsx` removed from codebase
- [ ] **AC-2**: `/dashboard/new-request` route redirects to `/` (chat)
- [ ] **AC-3**: All "New Request" buttons navigate to chat interface
- [ ] **AC-4**: Chat interface can collect all form fields via conversation
- [ ] **AC-5**: No broken links or 404 errors
- [ ] **AC-6**: Tests updated to remove form-based creation flow
- [ ] **AC-7**: Documentation updated to show chat-only creation
- [ ] **AC-8**: No console errors or TypeScript errors
- [ ] **AC-9**: Code review approved
- [ ] **AC-10**: PRD compliance verified

### Non-Functional Requirements

- **User Transition**: Clear messaging about chat-based interface
- **Data Integrity**: Chat must capture same data quality as form
- **Performance**: Chat conversation must be faster than form filling
- **Accessibility**: Chat interface meets WCAG AA (see TASK-040)

---

## 3. Implementation Steps

### Step 1: Audit Current Form Implementation

First, understand what the form does:

```bash
# Read the form file
cat app/dashboard/new-request/page.tsx

# Check for dependencies
grep -r "new-request" app/ components/

# Find components used only by this form
```

**Form Fields to Verify in Chat** (from file analysis):
1. Client Name (required)
2. Client ID/Email (required)
3. Departure Airport (required, ICAO format)
4. Arrival Airport (required, ICAO format)
5. Departure Date (required)
6. Departure Time (optional)
7. Return Date (optional)
8. Return Time (optional)
9. Passenger Count (required, 1-20)
10. Aircraft Type Preference (optional)
11. Budget Range (optional)
12. Special Requirements (optional)
13. Catering Preference (optional)
14. Ground Transport (optional)

### Step 2: Verify Chat Interface Coverage

Check that chat interface handles all these fields:

File: `components/chat-interface.tsx` (read current implementation)

```tsx
// Verify the chat can handle these conversation flows:

// Example conversation:
// User: "I need to book a flight for John Smith"
// AI: "I'll help you with that. When would they like to travel?"
// User: "From New York to Miami on December 15th"
// AI: "Great! How many passengers?"
// User: "4 passengers"
// AI: "Any aircraft preferences or special requirements?"
// ... etc
```

**Required Chat Capabilities**:
- ✅ Natural language parsing of flight requests
- ✅ Multi-turn conversation for missing details
- ✅ Client lookup/selection
- ✅ Date/time understanding
- ✅ Airport code parsing
- ❓ Budget range discussion
- ❓ Catering preferences
- ❓ Ground transport

**Action**: If any fields are not handled by chat, add to TASK-043.

### Step 3: Update Dashboard "New Request" Button

File: `app/dashboard/page.tsx:125` (or wherever "New RFP Request" button exists)

**Before**:
```tsx
<Link href="/dashboard/new-request">
  <Button size="lg">
    <Plus className="mr-2 h-5 w-5" />
    New RFP Request
  </Button>
</Link>
```

**After**:
```tsx
<Link href="/?action=new-request">
  <Button size="lg">
    <Plus className="mr-2 h-5 w-5" />
    New RFP Request
  </Button>
</Link>
```

Then in `app/page.tsx`, handle the `action` query param:

```tsx
'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export default function JetVisionAgent() {
  const searchParams = useSearchParams()
  const action = searchParams.get('action')

  useEffect(() => {
    if (action === 'new-request') {
      // Auto-start new chat session
      handleNewChat()
      // Show helpful prompt
      setInitialMessage("I'd like to help you create a new RFP request. Let's start with your client's name or email.")
    }
  }, [action])

  // ... rest of component
}
```

### Step 4: Create Redirect Route

File: `app/dashboard/new-request/page.tsx` (Replace entire file)

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare } from 'lucide-react'

/**
 * RFP Form Redirect
 *
 * This form-based RFP creation interface was removed to comply with PRD requirements.
 * PRD User Story 1 explicitly states: "submit a client's flight request through a
 * conversational chat interface WITHOUT filling out complex forms"
 *
 * All RFP creation now happens through the chat interface at the root route.
 *
 * Related: TASK-042, DES-124
 * PRD Reference: docs/PRD.md:41 (User Story 1), docs/PRD.md:185 (FR-2.1)
 */
export default function NewRequestRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to chat with action parameter
    router.replace('/?action=new-request')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center max-w-md p-8">
        <MessageSquare className="h-16 w-16 mx-auto mb-4 text-primary" />
        <h1 className="text-2xl font-bold mb-2 dark:text-white">
          Redirecting to Chat Interface...
        </h1>
        <p className="text-muted-foreground mb-4">
          RFP requests are now created through our conversational AI interface,
          eliminating the need for complex forms.
        </p>
        <p className="text-sm text-muted-foreground">
          Simply tell us about your flight request in natural language.
        </p>
      </div>
    </div>
  )
}
```

### Step 5: Remove Form-Specific Components

Check for components used only by the form:

```bash
# Find form-specific components
grep -r "NewRequestForm\|RFPForm" components/

# If found, remove them
rm components/forms/new-request-form.tsx  # Example
```

**Note**: The wizard-based form at `/app/rfp/new/page.tsx` uses `components/rfp/rfp-form-wizard.tsx`. This is separate and might be kept if it integrates with chat (TBD - see TASK-041).

### Step 6: Update API Routes (If Needed)

Check if form had dedicated API routes:

```bash
# Find API routes for form submission
find app/api -name "route.ts" -o -name "route.tsx" | xargs grep -l "new-request"

# Example: app/api/rfp/create/route.ts
```

**Action**: If API route was form-specific, ensure it also works for chat-based submissions. If it's shared, leave it.

### Step 7: Update All Navigation References

```bash
# Find all references to /dashboard/new-request
grep -r "/dashboard/new-request" app/ components/ --include="*.tsx" --include="*.ts"

# Update each file to point to /?action=new-request or just /
```

**Files to Update** (examples):
- `app/dashboard/page.tsx` - "New RFP Request" button
- `components/layout/header.tsx` - Quick actions
- `components/dashboard/quick-actions.tsx` - Action cards
- Any documentation files

### Step 8: Update Tests

```typescript
// __tests__/e2e/rfp-creation.spec.ts

// REMOVE form-based test
describe('RFP Form Creation', () => {
  it('should create RFP via form', async ({ page }) => {
    await page.goto('/dashboard/new-request')
    // ... form filling
  })
})

// REPLACE with chat-based test
describe('RFP Chat Creation', () => {
  it('should create RFP via chat conversation', async ({ page }) => {
    await page.goto('/')

    // Start new request
    await page.click('text=New RFP Request')

    // Verify chat interface opens
    await expect(page.locator('textarea[placeholder*="Type your request"]')).toBeVisible()

    // Type request in natural language
    await page.fill('textarea', 'Book a flight for John Smith from JFK to LAX on Dec 15')
    await page.press('textarea', 'Enter')

    // Verify AI responds
    await expect(page.locator('text=/.*passengers.*/i')).toBeVisible({ timeout: 10000 })

    // Continue conversation
    await page.fill('textarea', '4 passengers')
    await page.press('textarea', 'Enter')

    // ... complete flow
  })

  it('should redirect /dashboard/new-request to chat', async ({ page }) => {
    await page.goto('/dashboard/new-request')

    // Should redirect to chat
    await expect(page).toHaveURL('/?action=new-request')

    // Should show chat interface
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible()
  })
})
```

### Step 9: Update Documentation

File: `docs/GETTING_STARTED.md`

```markdown
## Creating an RFP Request

### Via Chat Interface (Primary Method)

1. Navigate to the home page
2. Click "New RFP Request" or start a new chat
3. Describe your flight request in natural language:
   ```
   "I need to book a flight for my client John Smith from
   Teterboro to Miami on December 15th, 4 passengers"
   ```
4. The AI will ask clarifying questions as needed
5. Review and confirm the RFP details
6. The system will automatically search for flights

### Why Chat-Only?

Per our Product Requirements Document (PRD), Jetvision is designed as a
conversational AI assistant. This eliminates the need for complex forms
and makes the booking process more natural and efficient.

~~### Via Form (Deprecated)~~ ❌ Removed in v1.0
```

---

## 4. Testing Requirements

### Unit Tests

```typescript
// __tests__/unit/redirect/new-request-redirect.test.tsx

import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import NewRequestRedirect from '@/app/dashboard/new-request/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}))

describe('New Request Redirect', () => {
  it('should render redirect message', () => {
    const { getByText } = render(<NewRequestRedirect />)
    expect(getByText(/Redirecting to Chat Interface/i)).toBeInTheDocument()
  })

  it('should explain why redirect is happening', () => {
    const { getByText } = render(<NewRequestRedirect />)
    expect(getByText(/conversational AI interface/i)).toBeInTheDocument()
  })
})
```

### Integration Tests

```typescript
// __tests__/integration/rfp-creation-flow.test.ts

describe('RFP Creation Flow', () => {
  it('redirects form URL to chat', async () => {
    const response = await fetch('http://localhost:3000/dashboard/new-request')
    expect(response.url).toContain('/?action=new-request')
  })

  it('handles new-request action parameter', async () => {
    // Test that /?action=new-request starts a new chat
  })
})
```

### E2E Tests

```typescript
// __tests__/e2e/chat-rfp-creation.spec.ts

import { test, expect } from '@playwright/test'

test.describe('Chat-Based RFP Creation', () => {
  test('complete RFP creation via conversation', async ({ page }) => {
    await page.goto('/')

    // Click "New RFP Request" button
    await page.click('button:has-text("New RFP Request")')

    // Verify chat interface with initial prompt
    await expect(page.locator('text=/create a new RFP/i')).toBeVisible()

    // Submit flight request
    await page.fill('textarea[placeholder*="Type"]',
      'Flight for John Smith from KJFK to KMIA on 2025-12-15, 4 passengers')
    await page.press('textarea', 'Enter')

    // AI should ask follow-up questions
    await expect(page.locator('text=/aircraft.*preference/i')).toBeVisible({ timeout: 15000 })

    // Respond to follow-up
    await page.fill('textarea', 'Light jet preferred')
    await page.press('textarea', 'Enter')

    // Continue until RFP is created
    // ... more conversation steps

    // Verify RFP was created
    await expect(page.locator('text=/RFP.*created/i')).toBeVisible({ timeout: 20000 })
  })

  test('handles incomplete information gracefully', async ({ page }) => {
    await page.goto('/')

    // Submit minimal request
    await page.fill('textarea', 'Need a flight to Miami')
    await page.press('textarea', 'Enter')

    // AI should ask for missing info
    await expect(page.locator('text=/departure.*airport/i')).toBeVisible()
  })

  test('old form URL redirects to chat', async ({ page }) => {
    await page.goto('/dashboard/new-request')

    // Should redirect
    await expect(page).toHaveURL('/?action=new-request')

    // Should show redirect message briefly
    await expect(page.locator('text=/Redirecting/i')).toBeVisible()

    // Then show chat
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible({ timeout: 5000 })
  })
})
```

---

## 5. Files to Update

### Remove

```
app/dashboard/new-request/page.tsx     # 284 lines - form implementation
components/forms/rfp-form.tsx          # If exists and unused elsewhere
components/forms/rfp-form-validation.ts # If exists and unused elsewhere
```

### Modify

```
app/dashboard/new-request/page.tsx     # Replace with redirect
app/dashboard/page.tsx:125             # Update "New RFP Request" button href
app/page.tsx                           # Add action=new-request handler
components/layout/header.tsx           # Update quick action links
components/dashboard/quick-actions.tsx  # Update card links
docs/GETTING_STARTED.md                # Update to show chat-only creation
README.md                              # Update screenshots/examples
__tests__/e2e/rfp-creation.spec.ts    # Update tests
```

### Verify No Impact

```
app/rfp/new/page.tsx                   # Wizard form (separate, see TASK-041)
components/rfp/rfp-form-wizard.tsx     # Wizard components (may be kept)
lib/validations/rfp-form-schema.ts     # Validation (used by chat too)
app/api/rfp/create/route.ts            # API (used by chat too)
```

---

## 6. Definition of Done

- [ ] Form file `/app/dashboard/new-request/page.tsx` replaced with redirect
- [ ] All "New Request" buttons navigate to chat interface
- [ ] Chat interface handles `?action=new-request` parameter
- [ ] Redirect displays helpful message about conversational interface
- [ ] No broken links (all references updated)
- [ ] Tests updated and passing
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] E2E test covers complete chat-based RFP creation
- [ ] Code review approved
- [ ] PRD compliance verified
- [ ] User-facing messaging explains the change positively

---

## 7. Git Workflow

### Branch Creation

```bash
git checkout main
git pull origin main
git checkout -b fix/task-042-remove-duplicate-rfp-form
```

### Commit Strategy

```bash
# Commit 1: Add redirect and update navigation
git add app/dashboard/new-request/page.tsx app/dashboard/page.tsx app/page.tsx components/
git commit -m "fix(prd-compliance): redirect form-based RFP creation to chat interface

- Replace /dashboard/new-request/page.tsx with redirect
- Update 'New RFP Request' buttons to navigate to chat
- Add action=new-request parameter handling in chat
- Display helpful redirect message

Related to: TASK-042, DES-124
PRD Reference: docs/PRD.md:41 (User Story 1)"

# Commit 2: Update tests
git add __tests__/
git commit -m "test(rfp): update tests for chat-only RFP creation

- Remove form-based creation tests
- Add chat conversation flow tests
- Add redirect test
- Verify complete E2E flow via chat

Related to: TASK-042"

# Commit 3: Update documentation
git add docs/ README.md
git commit -m "docs: update to reflect chat-only RFP creation

- Update GETTING_STARTED.md with chat examples
- Remove form-based creation instructions
- Explain PRD rationale for conversational interface
- Update README screenshots

Related to: TASK-042"

# Final commit message summary
git commit -m "fix(prd-compliance): enforce chat-only RFP creation per PRD requirements

- Removed form-based RFP creation (PRD violation)
- All RFP creation now via conversational chat interface
- Updated navigation and tests
- Improved user experience per PRD User Story 1

BREAKING CHANGE: Form-based RFP creation removed. All requests now
created through chat interface per PRD FR-2.1 requirement.

Fixes: TASK-042, DES-124
PRD Reference: docs/PRD.md:41, docs/PRD.md:185"
```

---

## 8. Notes & Questions

### Implementation Notes

**PRD Violation Details**:
- **PRD User Story 1** (Line 41): "conversational chat interface **without filling out complex forms**"
- **PRD FR-2.1** (Line 185): "System SHALL provide a **chat-based input interface**"
- **Current Violation**: `/app/dashboard/new-request/page.tsx` is a 284-line traditional form with 12+ manual input fields

**User Impact**:
- **Positive**: Faster RFP creation via natural language
- **Positive**: Aligns with product's AI-first positioning
- **Positive**: Reduces cognitive load (no form fields to remember)
- **Potential Negative**: Users familiar with forms may need brief adjustment
- **Mitigation**: Clear messaging, helpful AI prompts

### Open Questions

- [ ] **Chat Coverage**: Does chat currently collect all 14 form fields via conversation?
- [ ] **Missing Fields**: If not, should we add to TASK-043 or handle here?
- [ ] **Wizard Form**: What about `/app/rfp/new/page.tsx` wizard? (Covered in TASK-041)
- [ ] **User Training**: Do we need to notify existing users about the change?
- [ ] **Analytics**: Should we track form→chat migration success rate?

### Assumptions

- Chat interface is functional and handles multi-turn conversations
- AI can extract all required RFP fields from natural language
- Users prefer conversational interface once they try it
- PRD is authoritative source of truth for product direction

### Risks/Blockers

**Risk**: Chat doesn't handle all form fields yet
- **Severity**: High
- **Mitigation**: Audit chat capabilities first (Step 2)
- **Fallback**: Add missing capabilities to TASK-043

**Risk**: Users complain about losing form interface
- **Severity**: Medium
- **Mitigation**: Monitor feedback, emphasize speed benefits
- **Fallback**: Can temporarily re-enable if needed (but PRD violation)

**Risk**: AI misinterprets user input
- **Severity**: Medium
- **Mitigation**: Add confirmation step, allow editing before submission
- **Note**: This is existing chat functionality to verify

**Blocker**: If TASK-041 Option A (remove dashboard), this file goes away anyway
- **Resolution**: Coordinate with TASK-041 implementation
- **Approach**: Can implement redirect now, deletion happens with TASK-041

---

## 9. User-Facing Messaging

### Redirect Page Message

```tsx
<div className="text-center">
  <h1>Welcome to Our Conversational RFP Interface</h1>
  <p>
    We've upgraded to a faster, more intuitive way to create RFP requests.
    Simply tell us what you need in your own words—no forms required.
  </p>
  <ul>
    <li>✅ Faster than filling out forms</li>
    <li>✅ Natural conversation, just like talking to a colleague</li>
    <li>✅ AI asks clarifying questions only when needed</li>
  </ul>
  <p className="text-sm">Redirecting to chat interface...</p>
</div>
```

### Help Documentation

```markdown
## Why Chat Instead of Forms?

**Before**: Fill out 12+ form fields, remember airport codes, select from dropdowns

**Now**: "I need a flight for John Smith from New York to Miami on Dec 15, 4 passengers"

The AI handles the rest! It will ask follow-up questions if needed and extract
all the details automatically. Most RFPs are created in under 2 minutes via chat.
```

---

## 10. Success Metrics

### Implementation Success

- [ ] Zero broken links after deployment
- [ ] All tests passing
- [ ] No increase in error rates
- [ ] TypeScript compilation successful
- [ ] Build succeeds

### User Adoption (Post-Deployment)

- [ ] 90%+ of users successfully create RFP via chat (week 1)
- [ ] Average RFP creation time <3 minutes (vs 5+ minutes with form)
- [ ] <5% support tickets about missing form
- [ ] User satisfaction score maintains or improves

### PRD Compliance

- [x] Implements PRD User Story 1 (conversational interface)
- [x] Implements PRD FR-2.1 (chat-based input)
- [x] Removes violation (form-based creation)
- [x] Aligns with product vision (AI-first)

---

**Task Status**: 🔴 CRITICAL - PRD COMPLIANCE
**Source**: Frontend UX/UI Analysis - Design Adherence Assessment
**PRD Violation**: docs/PRD.md:41 (User Story 1 - no forms), docs/PRD.md:185 (FR-2.1)
**Linear Issue**: DES-124
**Related Tasks**: TASK-041 (dashboard removal), TASK-043 (chat features)
**Last Updated**: October 22, 2025
**Completion Date**: TBD
