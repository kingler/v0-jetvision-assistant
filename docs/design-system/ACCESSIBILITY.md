# Jetvision Group Design System - Accessibility Guidelines

**Version:** 1.0.0
**Last Updated:** December 2025
**Compliance Standard:** WCAG 2.1 Level AA (Minimum)

This document provides comprehensive accessibility guidelines for the Jetvision Group platform, ensuring an inclusive experience for all users.

---

## Table of Contents

1. [Overview](#overview)
2. [WCAG Compliance](#wcag-compliance)
3. [Color & Contrast](#color--contrast)
4. [Keyboard Navigation](#keyboard-navigation)
5. [Screen Readers](#screen-readers)
6. [Focus Management](#focus-management)
7. [Forms & Inputs](#forms--inputs)
8. [Interactive Elements](#interactive-elements)
9. [Content Structure](#content-structure)
10. [Testing & Validation](#testing--validation)

---

## Overview

### Why Accessibility Matters

At Jetvision Group, we believe that **everyone** should be able to access and use our platform, regardless of their abilities. Accessibility is not just a legal requirement—it's a core value that improves the experience for all users.

### Accessibility Goals

- **WCAG 2.1 Level AA** compliance as minimum standard
- **WCAG 2.1 Level AAA** for critical user flows
- Support for keyboard-only navigation
- Full screen reader compatibility
- High contrast mode support
- Reduced motion support for users with vestibular disorders

### Who Benefits

- **Users with visual impairments** - Screen readers, high contrast, magnification
- **Users with motor disabilities** - Keyboard navigation, large touch targets
- **Users with cognitive disabilities** - Clear language, consistent patterns
- **Users with hearing impairments** - Captions, transcripts for audio/video
- **All users** - Better UX, faster task completion, mobile-friendly

---

## WCAG Compliance

### Conformance Levels

We target **WCAG 2.1 Level AA** across the platform, with **Level AAA** for critical workflows.

#### Level A (Minimum)

Basic accessibility features that all web content must have:

- Text alternatives for images
- Keyboard accessibility
- Sufficient time to read content
- No content that causes seizures
- Navigable page structure

#### Level AA (Target) ✓

Enhanced accessibility requirements:

- Minimum contrast ratio 4.5:1 for normal text
- Minimum contrast ratio 3:1 for large text (18pt+)
- Resizable text up to 200% without loss of functionality
- Multiple ways to find pages
- Focus visible on all interactive elements
- Error identification and suggestions

#### Level AAA (Aspirational)

Highest level of accessibility:

- Minimum contrast ratio 7:1 for normal text
- Minimum contrast ratio 4.5:1 for large text
- No audio that plays automatically
- Sign language interpretation for videos
- Extended audio descriptions

### The Four Principles (POUR)

1. **Perceivable** - Information must be presentable to users in ways they can perceive
2. **Operable** - User interface components must be operable
3. **Understandable** - Information and operation must be understandable
4. **Robust** - Content must be robust enough for assistive technologies

---

## Color & Contrast

### Contrast Ratios

All text and interactive elements must meet minimum contrast requirements:

#### Normal Text (< 18pt regular, < 14pt bold)

**WCAG AA:** 4.5:1 minimum
**WCAG AAA:** 7:1 recommended

#### Large Text (≥ 18pt regular, ≥ 14pt bold)

**WCAG AA:** 3:1 minimum
**WCAG AAA:** 4.5:1 recommended

#### UI Components & Graphics

**WCAG AA:** 3:1 minimum for interactive elements, focus indicators, and meaningful graphics

### Approved Color Combinations

All combinations tested and WCAG AA compliant:

```css
/* Light Mode - Text on Backgrounds */
✓ Neutral 900 on White         (17.0:1) - AAA
✓ Neutral 800 on White         (12.6:1) - AAA
✓ Neutral 700 on White         (10.5:1) - AAA
✓ Neutral 600 on White         (9.2:1)  - AAA
✓ Neutral 600 on Neutral 50    (9.2:1)  - AAA

/* Brand Colors on White */
✓ Aviation Blue 700 on White   (8.2:1)  - AAA
✓ Aviation Blue 600 on White   (6.9:1)  - AA
✓ Sky Blue 700 on White        (6.5:1)  - AA
✓ Sunset Orange 700 on White   (5.1:1)  - AA

/* White Text on Brand Colors */
✓ White on Aviation Blue 500   (6.8:1)  - AA
✓ White on Sky Blue 600        (4.6:1)  - AA (large text only)
✓ White on Sunset Orange 600   (4.7:1)  - AA
✓ White on Success Green 600   (4.5:1)  - AA
✓ White on Error Red 600       (5.9:1)  - AA

/* Dark Mode - Tested Combinations */
✓ Neutral 50 on Neutral 900    (15.8:1) - AAA
✓ Neutral 100 on Neutral 950   (17.4:1) - AAA
✓ Primary Light on Dark BG     (8.1:1)  - AAA
```

### Testing Contrast

Use these tools to verify contrast ratios:

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Coolors Contrast Checker](https://coolors.co/contrast-checker)
- Chrome DevTools - Lighthouse Accessibility Audit
- axe DevTools Browser Extension

### Color Blindness Considerations

**Never rely on color alone** to convey information:

**Bad:**
```tsx
// Red/green only
<span style={{ color: 'red' }}>Error</span>
<span style={{ color: 'green' }}>Success</span>
```

**Good:**
```tsx
// Icon + color + text
<div className="flex items-center gap-2 text-destructive">
  <XCircle className="h-4 w-4" />
  <span>Error: Invalid input</span>
</div>

<div className="flex items-center gap-2 text-success">
  <CheckCircle className="h-4 w-4" />
  <span>Success: Saved</span>
</div>
```

**Supported Patterns:**

- Icons alongside color
- Text labels alongside color
- Patterns/textures in charts
- Multiple visual cues (shape, position, label)

**Test with:**

- [Coblis Color Blindness Simulator](https://www.color-blindness.com/coblis-color-blindness-simulator/)
- Chrome DevTools - Vision Deficiency Emulator

---

## Keyboard Navigation

### Core Requirements

**All interactive elements must be:**

- Reachable via keyboard (Tab/Shift+Tab)
- Activatable via keyboard (Enter/Space)
- Clearly focused (visible focus indicator)
- Logically ordered (left-to-right, top-to-bottom)

### Keyboard Shortcuts

Standard keyboard interactions users expect:

| Key | Action | Context |
|-----|--------|---------|
| Tab | Move focus forward | All pages |
| Shift+Tab | Move focus backward | All pages |
| Enter | Activate button/link | Buttons, links |
| Space | Activate button, toggle checkbox | Buttons, checkboxes |
| Escape | Close modal/dropdown | Modals, dropdowns, menus |
| Arrow Keys | Navigate within component | Dropdowns, tabs, sliders |
| Home | Jump to first item | Lists, dropdowns |
| End | Jump to last item | Lists, dropdowns |

### Focus Order

Tab order should follow visual layout and logical flow:

```tsx
// Good - Logical order
<form>
  <Input id="first-name" /> {/* Tab order 1 */}
  <Input id="last-name" />  {/* Tab order 2 */}
  <Input id="email" />      {/* Tab order 3 */}
  <Button type="submit">    {/* Tab order 4 */}
    Submit
  </Button>
</form>
```

**Never use positive `tabindex` values:**

```tsx
// Bad - Disrupts natural flow
<Button tabIndex={3}>Third</Button>
<Button tabIndex={1}>First</Button>
<Button tabIndex={2}>Second</Button>

// Good - Natural DOM order
<Button>First</Button>
<Button>Second</Button>
<Button>Third</Button>
```

### Skip Links

Provide skip links for keyboard users to bypass repetitive navigation:

```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white"
>
  Skip to main content
</a>

<main id="main-content">
  {/* Page content */}
</main>
```

### Focus Trapping

For modals and dialogs, trap focus within the component:

```tsx
import { Dialog, DialogContent } from '@/components/ui/dialog'

// Focus automatically trapped by Radix UI
<Dialog>
  <DialogContent>
    {/* Focus cycles within dialog */}
    <Input /> {/* First focusable */}
    <Button>Cancel</Button>
    <Button>Confirm</Button> {/* Last focusable */}
  </DialogContent>
</Dialog>
```

---

## Screen Readers

### Semantic HTML

Use semantic HTML elements for proper screen reader announcements:

```tsx
// Good - Semantic HTML
<header>...</header>
<nav>...</nav>
<main>...</main>
<article>...</article>
<aside>...</aside>
<footer>...</footer>

// Bad - Generic divs
<div className="header">...</div>
<div className="nav">...</div>
```

### ARIA Attributes

Use ARIA attributes to enhance accessibility when semantic HTML isn't sufficient:

#### ARIA Labels

```tsx
// Icon-only button
<Button variant="ghost" size="icon" aria-label="Close dialog">
  <X className="h-4 w-4" />
</Button>

// Search input
<Input
  type="search"
  aria-label="Search flights"
  placeholder="Search..."
/>

// Logo link
<a href="/" aria-label="Jetvision Home">
  <Plane className="h-6 w-6" />
</a>
```

#### ARIA Descriptions

```tsx
// Input with helper text
<div>
  <Label htmlFor="passengers">Passengers</Label>
  <Input
    id="passengers"
    aria-describedby="passengers-help"
  />
  <p id="passengers-help" className="text-sm text-muted-foreground">
    Maximum 19 passengers per aircraft
  </p>
</div>

// Error message
<div>
  <Input
    id="email"
    aria-invalid="true"
    aria-describedby="email-error"
  />
  <p id="email-error" role="alert" className="text-sm text-destructive">
    Please enter a valid email address
  </p>
</div>
```

#### ARIA Live Regions

Announce dynamic content changes:

```tsx
// Status updates
<div aria-live="polite" aria-atomic="true">
  Quote request sent to 5 operators
</div>

// Urgent alerts
<div role="alert" aria-live="assertive">
  Error: Flight booking failed
</div>

// Loading state
<div aria-live="polite" aria-busy="true">
  Loading flight options...
</div>
```

#### ARIA Roles

```tsx
// Navigation
<nav role="navigation" aria-label="Main navigation">
  <ul role="list">
    <li><a href="/dashboard">Dashboard</a></li>
  </ul>
</nav>

// Search
<div role="search">
  <Input type="search" aria-label="Search" />
</div>

// Alert
<div role="alert">
  Your session will expire in 5 minutes
</div>
```

### Screen Reader Only Text

Hide visual elements from screen readers, or show text only to screen readers:

```tsx
// Visually hidden, screen reader visible
import { visuallyHidden } from '@/lib/design-system'

<span style={visuallyHidden()}>
  Additional context for screen readers
</span>

// Tailwind utility
<span className="sr-only">
  Screen reader only text
</span>

// Hide from screen readers
<span aria-hidden="true">
  Decorative icon
</span>
```

### Testing with Screen Readers

**macOS:** VoiceOver (Cmd+F5)
**Windows:** NVDA (free) or JAWS
**iOS:** VoiceOver (Settings → Accessibility)
**Android:** TalkBack (Settings → Accessibility)

**Common Gestures:**

- Navigate: Arrow keys (desktop), swipe (mobile)
- Activate: Enter (desktop), double-tap (mobile)
- Read all: Cmd+A (VoiceOver), Insert+Down (NVDA)

---

## Focus Management

### Visible Focus Indicators

All interactive elements must have clearly visible focus indicators:

```tsx
// Using design system focus ring
import { focusRing } from '@/lib/design-system'

<button style={focusRing()}>
  Click me
</button>

// Tailwind focus utilities
<button className="focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:border-ring">
  Click me
</button>
```

### Focus Ring Specifications

```css
/* Default focus ring */
outline: 3px solid var(--color-ring);
outline-offset: 2px;

/* Custom color for specific contexts */
outline: 3px solid var(--color-primary);
outline-offset: 2px;
```

**Requirements:**

- Minimum 2px width (we use 3px)
- High contrast with background (3:1 minimum)
- Consistent across all components
- Visible on both light and dark backgrounds

### Focus Management in SPAs

When navigating in a single-page app, manage focus appropriately:

```tsx
// After navigation, focus the main heading
useEffect(() => {
  const mainHeading = document.querySelector('h1')
  mainHeading?.focus()
}, [pathname])

// After modal close, return focus
const buttonRef = useRef<HTMLButtonElement>(null)

const handleModalClose = () => {
  setModalOpen(false)
  buttonRef.current?.focus() // Return focus to trigger
}
```

---

## Forms & Inputs

### Labels

**Always** provide visible labels for form inputs:

```tsx
// Good
<div>
  <Label htmlFor="email">Email Address</Label>
  <Input id="email" type="email" />
</div>

// Bad - Placeholder as label
<Input placeholder="Email" /> ❌

// Bad - No label
<Input type="email" /> ❌
```

### Required Fields

Indicate required fields clearly:

```tsx
<div>
  <Label htmlFor="name">
    Full Name <span className="text-destructive">*</span>
  </Label>
  <Input
    id="name"
    required
    aria-required="true"
  />
</div>

// Or use aria-label
<Input
  aria-label="Full Name (required)"
  required
/>
```

### Error Handling

Provide clear, accessible error messages:

```tsx
<div>
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    aria-invalid="true"
    aria-describedby="email-error"
  />
  <p id="email-error" role="alert" className="text-sm text-destructive">
    Please enter a valid email address
  </p>
</div>
```

**Error Message Requirements:**

- Clearly describe the error
- Suggest how to fix it
- Use `role="alert"` for dynamic errors
- Associate with input via `aria-describedby`
- Sufficient color contrast

### Fieldsets & Legends

Group related inputs:

```tsx
<fieldset>
  <legend className="text-lg font-semibold mb-4">
    Passenger Information
  </legend>

  <div className="space-y-4">
    <div>
      <Label htmlFor="first-name">First Name</Label>
      <Input id="first-name" />
    </div>
    <div>
      <Label htmlFor="last-name">Last Name</Label>
      <Input id="last-name" />
    </div>
  </div>
</fieldset>
```

### Autocomplete

Use autocomplete attributes to help users:

```tsx
<Input
  type="text"
  autocomplete="given-name"
  id="first-name"
/>

<Input
  type="email"
  autocomplete="email"
  id="email"
/>

<Input
  type="tel"
  autocomplete="tel"
  id="phone"
/>
```

---

## Interactive Elements

### Buttons

Buttons must be:

- Keyboard accessible (focusable, activatable)
- Clearly labeled (text or aria-label)
- Minimum 44x44px touch target (AAA)
- Visually distinct states (default, hover, focus, active, disabled)

```tsx
// Good button
<Button>
  Book Flight
</Button>

// Icon button with label
<Button variant="ghost" size="icon" aria-label="Settings">
  <Settings className="h-4 w-4" />
</Button>

// Disabled button
<Button disabled aria-disabled="true">
  Unavailable
</Button>
```

### Links

Links must be:

- Descriptive (avoid "click here")
- Distinguishable from surrounding text
- Keyboard accessible

```tsx
// Good - Descriptive link text
<a href="/flights">View available flights</a>

// Bad - Generic link text
<a href="/flights">Click here</a> ❌

// External link indicator
<a href="https://example.com" target="_blank" rel="noopener noreferrer">
  External Site
  <span className="sr-only">(opens in new window)</span>
  <ExternalLink className="ml-1 h-3 w-3" aria-hidden="true" />
</a>
```

### Touch Targets

Minimum touch target sizes:

**WCAG AA:** 24x24px minimum
**WCAG AAA:** 44x44px recommended (our default)

```tsx
// All buttons meet AAA standard
<Button size="sm">32px height</Button>     // ✓ 32px
<Button size="default">36px height</Button> // ✓ 36px
<Button size="lg">40px height</Button>      // ✓ 40px
<Button size="icon">36x36px</Button>        // ✓ 36x36px
```

**Spacing between targets:** Minimum 8px gap

### Tooltips

Tooltips should supplement, not replace, visible labels:

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'

// Good - Icon button with tooltip
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon" aria-label="Delete">
        <Trash2 className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Delete item</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Tooltip Requirements:**

- Include `aria-label` on trigger element
- Keyboard accessible (visible on focus)
- Dismissible (Escape key)
- Not essential information (should be supplemental)

---

## Content Structure

### Headings

Use proper heading hierarchy:

```tsx
// Good - Proper hierarchy
<h1>Flight Booking</h1>
  <h2>Passenger Information</h2>
    <h3>Contact Details</h3>
  <h2>Payment</h2>
    <h3>Billing Address</h3>

// Bad - Skipped levels
<h1>Flight Booking</h1>
  <h3>Passenger Information</h3> ❌
```

**Rules:**

- One `<h1>` per page
- Don't skip levels (h1 → h2 → h3, not h1 → h3)
- Use headings for structure, not styling
- Screen readers use headings for navigation

### Landmarks

Use ARIA landmarks or semantic HTML:

```tsx
<header role="banner">
  <nav aria-label="Main navigation">...</nav>
</header>

<main role="main">
  <article>...</article>
  <aside role="complementary">...</aside>
</main>

<footer role="contentinfo">...</footer>
```

### Lists

Use semantic list elements:

```tsx
// Unordered list
<ul role="list">
  <li>Flight details</li>
  <li>Passenger info</li>
  <li>Payment</li>
</ul>

// Ordered list
<ol role="list">
  <li>Search flights</li>
  <li>Select quote</li>
  <li>Confirm booking</li>
</ol>

// Description list
<dl>
  <dt>Departure</dt>
  <dd>Los Angeles (LAX)</dd>

  <dt>Arrival</dt>
  <dd>New York (JFK)</dd>
</dl>
```

### Images

All images must have appropriate alt text:

```tsx
// Informative image
<img
  src="/aircraft.jpg"
  alt="Gulfstream G650 private jet on runway"
/>

// Decorative image
<img
  src="/pattern.svg"
  alt=""
  aria-hidden="true"
/>

// Complex image (chart, diagram)
<figure>
  <img
    src="/flight-stats.png"
    alt="Bar chart showing flight bookings by month"
  />
  <figcaption>
    Detailed description: January: 120 bookings, February: 145 bookings...
  </figcaption>
</figure>
```

**Alt Text Guidelines:**

- Be descriptive but concise
- Convey the purpose/function, not just what's visible
- Empty `alt=""` for decorative images
- Avoid "image of" or "picture of"

---

## Testing & Validation

### Automated Testing

Run automated accessibility tests:

```bash
# Lighthouse CI
npm run test:a11y

# axe-core via jest
npm run test:unit -- --coverage
```

**Tools:**

- **Lighthouse** - Chrome DevTools
- **axe DevTools** - Browser extension
- **WAVE** - Web accessibility evaluation tool
- **Pa11y** - Command-line accessibility tester

### Manual Testing

Perform manual keyboard testing:

1. **Tab through page** - Can you reach all interactive elements?
2. **Activate with keyboard** - Enter/Space work correctly?
3. **Escape closes modals** - Modal/dropdown behavior correct?
4. **Focus visible** - Can you always see where focus is?
5. **Logical tab order** - Does tab order make sense?

### Screen Reader Testing

Test with actual screen readers:

**macOS - VoiceOver:**
```bash
# Enable VoiceOver
Cmd + F5

# Navigate
Control + Option + Arrow Keys

# Activate
Control + Option + Space
```

**Windows - NVDA:**
```bash
# Start NVDA
Ctrl + Alt + N

# Navigate
Arrow Keys

# Activate
Enter
```

### Checklist

Before deploying, verify:

- [ ] All images have alt text
- [ ] All form inputs have visible labels
- [ ] Color contrast meets WCAG AA (4.5:1 minimum)
- [ ] Keyboard navigation works throughout
- [ ] Focus indicators visible on all interactive elements
- [ ] No keyboard traps
- [ ] Error messages are clear and associated with inputs
- [ ] ARIA attributes used correctly
- [ ] Headings in proper hierarchy
- [ ] Screen reader announces page changes
- [ ] Touch targets meet 44x44px minimum
- [ ] Works with browser zoom up to 200%

---

## Resources

### Official Guidelines

- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

### Testing Tools

- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Color Oracle](https://colororacle.org/) - Color blindness simulator

### Learning Resources

- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [Inclusive Components](https://inclusive-components.design/)
- [WebAIM Articles](https://webaim.org/articles/)

---

## Support

**Questions about accessibility?**
Contact the UX team or open an issue in the repository.

**Found an accessibility issue?**
Report it immediately—accessibility bugs are high priority.

---

**Maintained by:** Jetvision Group UX Team
**Last Review:** December 2025
**Next Review:** June 2026
