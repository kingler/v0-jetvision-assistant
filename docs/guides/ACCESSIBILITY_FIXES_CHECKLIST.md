# Accessibility Fixes Checklist - Critical Path

**Goal**: Achieve 90%+ WCAG 2.1 AA compliance
**Time Estimate**: 8 hours for critical fixes
**Status**: ❌ Not Started

---

## Critical Fixes (WCAG Level A - Must Fix)

### ✅ 1. Add Proper Form Labels (2 hours)

**File**: `/components/landing-page.tsx`

**Current Code** (Lines 97-102):
```tsx
<Input
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  placeholder="Type your message to start a new chat..."
  className="pr-12 h-12 sm:h-14 text-base sm:text-lg"
/>
```

**Fixed Code**:
```tsx
<Label htmlFor="landing-message-input" className="sr-only">
  Enter your message to start a new chat
</Label>
<Input
  id="landing-message-input"
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  placeholder="Type your message to start a new chat..."
  className="pr-12 h-12 sm:h-14 text-base sm:text-lg"
  aria-required="true"
  aria-invalid={!!error}
  aria-describedby={error ? "landing-error-message" : undefined}
/>
```

**Also Fix** in `/components/chat-interface.tsx` (similar pattern)

**WCAG**: 3.3.2 Labels or Instructions (Level A)

---

### ✅ 2. Add Skip Navigation Link (30 minutes)

**File**: `/app/page.tsx`

**Add at the very top** (Line 93, before main div):
```tsx
export default function JetvisionAgent() {
  const { user, isLoaded } = useUser()
  // ... existing state

  return (
    <>
      {/* Skip Navigation Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:bg-cyan-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-md"
      >
        Skip to main content
      </a>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
        {/* ... rest of app */}
      </div>
    </>
  )
}
```

**Add ID to main element** (Line 181):
```tsx
<main
  id="main-content"  // Add this
  className={`
    ${currentView === "workflow" ? "overflow-y-auto" : "overflow-hidden"}
    ${isMobile ? "h-[calc(100vh-60px)]" : "h-[calc(100vh-64px)]"}
  `}
>
```

**WCAG**: 2.4.1 Bypass Blocks (Level A)

---

### ✅ 3. Add ARIA Labels to Icon-Only Buttons (1 hour)

**File**: `/components/chat-interface.tsx`

**Find Send Button** (around line 270-280):
```tsx
<Button
  type="submit"
  size="icon"
  className="flex-shrink-0"
  disabled={!inputValue.trim() || isProcessing}
  aria-label="Send message"  // Add this
>
  <Send className="w-4 h-4" />
</Button>
```

**File**: `/components/landing-page.tsx`

**Send Button** (Line 103):
```tsx
<Button
  type="submit"
  size="sm"
  className="absolute right-2 top-1/2 -translate-y-1/2 bg-cyan-600 hover:bg-cyan-700"
  disabled={!message.trim()}
  aria-label="Send message"  // Already has this ✓
>
  <Send className="w-4 h-4" />
</Button>
```

**File**: `/app/page.tsx`

**Sidebar Toggle** (Line 125-134):
```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => setSidebarOpen(!sidebarOpen)}
  className="text-gray-300 hover:text-white hover:bg-gray-800 flex-shrink-0"
  aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}  // Already has this ✓
  aria-expanded={sidebarOpen}  // Already has this ✓
>
  {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
</Button>
```

**WCAG**: 4.1.2 Name, Role, Value (Level A)

---

### ✅ 4. Add ARIA Live Regions for Status Updates (2 hours)

**File**: `/components/chat-interface.tsx`

**Add Live Region Wrapper** around status displays:
```tsx
// Add near top of component
<div
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {activeChat.status === "requesting_quotes" && (
    `Currently requesting quotes. Received ${activeChat.quotesReceived || 0} out of ${activeChat.quotesTotal || 5} quotes.`
  )}
  {activeChat.status === "proposal_ready" && (
    `Proposal is ready for review.`
  )}
</div>
```

**File**: `/components/workflow-visualization.tsx`

**Add Status Announcements**:
```tsx
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {isProcessing
    ? `Workflow in progress. Current step: ${getCurrentStepTitle(currentStep)}`
    : `Workflow step ${currentStep} of ${totalSteps} completed.`
  }
</div>
```

**File**: `/components/chat-sidebar.tsx`

