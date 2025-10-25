# TASK-044: Unify Visual Design Language - Adopt Chat-First Aesthetic

**Status**: 🟡 High Priority
**Priority**: HIGH
**Estimated Time**: 2-4 days (depends on TASK-041 decision)
**Assigned To**: Frontend Developer, UX Designer, System Architect
**Created**: October 22, 2025
**Due Date**: Week 2
**Linear Issue**: DES-126

---

## 1. Task Overview

### Objective
Unify the visual design language across the application by adopting the chat interface's modern dark theme as the primary design system, eliminating the inconsistency with the dashboard's traditional light theme.

### User Story
```
As a user of JetVision
I want a consistent visual experience throughout the application
So that it feels like a unified, professional product
```

### Business Value
- **Brand Consistency**: Single, cohesive visual identity
- **Professional Quality**: Eliminates "two different products" feeling
- **User Trust**: Consistent design signals quality and attention to detail
- **Developer Efficiency**: Single design system reduces maintenance

### Current Issue

**Two Conflicting Design Languages**:

1. **Chat UI** (`/app/page.tsx`):
   - Modern dark theme (gray-900 background)
   - Conversational, AI-focused aesthetic
   - Clean, minimal interface
   - Glassmorphism effects
   - Professional tech product feel

2. **Dashboard UI** (`/app/dashboard/*`):
   - Traditional light theme (gray-50 background)
   - Corporate SaaS aesthetic
   - Dense information displays
   - Traditional card/table layouts
   - Conventional enterprise software feel

**Impact**: Users switching between interfaces feel like they're using two different products.

### Success Metrics
- ✅ Single consistent color theme throughout app
- ✅ Unified typography and spacing system
- ✅ Consistent component styling (buttons, cards, inputs)
- ✅ Design system documented
- ✅ Zero visual inconsistencies

---

## 2. Requirements & Acceptance Criteria

### Functional Requirements

**FR-1: Adopt Chat-First Dark Theme**
- Make dark theme the default and primary theme
- Update all components to use dark theme by default
- Ensure light mode works if theme toggle exists

**FR-2: Unify Component Styles**
- All buttons use consistent sizing, padding, colors
- All cards use consistent border radius, shadows, backgrounds
- All inputs use consistent styling and focus states
- All typography uses consistent font sizes, weights, line heights

**FR-3: Create Design System Documentation**
- Document color palette with semantic naming
- Document typography scale
- Document spacing system
- Document component variants
- Provide usage examples

**FR-4: Update Existing Components**
- Migrate dashboard components (if kept per TASK-041)
- Update all UI primitives in `components/ui/*`
- Ensure all custom components follow design system

### Acceptance Criteria

- [ ] **AC-1**: Dark theme applied consistently across all pages
- [ ] **AC-2**: Color tokens defined in `globals.css` with semantic names
- [ ] **AC-3**: Typography scale documented and implemented
- [ ] **AC-4**: Spacing system (4px, 8px, 16px, 24px, 32px, etc.) used consistently
- [ ] **AC-5**: All buttons use unified sizing (height: 40px default)
- [ ] **AC-6**: All cards use unified styling (background, border, radius, shadow)
- [ ] **AC-7**: All inputs use unified styling (border, focus ring, padding)
- [ ] **AC-8**: Design system documented in `docs/DESIGN_SYSTEM.md`
- [ ] **AC-9**: Storybook (optional) or component showcase created
- [ ] **AC-10**: No visual regressions in existing features
- [ ] **AC-11**: Accessibility standards maintained (WCAG AA)
- [ ] **AC-12**: Code review approved

### Non-Functional Requirements

- **Performance**: No impact on page load times
- **Accessibility**: Maintain or improve WCAG AA compliance
- **Browser Support**: Works in Chrome, Safari, Firefox, Edge
- **Responsive**: Consistent on all breakpoints
- **Dark/Light Mode**: Support both if toggle exists

---

## 3. Design System Foundation

### Color Palette

File: `app/globals.css`

