# TASK-038: Resolve Duplicate RFP Forms

**Status**: 🔴 Critical
**Priority**: URGENT
**Estimated Time**: 4 hours
**Assigned To**: Frontend Developer
**Created**: October 22, 2025
**Due Date**: Immediate (Week 1)

---

## 1. Task Overview

### Objective
Consolidate two separate RFP form implementations into a single, unified wizard-based form to eliminate user confusion and maintain a consistent user experience.

### User Story
```
As an ISO agent
I want a single, consistent way to create RFP requests
So that I don't get confused by multiple entry points with different workflows
```

### Business Value
- **Critical UX Issue**: Two separate forms confuse users and create inconsistent data
- **Brand Quality**: Duplicate implementations appear unprofessional
- **Maintenance**: Single codebase is easier to maintain and test
- **Data Integrity**: Ensures all RFPs follow the same validation and structure

### Success Metrics
- ✅ Only one RFP creation form exists in codebase
- ✅ All routes redirect to unified wizard
- ✅ Existing functionality preserved (client selection, validation, draft saving)
- ✅ No breaking changes to API contracts
- ✅ Tests pass with >80% coverage

---

## 2. Requirements & Acceptance Criteria

### Functional Requirements

**FR-1: Consolidate Form Implementations**
- Remove duplicate form at `/app/dashboard/new-request/page.tsx`
- Keep wizard-based form at `/app/rfp/new/page.tsx`
- Preserve all features from both implementations

**FR-2: Route Consolidation**
- Redirect `/dashboard/new-request` → `/rfp/new`
- Update all navigation links to use `/rfp/new`
- Update dashboard "New Request" button

**FR-3: Feature Parity**
- Client selection dropdown (from old form)
- All form fields from both implementations
- Validation from both forms (merge rules)
- Draft auto-save functionality (from wizard)
- Success/error handling (from both)

**FR-4: Migration Path**
- Ensure no existing links break
- Update all internal navigation
- Add route redirects for backward compatibility

### Acceptance Criteria

- [ ] **AC-1**: `/app/dashboard/new-request/page.tsx` is removed from codebase
- [ ] **AC-2**: `/dashboard/new-request` route redirects to `/rfp/new`
- [ ] **AC-3**: Unified wizard includes all fields from both forms
- [ ] **AC-4**: Client selection works identically to old form
- [ ] **AC-5**: All validation rules from both forms are merged
- [ ] **AC-6**: Dashboard "New RFP Request" button navigates to `/rfp/new`
- [ ] **AC-7**: All navigation links updated in components
- [ ] **AC-8**: Tests pass with >80% coverage
- [ ] **AC-9**: No console errors or warnings
- [ ] **AC-10**: Code review approved

### Non-Functional Requirements

- **Performance**: Form loads in <1s
- **Security**: All existing auth checks preserved
- **Accessibility**: WCAG AA compliant
- **Mobile**: Responsive on all breakpoints

---

## 3. Test-Driven Development (TDD) Approach

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/unit/app/rfp/new/unified-form.test.tsx
__tests__/integration/app/rfp/new/form-submission.test.ts
__tests__/e2e/rfp/create-request-flow.spec.ts
```

**Example Test**:
```typescript
// __tests__/unit/app/rfp/new/unified-form.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import RFPNewPage from '@/app/rfp/new/page'

describe('Unified RFP Form', () => {
  it('should render all required form fields', () => {
    render(<RFPNewPage />)

    // Fields from wizard
    expect(screen.getByLabelText(/client name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/departure airport/i)).toBeInTheDocument()

    // Fields from old form
    expect(screen.getByLabelText(/client selection/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/special requirements/i)).toBeInTheDocument()
  })

  it('should redirect old route to new route', async () => {
    // Test navigation from /dashboard/new-request redirects to /rfp/new
  })
})
```

### Step 2: Implement Minimal Code (Green Phase)

**Implementation Checklist**:
- [ ] Merge form field schemas from both forms
- [ ] Update RFP wizard with missing fields
- [ ] Add route redirect
- [ ] Update navigation links
- [ ] Remove old form file

### Step 3: Refactor (Blue Phase)

**Refactoring Checklist**:
- [ ] Extract repeated validation logic to shared utilities
- [ ] Simplify form state management
- [ ] Improve component organization
- [ ] Add comprehensive JSDoc comments

---

## 4. Implementation Steps

### Pre-Implementation Checklist

- [ ] Review both existing form implementations
- [ ] Document all fields from each form
- [ ] Compare validation schemas
- [ ] Identify unique features in each form
- [ ] Map data flow for both forms

### Step-by-Step Implementation

**Step 1**: Analyze Both Forms
```bash
# Read old form
code app/dashboard/new-request/page.tsx

