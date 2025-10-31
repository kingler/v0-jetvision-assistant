# TASK-039: Fix Color Contrast for WCAG AA Compliance

**Status**: 🔴 Critical
**Priority**: URGENT
**Estimated Time**: 3 hours
**Assigned To**: Frontend Developer / UX Designer
**Created**: October 22, 2025
**Due Date**: Week 1

---

## 1. Task Overview

### Objective
Update color palette to meet WCAG AA accessibility standards (4.5:1 contrast ratio for normal text).

### User Story
```
As a user with visual impairments
I want all text to be clearly readable
So that I can use the application without strain
```

### Business Value
- **Legal Compliance**: WCAG AA is often required for government/enterprise contracts
- **Accessibility**: 1 in 12 men and 1 in 200 women have some form of color blindness
- **Better UX**: High contrast benefits all users, especially in bright environments
- **Brand Reputation**: Shows commitment to inclusive design

### Success Metrics
- ✅ All text meets 4.5:1 contrast ratio (WCAG AA)
- ✅ Large text (18px+) meets 3:1 contrast ratio
- ✅ No regressions in existing functionality
- ✅ Automated accessibility tests pass

---

## 2. Requirements & Acceptance Criteria

### Functional Requirements

**FR-1: Update Muted Text Colors**
- Current: `--muted-foreground: oklch(0.3 0 0)` (#4b5563) - 3.7:1 ratio ❌
- Target: `--muted-foreground: oklch(0.25 0 0)` (#374151) - 4.6:1 ratio ✅

**FR-2: Audit All Text/Background Combinations**
- Dashboard stats labels
- Form field labels
- Error messages
- Secondary buttons
- Card descriptions
- Footer text

**FR-3: Update Dark Mode Colors**
- Ensure dark mode also meets WCAG AA
- Test all combinations in both themes

### Acceptance Criteria

- [ ] **AC-1**: Muted text color updated in `app/globals.css`
- [ ] **AC-2**: All text/background combos meet 4.5:1 ratio
- [ ] **AC-3**: Dark mode passes contrast checks
- [ ] **AC-4**: axe-core automated tests pass
- [ ] **AC-5**: Manual screen reader testing completed
- [ ] **AC-6**: Visual regression tests pass
- [ ] **AC-7**: No UI regressions
- [ ] **AC-8**: Code review approved

---

## 3. Implementation Steps

**Step 1**: Run Accessibility Audit
```bash
# Install axe-core
npm install --save-dev @axe-core/react

# Run audit
npm run test:a11y
```

**Step 2**: Update CSS Variables
File: `app/globals.css`
```css
:root {
  /* OLD - fails WCAG AA */
  --muted-foreground: oklch(0.3 0 0); /* #4b5563 - 3.7:1 */

  /* NEW - passes WCAG AA */
  --muted-foreground: oklch(0.25 0 0); /* #374151 - 4.6:1 */

  /* Check other variables */
  --card-foreground: oklch(0.3 0 0); /* Update if needed */
  --popover-foreground: oklch(0.25 0 0); /* Verify */
}

.dark {
  /* Verify dark mode contrasts */
  --muted-foreground: oklch(0.708 0 0); /* Check ratio */
}
```

**Step 3**: Update Component Overrides
```bash
# Find hardcoded text-gray-500 (may fail contrast)
grep -r "text-gray-500" app/ components/

# Replace with semantic color tokens
```

**Step 4**: Test with Accessibility Tools
- Use Chrome DevTools Lighthouse
- Use axe DevTools extension
- Use Stark Figma plugin (if designs available)
- Use WebAIM contrast checker

---

## 4. Testing Requirements

### Automated Tests
```typescript
// __tests__/a11y/color-contrast.test.ts
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

describe('Color Contrast Accessibility', () => {
  it('dashboard should have no contrast violations', async () => {
    const { container } = render(<DashboardPage />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('RFP form should meet WCAG AA', async () => {
    const { container } = render(<RFPFormWizard />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

### Manual Testing Checklist
- [ ] Test with Chrome DevTools Lighthouse (Accessibility score >90)
- [ ] Test with NVDA screen reader (Windows)
- [ ] Test with VoiceOver (macOS)
- [ ] Test on real mobile devices
- [ ] Test in direct sunlight (mobile)

---

## 5. Files to Update

**Critical Files**:
```
app/globals.css:18-19          - Update --muted-foreground
app/globals.css:54            - Update dark mode colors
app/dashboard/page.tsx:145     - Check stats labels
components/ui/card.tsx:45      - Check CardDescription color
components/ui/label.tsx:15     - Verify label colors
```

**Search and Replace**:
```bash
# Find usage of muted-foreground
grep -r "muted-foreground" app/ components/

# Find hardcoded gray text
grep -r "text-gray-500\|text-gray-600" app/ components/
```

---

## 6. Definition of Done

- [ ] All text meets WCAG AA (4.5:1 for normal, 3:1 for large)
- [ ] Automated accessibility tests pass
- [ ] Manual testing completed
- [ ] Dark mode contrast verified
- [ ] No visual regressions
- [ ] Tests >85% coverage
- [ ] PR approved
- [ ] Deployed to preview

---

## 7. Resources & References

### Tools
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [OKLCH Color Picker](https://oklch.com/)
- [axe DevTools Extension](https://www.deque.com/axe/devtools/)
- [Chrome Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/)

### Documentation
- [WCAG 2.1 Level AA](https://www.w3.org/WAI/WCAG21/quickref/?versions=2.1&currentsidebar=%23col_customize&levels=aa)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

---

## 8. Notes & Questions

### Issue Found
Current muted text color has 3.7:1 contrast ratio, failing WCAG AA requirement of 4.5:1.

Found in 12+ locations:
- Dashboard stat labels
- Form descriptions
- Card subtitles
- Footer text

### Assumptions
- Design team approves slightly darker muted text
- Change is acceptable for brand guidelines

---

**Task Status**: 🔴 CRITICAL - ACCESSIBILITY
**Source**: Frontend UX/UI Analysis Report - Section 2: Accessibility
**Last Updated**: October 22, 2025