```css
@layer base {
  :root {
    /* ========================================
       JetVision Design System - Dark Theme
       ======================================== */

    /* Brand Colors */
    --brand-primary: oklch(0.55 0.22 260);      /* Purple-blue */
    --brand-secondary: oklch(0.65 0.18 220);    /* Sky blue */
    --brand-accent: oklch(0.70 0.15 150);       /* Teal */

    /* Background Colors */
    --background: oklch(0.15 0 0);              /* Near black #1a1a1a */
    --surface: oklch(0.18 0 0);                 /* Card backgrounds #242424 */
    --surface-elevated: oklch(0.22 0 0);        /* Elevated cards #2d2d2d */

    /* Text Colors */
    --foreground: oklch(0.95 0 0);              /* Primary text (white) */
    --foreground-muted: oklch(0.65 0 0);        /* Secondary text (gray-400) */
    --foreground-subtle: oklch(0.45 0 0);       /* Tertiary text (gray-600) */

    /* Border Colors */
    --border: oklch(0.25 0 0);                  /* Default borders */
    --border-strong: oklch(0.35 0 0);           /* Emphasized borders */
    --border-subtle: oklch(0.20 0 0);           /* Subtle dividers */

    /* Interactive States */
    --interactive-hover: oklch(0.25 0 0);       /* Hover backgrounds */
    --interactive-active: oklch(0.30 0 0);      /* Active/pressed state */
    --interactive-disabled: oklch(0.20 0 0);    /* Disabled state */

    /* Semantic Colors */
    --success: oklch(0.65 0.15 145);            /* Green #10b981 */
    --warning: oklch(0.70 0.15 85);             /* Yellow #f59e0b */
    --error: oklch(0.55 0.22 25);               /* Red #ef4444 */
    --info: oklch(0.60 0.18 240);               /* Blue #3b82f6 */

    /* Shadows */
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.5);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.5);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5);
    --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.5);

    /* Border Radius */
    --radius-sm: 0.375rem;   /* 6px */
    --radius-md: 0.5rem;     /* 8px */
    --radius-lg: 0.75rem;    /* 12px */
    --radius-xl: 1rem;       /* 16px */

    /* Spacing Scale (consistent 4px base) */
    --spacing-1: 0.25rem;    /* 4px */
    --spacing-2: 0.5rem;     /* 8px */
    --spacing-3: 0.75rem;    /* 12px */
    --spacing-4: 1rem;       /* 16px */
    --spacing-5: 1.25rem;    /* 20px */
    --spacing-6: 1.5rem;     /* 24px */
    --spacing-8: 2rem;       /* 32px */
    --spacing-10: 2.5rem;    /* 40px */
    --spacing-12: 3rem;      /* 48px */
    --spacing-16: 4rem;      /* 64px */
  }

  /* Light Mode (if needed) */
  .light {
    --background: oklch(0.98 0 0);              /* Off-white */
    --surface: oklch(1 0 0);                    /* Pure white */
    --surface-elevated: oklch(0.96 0 0);        /* Slightly darker */

    --foreground: oklch(0.15 0 0);              /* Near black */
    --foreground-muted: oklch(0.45 0 0);        /* Gray-600 */
    --foreground-subtle: oklch(0.65 0 0);       /* Gray-400 */

    --border: oklch(0.85 0 0);                  /* Light gray */
    --border-strong: oklch(0.70 0 0);
    --border-subtle: oklch(0.92 0 0);

    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  }
}
```

### Typography Scale

```css
@layer base {
  /* Font Family */
  :root {
    --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
    --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  }

  /* Typography Scale */
  body {
    font-family: var(--font-sans);
    font-size: 16px;
    line-height: 1.5;
    color: hsl(var(--foreground));
    background-color: hsl(var(--background));
  }

  /* Headings */
  h1 {
    font-size: 2.5rem;      /* 40px */
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }

  h2 {
    font-size: 2rem;        /* 32px */
    font-weight: 600;
    line-height: 1.3;
    letter-spacing: -0.01em;
  }

  h3 {
    font-size: 1.5rem;      /* 24px */
    font-weight: 600;
    line-height: 1.4;
  }

  h4 {
    font-size: 1.25rem;     /* 20px */
    font-weight: 600;
    line-height: 1.5;
  }

  /* Body Text */
  .text-lg {
    font-size: 1.125rem;    /* 18px */
    line-height: 1.75;
  }

  .text-base {
    font-size: 1rem;        /* 16px */
    line-height: 1.5;
  }

  .text-sm {
    font-size: 0.875rem;    /* 14px */
    line-height: 1.5;
  }

  .text-xs {
    font-size: 0.75rem;     /* 12px */
    line-height: 1.5;
  }
}
```

---

## 4. Implementation Steps

### Step 1: Document Current Design Tokens

**Audit Existing Styles**:

```bash
# Find all color usages
grep -r "bg-gray\|text-gray\|border-gray" app/ components/ --include="*.tsx"

# Find all custom colors
grep -r "oklch\|hsl\|rgb" app/globals.css

# Find component variants
grep -r "variant=" components/ui/ --include="*.tsx"
```