# Read wizard form
code app/rfp/new/page.tsx
code components/rfp/rfp-form-wizard.tsx
```

**Step 2**: Create Comparison Document
```markdown
# Form Feature Comparison

## Old Form (/dashboard/new-request)
- Client dropdown with existing clients
- Special requirements textarea
- Budget field
- Aircraft type selection
- Single-page form

## Wizard Form (/rfp/new)
- Multi-step wizard (4 steps)
- VIP status badges
- Draft auto-save
- Step-by-step validation
- Progress indicator
```

**Step 3**: Merge Schemas
File: `lib/validations/rfp-form-schema.ts`
```typescript
// Add missing fields from old form
export const rfpFormSchema = z.object({
  // Existing fields...

  // Add from old form:
  budget: z.number().optional(),
  specialRequirements: z.string().optional(),
  // ... merge all unique fields
})
```

**Step 4**: Update Wizard Steps
```typescript
// Add client dropdown to ClientSelectionStep
// Add special requirements to PreferencesStep
// Add budget to PreferencesStep
```

**Step 5**: Create Route Redirect
File: `app/dashboard/new-request/page.tsx`
```typescript
'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function RedirectToRFPNew() {
  useEffect(() => {
    redirect('/rfp/new');
  }, []);

  return null;
}
```

**Step 6**: Update Navigation Links
```bash
# Find all references to old route
grep -r "/dashboard/new-request" app/ components/

# Update each file:
# app/dashboard/page.tsx:125 - Update button href
# components/header.tsx - Update navigation link
```

**Step 7**: Remove Old Implementation
```bash
# After confirming redirects work
# Remove old form (but keep the redirect file)
# Keep: app/dashboard/new-request/page.tsx (redirect only)
```

---

## 5. Git Workflow

### Branch Creation
```bash
git checkout main
git pull origin main
git checkout -b fix/task-038-resolve-duplicate-rfp-forms
```

### Commit Strategy
```bash
# Commit 1: Tests
git commit -m "test(rfp): add tests for unified RFP form

Red phase - tests for form consolidation

Related to: TASK-038"

# Commit 2: Implementation
git commit -m "fix(rfp): consolidate duplicate RFP forms into unified wizard

- Merged field schemas from both forms
- Added redirect from /dashboard/new-request to /rfp/new
- Updated all navigation links
- Removed old form implementation
- Preserved all features from both forms

Green phase - tests now passing

Fixes: TASK-038"

# Commit 3: Refactor
git commit -m "refactor(rfp): improve unified RFP form structure

- Extracted validation utilities
- Simplified state management
- Improved component organization

Blue phase - refactoring complete

Related to: TASK-038"
```

### Pull Request
```bash
git push -u origin fix/task-038-resolve-duplicate-rfp-forms

# Create PR:
# Title: [CRITICAL] Fix: Consolidate Duplicate RFP Forms
# Body: Resolves duplicate RFP form implementations. Closes TASK-038
```

---

## 6. Code Review Checklist

### Functionality
- [ ] Only one RFP form exists in the application
- [ ] All features from both forms are preserved
- [ ] Route redirect works correctly
- [ ] All navigation links updated
- [ ] No console errors or warnings

### Code Quality
- [ ] No code duplication
- [ ] Clear component structure
- [ ] Proper TypeScript types
- [ ] Follows project coding standards

### Testing
- [ ] Unit tests cover all merged functionality
- [ ] Integration tests verify redirect
- [ ] E2E test covers full RFP creation flow
- [ ] Test coverage >80%

### Security
- [ ] Auth checks preserved
- [ ] No security regressions
- [ ] Form validation still working

---

## 7. Testing Requirements

### Unit Tests
```typescript
// __tests__/unit/app/rfp/new/unified-form.test.tsx