**Status Change Announcements**:
```tsx
{chatSessions.map((session) => (
  <Card key={session.id}>
    <div aria-live="polite" className="sr-only">
      {session.status === "proposal_ready" && `Flight Request ${session.id} proposal is ready`}
    </div>
    {/* ... rest of card */}
  </Card>
))}
```

**WCAG**: 4.1.3 Status Messages (Level AA)

---

### ✅ 5. Associate Error Messages with Inputs (2 hours)

**File**: `/components/landing-page.tsx`

**Update Error Display** (Lines 91-95):
```tsx
{error && (
  <div
    id="landing-error-message"  // Add this
    role="alert"  // Add this
    className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-300"
  >
    {error}
  </div>
)}
```

**Update Input** (as shown in Fix #1):
```tsx
<Input
  id="landing-message-input"
  aria-invalid={!!error}  // Add this
  aria-describedby={error ? "landing-error-message" : undefined}  // Add this
  // ... rest of props
/>
```

**Do the same pattern** for chat interface and settings form errors.

**WCAG**: 3.3.1 Error Identification (Level A)

---

## Testing Checklist

After implementing fixes:

### Automated Testing
- [ ] Run axe DevTools on every page
- [ ] Check Lighthouse accessibility score (target: 95+)
- [ ] Run WAVE browser extension
- [ ] Verify no WCAG Level A violations

### Manual Testing
- [ ] Tab through entire app with keyboard only
- [ ] Verify skip link appears on first Tab press
- [ ] Verify all inputs have visible labels in screen reader
- [ ] Test with NVDA (Windows) or VoiceOver (Mac)
- [ ] Verify error messages are announced
- [ ] Verify status updates are announced
- [ ] Check focus indicators are visible (3:1 contrast)

### Screen Reader Testing Script
```
1. Open app with screen reader enabled
2. Press Tab - should announce "Skip to main content" link
3. Press Enter on skip link - focus should move to main content
4. Navigate to chat input - should announce label, not just placeholder
5. Enter invalid text (1 char) - error should be announced
6. Navigate to sidebar - chat status should be announced
7. Trigger workflow - status changes should be announced
```

---

## Quick Validation Commands

### Check for Missing Labels
```bash
# Find inputs without associated labels
grep -r "<Input" components/ app/ | grep -v "Label" | grep -v "aria-label"
```

### Check for Icon Buttons
```bash
# Find buttons with only icons (potential aria-label needed)
grep -r "<Button" components/ app/ | grep -v "aria-label" | grep "Icon"
```

### Check for Live Regions
```bash
# Find dynamic status displays (may need aria-live)
grep -r "status" components/ | grep -v "aria-live"
```

---

## Common Mistakes to Avoid

❌ **Don't do this**:
```tsx
<Input placeholder="Email" />  // Placeholder is NOT a label
```

✅ **Do this instead**:
```tsx
<Label htmlFor="email">Email</Label>
<Input id="email" placeholder="you@example.com" />
```

---

❌ **Don't do this**:
```tsx
<Button><Icon /></Button>  // Icon-only, no accessible name
```

✅ **Do this instead**:
```tsx
<Button aria-label="Send message"><Icon /></Button>
```

---

❌ **Don't do this**:
```tsx
{error && <div>{error}</div>}  // Error not linked to input
```

✅ **Do this instead**:
```tsx
<Input aria-describedby={error ? "error-msg" : undefined} aria-invalid={!!error} />
{error && <div id="error-msg" role="alert">{error}</div>}
```

---

## Verification

After completing all fixes:

**Expected Results**:
- ✅ Lighthouse Accessibility Score: 95+
- ✅ axe DevTools: 0 critical issues
- ✅ WAVE: 0 errors
- ✅ Screen reader can navigate entire app
- ✅ All form inputs identifiable
- ✅ All status changes announced
- ✅ All errors announced and linked

**If any verification fails**, review the specific fix and test again.

---

## Resources

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM ARIA Techniques](https://webaim.org/techniques/aria/)
- [Radix UI Accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility)
- [Next.js Accessibility](https://nextjs.org/docs/app/building-your-application/accessibility)

---

**Ready to Start?** Begin with Fix #1 (Form Labels) as it's the most impactful change.

**Questions?** Each fix includes exact line numbers and code snippets for easy implementation.

**Time Tracking**:
- Fix #1: 2 hours
- Fix #2: 30 minutes
- Fix #3: 1 hour
- Fix #4: 2 hours
- Fix #5: 2 hours
- **Total**: ~8 hours

---

**Last Updated**: November 2, 2025
**Status**: Ready for implementation
**Priority**: Critical (blocking production deployment)