**Create Comparison**:

```markdown
# Current State

## Chat UI
- Background: bg-gray-900 (#111827)
- Cards: bg-gray-800 (#1f2937)
- Text: text-white
- Borders: border-gray-700
- Buttons: bg-blue-600

## Dashboard UI
- Background: bg-gray-50 (#f9fafb)
- Cards: bg-white
- Text: text-gray-900
- Borders: border-gray-200
- Buttons: bg-blue-600 (same)

## Goal: Standardize on Chat UI Dark Theme
```

### Step 2: Update Global Styles

File: `app/globals.css`

Replace entire color system with the design system defined above.

```bash
# Backup current file
cp app/globals.css app/globals.css.backup

# Update with new design system
```

### Step 3: Update Component Primitives

#### Button Component

File: `components/ui/button.tsx`

```tsx
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  // Base styles - consistent for all variants
  'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-brand-primary text-white hover:opacity-90 active:opacity-80',
        secondary: 'bg-surface-elevated text-foreground hover:bg-interactive-hover',
        outline: 'border border-border bg-transparent hover:bg-interactive-hover',
        ghost: 'hover:bg-interactive-hover',
        destructive: 'bg-error text-white hover:opacity-90',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',    // Default: 40px height
        lg: 'h-12 px-6 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}
```

#### Card Component

File: `components/ui/card.tsx`

```tsx
const cardVariants = cva(
  'rounded-lg border transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-surface border-border',
        elevated: 'bg-surface-elevated border-border shadow-md',
        outlined: 'bg-transparent border-border-strong',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export function Card({ className, variant, ...props }: CardProps) {
  return (
    <div className={cn(cardVariants({ variant, className }))} {...props} />
  )
}

export function CardHeader({ className, ...props }: CardHeaderProps) {
  return (
    <div className={cn('p-6 space-y-1.5', className)} {...props} />
  )
}

export function CardContent({ className, ...props }: CardContentProps) {
  return (
    <div className={cn('p-6 pt-0', className)} {...props} />
  )
}

export function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <h3 className={cn('text-2xl font-semibold text-foreground', className)} {...props} />
  )
}

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <p className={cn('text-sm text-foreground-muted', className)} {...props} />
  )
}
```

#### Input Component

File: `components/ui/input.tsx`

```tsx
const inputVariants = cva(
  'flex w-full rounded-md border bg-surface px-3 py-2 text-base text-foreground placeholder:text-foreground-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-border hover:border-border-strong',
        error: 'border-error focus-visible:ring-error',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  'aria-invalid'?: boolean
}

export function Input({ className, variant, 'aria-invalid': ariaInvalid, ...props }: InputProps) {
  return (
    <input
      className={cn(
        inputVariants({ variant: ariaInvalid ? 'error' : variant, className })
      )}
      aria-invalid={ariaInvalid}
      {...props}
    />
  )
}
```

### Step 4: Create Design System Documentation

File: `docs/DESIGN_SYSTEM.md`

```markdown
# JetVision Design System

## Overview

The JetVision design system is built around a modern, dark-first aesthetic that emphasizes our AI-powered conversational interface.

## Principles

1. **Dark First**: Dark mode is the primary theme, optimized for extended use
2. **Conversational**: Design supports natural language interaction
3. **Professional**: Clean, modern aesthetic for enterprise users
4. **Accessible**: WCAG AA compliant, keyboard navigable
5. **Consistent**: Single design language across all interfaces

## Color System

### Color Palette

All colors use the OKLCH color space for perceptual uniformity.

#### Brand Colors

- **Primary**: `var(--brand-primary)` - Purple-blue for primary actions
- **Secondary**: `var(--brand-secondary)` - Sky blue for secondary elements
- **Accent**: `var(--brand-accent)` - Teal for highlights

#### Backgrounds

- **Background**: `var(--background)` - Main app background (#1a1a1a)
- **Surface**: `var(--surface)` - Card backgrounds (#242424)
- **Surface Elevated**: `var(--surface-elevated)` - Elevated cards (#2d2d2d)

#### Text

- **Foreground**: `var(--foreground)` - Primary text (white)
- **Foreground Muted**: `var(--foreground-muted)` - Secondary text
- **Foreground Subtle**: `var(--foreground-subtle)` - Tertiary text

#### Usage Examples

```tsx
// Button with primary brand color
<Button variant="primary">Submit</Button>

