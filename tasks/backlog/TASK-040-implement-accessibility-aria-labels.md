# TASK-040: Implement Accessibility Labels and ARIA Attributes

**Status**: 🔴 Critical
**Priority**: URGENT
**Estimated Time**: 5 hours
**Assigned To**: Frontend Developer
**Created**: October 22, 2025
**Due Date**: Week 1

---

## 1. Task Overview

### Objective
Replace visual-only indicators (asterisks) with proper ARIA attributes and add missing semantic landmarks.

### User Story
```
As a screen reader user
I want form requirements and page structure announced properly
So that I can navigate and complete forms independently
```

### Success Metrics
- ✅ All required fields have `aria-required="true"`
- ✅ All page regions have proper landmarks
- ✅ Form errors announced to screen readers
- ✅ axe-core reports 0 critical issues

---

## 2. Requirements & Acceptance Criteria

### FR-1: Replace Visual Asterisks
**Current** (❌ Not accessible):
```tsx
<Label htmlFor="clientName">
  Client Name <span className="text-destructive">*</span>
</Label>
```

**Target** (✅ Accessible):
```tsx
<Label htmlFor="clientName">
  Client Name
  <span aria-label="required" className="text-destructive"> *</span>
</Label>
<Input
  id="clientName"
  aria-required="true"
  aria-invalid={!!errors.clientName}
  aria-describedby="clientName-error"
/>
{errors.clientName && (
  <p id="clientName-error" role="alert" className="text-destructive">
    {errors.clientName.message}
  </p>
)}
```

### FR-2: Add ARIA Landmarks
```tsx
// app/dashboard/page.tsx
<div className="min-h-screen">
  <header role="banner"> {/* Add role */}
    <nav role="navigation" aria-label="Main navigation">
  </header>
  <main role="main"> {/* Add role */}
  <aside role="complementary" aria-label="Quick actions"> {/* Add for sidebar */}
  <footer role="contentinfo"> {/* Add if footer exists */}
</div>
```

### FR-3: Fix Focus Management
- Add focus trap in modals
- Add skip-to-content link
- Ensure keyboard navigation works

### Acceptance Criteria
- [ ] All required form fields have `aria-required="true"`
- [ ] Form errors have `role="alert"` and proper IDs
- [ ] Page landmarks added (banner, main, navigation, complementary)
- [ ] Focus indicators visible and high-contrast
- [ ] Keyboard navigation works for all interactive elements
- [ ] Screen reader testing passes
- [ ] axe-core shows 0 critical violations

---

## 3. Implementation Steps

**Step 1**: Update Form Components
Files to update:
- `components/rfp/steps/client-selection-step.tsx`
- `components/rfp/steps/flight-details-step.tsx`
- `components/rfp/steps/preferences-step.tsx`
- `app/dashboard/new-request/page.tsx`

**Step 2**: Add Landmarks
```tsx
// app/dashboard/page.tsx:116-280
<div className="min-h-screen bg-gray-50">
  <header role="banner" className="bg-white border-b"> {/* Line 118 */}
    <nav role="navigation" aria-label="Dashboard navigation">
      {/* Navigation content */}
    </nav>
  </header>

  <main role="main" className="container"> {/* Line 135 */}
    <section aria-labelledby="stats-heading">
      <h2 id="stats-heading" className="sr-only">Dashboard Statistics</h2>
      {/* Stats grid */}
    </section>

    <section aria-labelledby="recent-heading">
      <h2 id="recent-heading">Recent RFP Requests</h2>
      {/* Recent requests */}
    </section>
  </main>

  <aside role="complementary" aria-label="Quick Actions">
    {/* Quick actions cards */}
  </aside>
</div>
```

**Step 3**: Add sr-only Class
```css
/* app/globals.css */
@layer base {
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
}
```

**Step 4**: Update Input Component
```tsx
// components/ui/input.tsx
function Input({ className, type, 'aria-invalid': ariaInvalid, ...props }) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full ...',
        // Add visual indicator for invalid state
        ariaInvalid && 'border-destructive ring-destructive/20',
        className,
      )}
      aria-invalid={ariaInvalid}
      {...props}
    />
  )
}
```

---

## 4. Testing

### Automated Tests
```typescript
// __tests__/a11y/aria-labels.test.tsx
describe('ARIA Labels', () => {
  it('required fields have aria-required', () => {
    render(<ClientSelectionStep />)
    const clientName = screen.getByLabelText(/client name/i)
    expect(clientName).toHaveAttribute('aria-required', 'true')
  })

  it('errors are announced to screen readers', () => {
    render(<ClientSelectionStep />)
    const error = screen.getByRole('alert')
    expect(error).toHaveTextContent(/required/i)
  })

  it('page has proper landmarks', () => {
    render(<DashboardPage />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })
})
```

### Manual Testing
- [ ] Test with NVDA (Windows)
- [ ] Test with VoiceOver (macOS/iOS)
- [ ] Test with JAWS (Windows)
- [ ] Keyboard-only navigation test
- [ ] Verify focus indicators visible

---

## 5. Files to Update

```
components/rfp/steps/client-selection-step.tsx:31-95
components/rfp/steps/flight-details-step.tsx:30-141
components/rfp/steps/preferences-step.tsx
components/ui/input.tsx:5-19
components/ui/label.tsx:8-22
app/dashboard/page.tsx:116-280
app/globals.css (add sr-only utility)
```

---

## 6. Definition of Done

- [ ] All form inputs have proper ARIA attributes
- [ ] Visual asterisks have aria-label
- [ ] Errors have role="alert"
- [ ] Page landmarks added
- [ ] Screen reader testing passed
- [ ] axe-core passes
- [ ] Tests >85% coverage
- [ ] PR approved

---

**Task Status**: 🔴 CRITICAL - ACCESSIBILITY
**Source**: UX/UI Analysis - Section 2.2-2.5
**Last Updated**: October 22, 2025