describe('Unified RFP Form', () => {
  it('renders all form fields from both implementations', () => {
    // Test all fields present
  })

  it('validates client selection', () => {
    // Test client dropdown validation
  })

  it('validates special requirements', () => {
    // Test textarea validation
  })

  it('auto-saves drafts', () => {
    // Test draft functionality preserved
  })
})
```

### Integration Tests
```typescript
// __tests__/integration/app/rfp/new/redirect.test.ts

describe('RFP Route Redirect', () => {
  it('redirects /dashboard/new-request to /rfp/new', async () => {
    const response = await fetch('/dashboard/new-request')
    expect(response.redirected).toBe(true)
    expect(response.url).toContain('/rfp/new')
  })
})
```

### E2E Tests
```typescript
// __tests__/e2e/rfp/create-request-flow.spec.ts

test('user can create RFP via unified form', async ({ page }) => {
  await page.goto('/dashboard')
  await page.click('text=New RFP Request')

  // Should navigate to /rfp/new
  await expect(page).toHaveURL('/rfp/new')

  // Should see wizard
  await expect(page.locator('text=Client')).toBeVisible()

  // Complete form and submit
  // ... full flow test
})
```

---

## 8. Definition of Done

- [ ] All acceptance criteria met
- [ ] Old form implementation removed
- [ ] Route redirect implemented and tested
- [ ] All navigation links updated
- [ ] Tests passing (>80% coverage)
- [ ] ESLint passes
- [ ] TypeScript compiles
- [ ] Build succeeds
- [ ] PR reviewed and approved
- [ ] Merged to main
- [ ] Verified in preview deployment

---

## 9. Resources & References

### Documentation
- `/app/dashboard/new-request/page.tsx` - Old form implementation
- `/app/rfp/new/page.tsx` - Wizard implementation
- `/components/rfp/rfp-form-wizard.tsx` - Wizard component
- `/lib/validations/rfp-form-schema.ts` - Validation schema

### Related Files
- `app/dashboard/page.tsx:125` - Dashboard navigation button
- `components/header.tsx` - Header navigation links

### External References
- [Next.js redirects](https://nextjs.org/docs/app/api-reference/functions/redirect)
- [React Hook Form](https://react-hook-form.com/)
- [Zod validation](https://zod.dev/)

---

## 10. Notes & Questions

### Implementation Notes
Two separate RFP forms found during UI/UX analysis:
1. Single-page form at `/dashboard/new-request`
2. Multi-step wizard at `/rfp/new`

This creates user confusion and maintenance burden.

### Open Questions
- [ ] Which form has been used more by users? (Check analytics)
- [ ] Are there any draft RFPs saved with old form structure?
- [ ] Should we migrate any existing drafts?

### Assumptions
- Wizard-based form provides better UX (step-by-step)
- All features from both forms can be merged
- Redirects are acceptable for backward compatibility

### Risks/Blockers
- **Risk**: Users have bookmarked old URL
  - **Mitigation**: Implement permanent redirect (301)
- **Risk**: Third-party links point to old URL
  - **Mitigation**: Redirect will handle this

---

## 11. Completion Summary

**To be filled out when task is completed**

### What Was Accomplished
<!-- Completed consolidation details -->

### Changes Made
```
Removed:
- app/dashboard/new-request/page.tsx (old implementation)

Modified:
- app/dashboard/new-request/page.tsx (redirect only)
- app/rfp/new/page.tsx (merged features)
- components/rfp/rfp-form-wizard.tsx (added fields)
- lib/validations/rfp-form-schema.ts (merged schemas)
- app/dashboard/page.tsx (updated button href)

Created:
- __tests__/unit/app/rfp/new/unified-form.test.tsx
- __tests__/integration/app/rfp/new/redirect.test.ts
- __tests__/e2e/rfp/create-request-flow.spec.ts
```

### Test Results
```
Test Suites: X passed, X total
Tests:       X passed, X total
Coverage:    XX% statements, XX% branches, XX% functions, XX% lines
```

### Time Tracking
- **Estimated**: 4 hours
- **Actual**: X hours
- **Variance**: +/- X hours

---

**Task Status**: 🔴 CRITICAL - HIGH PRIORITY
**Task Created By**: UX/UI Analysis
**Source**: Frontend UX/UI Analysis Report
**Last Updated**: October 22, 2025
**Completion Date**: _TBD_