// Card with elevated surface
<Card variant="elevated">
  <CardTitle>Title</CardTitle>
  <CardContent>Content</CardContent>
</Card>

// Text hierarchy
<h1 className="text-foreground">Heading</h1>
<p className="text-foreground-muted">Description</p>
<span className="text-foreground-subtle">Metadata</span>
```

## Typography

### Font Family

- **Sans Serif**: Inter (fallback: system-ui)
- **Monospace**: JetBrains Mono (fallback: Fira Code)

### Type Scale

| Element | Size | Weight | Usage |
|---------|------|--------|-------|
| h1 | 40px | 700 | Page titles |
| h2 | 32px | 600 | Section headings |
| h3 | 24px | 600 | Card titles |
| h4 | 20px | 600 | Subsection headings |
| body-lg | 18px | 400 | Large body text |
| body | 16px | 400 | Default body text |
| body-sm | 14px | 400 | Small text |
| caption | 12px | 400 | Captions, labels |

### Usage

```tsx
<h1>Main Page Title</h1>
<h2>Section Heading</h2>
<p className="text-lg">Large body text</p>
<p>Regular body text</p>
<span className="text-sm">Small text</span>
```

## Spacing

4px base unit, multiplicative scale:

| Token | Value | Usage |
|-------|-------|-------|
| spacing-1 | 4px | Tight spacing |
| spacing-2 | 8px | Small gaps |
| spacing-3 | 12px | Default inline spacing |
| spacing-4 | 16px | Default block spacing |
| spacing-6 | 24px | Section spacing |
| spacing-8 | 32px | Large section spacing |
| spacing-12 | 48px | Extra large spacing |

## Components

### Button

**Variants**:
- `primary` - Main actions (brand primary color)
- `secondary` - Secondary actions (surface elevated)
- `outline` - Tertiary actions (transparent with border)
- `ghost` - Subtle actions (transparent, hover only)
- `destructive` - Destructive actions (error color)

**Sizes**:
- `sm` - 32px height (compact)
- `md` - 40px height (default)
- `lg` - 48px height (prominent)
- `icon` - 40x40px (icon only)

```tsx
<Button variant="primary" size="md">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="outline" size="sm">Tertiary</Button>
```

### Card

**Variants**:
- `default` - Standard card (surface background)
- `elevated` - Elevated card (surface elevated + shadow)
- `outlined` - Outlined card (transparent + strong border)

```tsx
<Card variant="elevated">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
</Card>
```

### Input

**Variants**:
- `default` - Standard input
- `error` - Error state (red border + ring)

```tsx
<Input
  type="text"
  placeholder="Enter value"
  aria-label="Field name"
/>

<Input
  type="email"
  variant="error"
  aria-invalid="true"
  aria-describedby="email-error"
/>
```

## Accessibility

All components meet WCAG AA standards:

- **Color Contrast**: 4.5:1 minimum for normal text, 3:1 for large text
- **Focus Indicators**: 2px ring with brand primary color
- **Touch Targets**: Minimum 44x44px for interactive elements
- **ARIA Labels**: All interactive elements properly labeled
- **Keyboard Navigation**: All features accessible via keyboard

## Dark/Light Mode

While dark mode is primary, light mode is supported via `.light` class on root element.

```tsx
// Toggle theme
<button onClick={() => document.documentElement.classList.toggle('light')}>
  Toggle Theme
</button>
```

## Animation

Subtle, performant animations:

- **Transitions**: 150ms for color changes, 200ms for transforms
- **Easing**: `ease-in-out` for most transitions
- **Reduced Motion**: Respect `prefers-reduced-motion`

```css
.element {
  transition: colors 150ms ease-in-out;
}

@media (prefers-reduced-motion: reduce) {
  .element {
    transition: none;
  }
}
```

## Resources

- Figma Design File: [Link TBD]
- Component Storybook: [Link TBD]
- Color Palette Tool: https://oklch.com/
```

### Step 5: Update All Pages to Use Design System

**If keeping dashboard** (TASK-041 Option B):

File: `app/dashboard/page.tsx` (or `app/advanced/page.tsx`)

```tsx
// BEFORE: Light theme
<div className="min-h-screen bg-gray-50">
  <header className="bg-white border-b border-gray-200">

// AFTER: Dark theme with design tokens
<div className="min-h-screen bg-background">
  <header className="bg-surface border-b border-border">
```

Update all instances:
- `bg-white` → `bg-surface`
- `bg-gray-50` → `bg-background`
- `bg-gray-100` → `bg-surface-elevated`
- `text-gray-900` → `text-foreground`
- `text-gray-600` → `text-foreground-muted`
- `text-gray-500` → `text-foreground-subtle`
- `border-gray-200` → `border-border`

**Script to help**:

```bash
# Find and replace common patterns
find app/ components/ -type f -name "*.tsx" -exec sed -i '' \
  -e 's/bg-white/bg-surface/g' \
  -e 's/bg-gray-50/bg-background/g' \
  -e 's/bg-gray-100/bg-surface-elevated/g' \
  -e 's/text-gray-900/text-foreground/g' \
  -e 's/text-gray-600/text-foreground-muted/g' \
  -e 's/border-gray-200/border-border/g' \
  {} +
```

### Step 6: Visual Regression Testing

**Install Playwright for visual testing**:

```bash
npm install -D @playwright/test
```

**Create visual regression tests**:

```typescript
// __tests__/visual/design-system.spec.ts

import { test, expect } from '@playwright/test'

test.describe('Design System Visual Regression', () => {
  test('chat interface matches design', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveScreenshot('chat-interface.png')
  })

  test('workflow visualization matches design', async ({ page }) => {
    await page.goto('/')
    await page.click('text=View Workflow')
    await expect(page).toHaveScreenshot('workflow-view.png')
  })

  test('buttons render consistently', async ({ page }) => {
    await page.goto('/design-system-showcase')

    const variants = ['primary', 'secondary', 'outline', 'ghost', 'destructive']
    for (const variant of variants) {
      await expect(page.locator(`[data-variant="${variant}"]`)).toHaveScreenshot(`button-${variant}.png`)
    }
  })
})
```

---

## 5. Testing Requirements

### Unit Tests

```typescript
// __tests__/unit/design-system/colors.test.ts

describe('Design System Colors', () => {
  it('defines all required color tokens', () => {
    const root = document.documentElement
    const styles = getComputedStyle(root)

    const requiredTokens = [
      '--brand-primary',
      '--background',
      '--surface',
      '--foreground',
      '--border',
    ]

    requiredTokens.forEach((token) => {
      expect(styles.getPropertyValue(token)).toBeTruthy()
    })
  })

  it('maintains WCAG AA contrast ratios', () => {
    // Test that text/background combinations meet 4.5:1 ratio
  })
})
```

### Integration Tests

```typescript
// __tests__/integration/design-system/consistency.test.ts

describe('Design System Consistency', () => {
  it('all buttons use consistent heights', () => {
    render(<ButtonShowcase />)

    const buttons = screen.getAllByRole('button')
    const heights = buttons.map((btn) => getComputedStyle(btn).height)

    // All medium buttons should be 40px
    const mediumButtons = heights.filter((h) => h === '40px')
    expect(mediumButtons.length).toBeGreaterThan(0)
  })

  it('all cards use consistent border radius', () => {
    render(<CardShowcase />)

    const cards = screen.getAllByTestId('card')
    const radii = cards.map((card) => getComputedStyle(card).borderRadius)

    // All cards should use same radius
    const uniqueRadii = [...new Set(radii)]
    expect(uniqueRadii.length).toBe(1)
  })
})
```

### Visual Tests

Use Percy or Chromatic for visual regression testing:

```bash
npm install -D @percy/cli @percy/playwright
```

```typescript
// __tests__/visual/pages.spec.ts

import percySnapshot from '@percy/playwright'

test('chat page visual regression', async ({ page }) => {
  await page.goto('/')
  await percySnapshot(page, 'Chat Interface')
})

test('workflow page visual regression', async ({ page }) => {
  await page.goto('/workflow')
  await percySnapshot(page, 'Workflow Visualization')
})
```

---

## 6. Files to Update

### Create

```
docs/DESIGN_SYSTEM.md                   # Complete design system documentation
components/design-system-showcase.tsx   # Component showcase page
__tests__/visual/design-system.spec.ts # Visual regression tests
__tests__/unit/design-system/*.test.ts # Design token tests
```

### Modify

```
app/globals.css:1-127                   # Complete rewrite with design tokens
components/ui/button.tsx:1-50           # Unified button variants
components/ui/card.tsx:1-80             # Unified card variants
components/ui/input.tsx:1-40            # Unified input styles
components/ui/label.tsx:1-20            # Update text colors
app/dashboard/page.tsx:1-283            # Update to dark theme (if kept)
app/page.tsx:1-179                      # Verify consistency
components/chat-interface.tsx:1-386     # Verify consistency
components/workflow-visualization.tsx   # Verify consistency
tailwind.config.ts                      # Update theme configuration
```

### Review for Consistency

```bash
# All component files
components/**/*.tsx

# All page files
app/**/*.tsx

# All UI primitives
components/ui/*.tsx
```

---

## 7. Definition of Done

- [ ] Design system documented in `docs/DESIGN_SYSTEM.md`
- [ ] All color tokens defined in `globals.css`
- [ ] Typography scale implemented
- [ ] Spacing system consistent (4px base)
- [ ] All buttons use unified heights (40px default)
- [ ] All cards use unified styling
- [ ] All inputs use unified styling
- [ ] Dashboard matches chat aesthetic (if kept)
- [ ] No visual inconsistencies between pages
- [ ] WCAG AA compliance maintained
- [ ] Visual regression tests passing
- [ ] Unit tests passing
- [ ] Build succeeds with no errors
- [ ] Code review approved
- [ ] Design review approved

---

## 8. Git Workflow

```bash
git checkout main
git pull origin main
git checkout -b feat/task-044-unify-design-language

# Commit each major change
git commit -m "docs: create comprehensive design system documentation"
git commit -m "feat(design): implement unified color token system"
git commit -m "feat(design): update button component with consistent variants"
git commit -m "feat(design): update card component with unified styling"
git commit -m "feat(design): update input component with design tokens"
git commit -m "feat(design): migrate dashboard to dark theme (if applicable)"
git commit -m "test: add visual regression tests for design system"

git push -u origin feat/task-044-unify-design-language
```

---

## 9. Dependencies

**Requires TASK-041 Decision**:
- If Option A (remove dashboard): Much simpler, just verify chat UI consistency
- If Option B (keep dashboard): Must migrate entire dashboard to dark theme

**Blocked By**:
- None (can proceed independently)

**Blocks**:
- All future UI development (should use design system)
- TASK-040 (accessibility) - easier with consistent design system

---

## 10. Notes & Questions

### Implementation Notes

**Current Inconsistency**:
- Chat UI uses modern dark theme (intentional, well-designed)
- Dashboard uses traditional light theme (generic, SaaS-style)
- Feels like two different products when switching

**Recommendation**: Adopt chat-first dark theme because:
1. Modern, AI-focused aesthetic aligns with product vision
2. Professional tech product feel (vs generic corporate)
3. Chat is the primary interface per PRD
4. Dark theme better for extended use

### Open Questions

- [ ] **Theme Toggle**: Should we support light mode toggle?
  - Recommendation: Yes, but dark is default
- [ ] **Accessibility**: Does dark theme maintain WCAG AA?
  - Answer: Yes, if foreground color is light enough (addressed in TASK-039)
- [ ] **Brand Assets**: Do we have official brand colors?
  - Current: Using purple-blue, can adjust to match brand
- [ ] **Typography**: Is Inter the approved font?
  - Current: Inter is excellent choice, widely used for UI

### Assumptions

- Chat UI dark theme represents desired aesthetic
- Consistency is more important than individual preferences
- Users prefer modern, AI-focused design vs generic SaaS
- Dark theme is acceptable for enterprise users

### Risks/Blockers

**Risk**: Users prefer light theme
- **Severity**: Low
- **Mitigation**: Support theme toggle, default to dark

**Risk**: Dark theme accessibility issues
- **Severity**: Medium
- **Mitigation**: Ensure WCAG AA compliance (covered in TASK-039)

**Risk**: Inconsistent with existing brand guidelines
- **Severity**: High
- **Mitigation**: Get design approval before implementation

**Risk**: Large migration effort if keeping dashboard
- **Severity**: Medium
- **Mitigation**: Use find/replace scripts, systematic approach

---

## 11. Design Review Checklist

Before starting implementation, get approval on:

- [ ] Dark theme as primary aesthetic
- [ ] Color palette (brand colors)
- [ ] Typography choices (Inter font)
- [ ] Component styling direction
- [ ] Overall visual direction

**Reviewers**: UX Designer, Product Owner, Frontend Lead

---

**Task Status**: 🟡 HIGH PRIORITY - DESIGN QUALITY
**Source**: Frontend UX/UI Analysis - Design Consistency Assessment
**Impact**: Affects entire application visual experience
**Linear Issue**: DES-126
**Dependencies**: TASK-041 (determines scope - dashboard or chat only)
**Last Updated**: October 22, 2025
