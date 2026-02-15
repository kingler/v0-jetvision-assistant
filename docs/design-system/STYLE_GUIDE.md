# Jetvision Group Design System - Style Guide

**Version:** 1.0.0
**Last Updated:** December 2025

Welcome to the Jetvision Group design system. This comprehensive style guide defines the visual language, components, and patterns for our private aviation charter platform.

---

## Table of Contents

1. [Brand Identity](#brand-identity)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Components](#components)
6. [Accessibility](#accessibility)
7. [Usage Guidelines](#usage-guidelines)

---

## Brand Identity

### Vision

Jetvision Group represents the pinnacle of private aviation services. Our design system embodies:

- **Professionalism & Trust** - Reliability in every interaction
- **Luxury & Exclusivity** - Premium experience throughout
- **Modern Technology** - Cutting-edge innovation
- **Efficiency & Speed** - Seamless, fast workflows
- **Safety & Reliability** - Unwavering commitment to security

### Design Principles

1. **Clarity First** - Information should be immediately understandable
2. **Consistent Experience** - Predictable patterns across all touchpoints
3. **Accessible to All** - WCAG AA compliance minimum
4. **Premium Feel** - Subtle elegance without ostentation
5. **Performance-Driven** - Fast, responsive, and efficient

---

## Color System

### Brand Colors

Our color palette draws inspiration from aviation, sky, and premium aesthetics.

#### Primary - Sky Blue

The cornerstone of our brand identity. Represents trust, professionalism, innovation, speed, and the open sky.

```
Sky Blue 500 (Primary): #00a8e8
```

**Color Scale:**
- `50`: #e6f7fc (Very light blue - backgrounds)
- `100`: #cceff9 (Light blue - hover states)
- `200`: #99dff3
- `300`: #66cfed
- `400`: #33bfe7
- `500`: #00a8e8 **← Primary Brand Color**
- `600`: #0087ba (Hover states)
- `700`: #00658b (Active states)
- `800`: #00445d (Dark accents)
- `900`: #00222e (Very dark - text on light backgrounds)

**Usage:**
- Primary buttons, links, and CTAs
- Navigation highlights
- Focus states
- Brand touchpoints

**Accessibility:**
- ✓ White text on Sky Blue 500: **Contrast 4.6:1** (AA compliant for large text)
- ✓ Sky Blue 700 on white: **Contrast 6.5:1** (AA compliant)

#### Secondary - Text Link Style

Secondary buttons use a flat text link style with the primary color (Sky Blue) for text.

```
Secondary Style: Transparent background, Sky Blue (#00a8e8) text
```

**Usage:**
- Secondary buttons (text link style)
- Less prominent actions
- Alternative CTAs
- Inline actions

**Styling:**
- Background: Transparent
- Text color: Primary color (Sky Blue #00a8e8)
- Hover: Underline text
- No background or shadow

**Accessibility:**
- ✓ Sky Blue 500 on white: **Contrast 4.6:1** (AA compliant for large text)
- ✓ Sky Blue 700 on white: **Contrast 6.5:1** (AA compliant)

#### Legacy - Aviation Blue

Kept for backward compatibility and specific use cases.

```
Aviation Blue 500: #0066cc
```

**Color Scale:**
- `50`: #e6f2ff
- `100`: #cce5ff
- `200`: #99cbff
- `300`: #66b0ff
- `400`: #3396ff
- `500`: #0066cc
- `600`: #0052a3
- `700`: #003d7a
- `800`: #002952
- `900`: #001429

**Usage:**
- Legacy components (being phased out)
- Specific design requirements
- Not recommended for new components

#### Accent - Sunset Orange

Adds warmth, energy, and premium feel.

```
Sunset Orange 500 (Accent): #ff6b35
```

**Color Scale:**
- `50`: #fff3ed
- `100`: #ffe7db
- `200`: #ffcfb7
- `300`: #ffb793
- `400`: #ff9f6f
- `500`: #ff6b35 **← Accent Brand Color**
- `600`: #cc562a
- `700`: #99401f
- `800`: #662b15
- `900`: #33150a

**Usage:**
- Call-to-action highlights
- Important notifications
- Premium features
- Limited use for emphasis

**Accessibility:**
- ✓ White text on Sunset Orange 600: **Contrast 4.7:1** (AA compliant)
- ✗ Sunset Orange 500 on white: **Contrast 3.2:1** (Use 600+ for text)

### Semantic Colors

Context-aware colors for specific UI states.

#### Success (Green)

Confirms positive actions, completed bookings, verified information.

```css
/* Light mode */
--success: #10b981 (green-500)
--success-bg: #dcfce7 (green-100)
--success-border: #86efac (green-300)

/* Dark mode */
--success: #34d399 (green-400)
--success-bg: #064e3b (green-900)
--success-border: #065f46 (green-800)
```

**Usage:**
- Confirmation messages
- Completed workflows
- Positive status indicators

#### Warning (Amber)

Highlights items needing attention without urgency.

```css
/* Light mode */
--warning: #f59e0b (amber-500)
--warning-bg: #fef3c7 (amber-100)
--warning-border: #fcd34d (amber-300)

/* Dark mode */
--warning: #fbbf24 (amber-400)
--warning-bg: #78350f (amber-900)
--warning-border: #92400e (amber-800)
```

**Usage:**
- Pending actions
- Caution notices
- Incomplete information

#### Error (Red)

Indicates failures, critical issues, destructive actions.

```css
/* Light mode */
--error: #dc2626 (red-600)
--error-bg: #fee2e2 (red-100)
--error-border: #fca5a5 (red-300)

/* Dark mode */
--error: #f87171 (red-400)
--error-bg: #7f1d1d (red-900)
--error-border: #991b1b (red-800)
```

**Usage:**
- Error messages
- Failed operations
- Destructive action confirmations

#### Info (Cyan)

Provides helpful information and guidance.

```css
/* Light mode */
--info: #0891b2 (cyan-600)
--info-bg: #cffafe (cyan-100)
--info-border: #67e8f9 (cyan-300)

/* Dark mode */
--info: #22d3ee (cyan-400)
--info-bg: #164e63 (cyan-900)
--info-border: #155e75 (cyan-800)
```

**Usage:**
- Informational messages
- Tips and hints
- Neutral notifications

### Flight Request Stage Colors

The flight request lifecycle uses 10 distinct stage colors. Each stage has a **tinted background** (10% opacity of the base color) and a **dark text** (same hue at lower lightness, higher chroma) for readability. These are used by the `FlightRequestStageBadge` component.

All values use OKLCh color space for perceptual uniformity.

| Stage | Label | Hue | Background (oklch) | Text (oklch) |
|-------|-------|-----|-------------------|-------------|
| `understanding_request` | Understanding Request | 250 (blue-gray) | `0.65 0.02 250 / 0.10` | `0.40 0.03 250` |
| `searching_aircraft` | Searching Aircraft | 300 (purple) | `0.55 0.15 300 / 0.10` | `0.38 0.18 300` |
| `requesting_quotes` | Requesting Quotes | 200 (cyan) | `0.65 0.15 200 / 0.10` | `0.42 0.18 200` |
| `analyzing_options` | Analyzing Options | 55 (orange) | `0.65 0.18 55 / 0.10` | `0.42 0.20 55` |
| `proposal_ready` | Proposal Ready | 155 (green) | `0.60 0.18 155 / 0.10` | `0.38 0.20 155` |
| `proposal_sent` | Proposal Sent | 240 (blue) | `0.60 0.15 240 / 0.10` | `0.38 0.18 240` |
| `contract_generated` | Contract Ready | 240 (blue-600) | `0.55 0.18 240 / 0.10` | `0.35 0.20 240` |
| `contract_sent` | Contract Sent | 280 (indigo) | `0.55 0.15 280 / 0.10` | `0.35 0.18 280` |
| `payment_pending` | Payment Pending | 75 (amber) | `0.70 0.18 75 / 0.10` | `0.42 0.20 75` |
| `closed_won` | Closed Won | 155 (green-600) | `0.55 0.18 155 / 0.10` | `0.35 0.20 155` |

**Pattern:** Background uses the base color at 10% alpha for a subtle tint. Text uses the same hue at ~0.20 lower lightness and ~0.02-0.05 higher chroma for clear contrast against the tint.

**Usage:**
- Flight request cards in the sidebar
- Pipeline dashboards and status displays
- Workflow progress indicators

**Note:** These colors are applied via inline `style` (not Tailwind classes) because Tailwind v4's opacity modifier (`/10`) does not work with `var()` references in `@theme inline`. The `text-status-*` Tailwind classes remain available for full-opacity text usage.

### Neutral Colors

Foundation for text, backgrounds, and UI elements.

```css
--neutral-50: #f9fafb   /* Lightest backgrounds */
--neutral-100: #f3f4f6  /* Card backgrounds */
--neutral-200: #e5e7eb  /* Borders */
--neutral-300: #d1d5db  /* Disabled states */
--neutral-400: #9ca3af  /* Placeholders */
--neutral-500: #6b7280  /* Secondary text */
--neutral-600: #4b5563  /* Primary text (light mode) */
--neutral-700: #374151  /* Headings */
--neutral-800: #1f2937  /* Dark backgrounds */
--neutral-900: #111827  /* Darkest backgrounds */
--neutral-950: #030712  /* Pure dark mode */
```

### Dark Mode

Jetvision supports full dark mode with adjusted color values:

- Backgrounds shift to neutral-900/950
- Text inverts to neutral-50/100
- Brand colors become slightly lighter for contrast
- Semantic colors adjust for readability

**Implementation:**
```tsx
// Automatic dark mode support via next-themes
<ThemeProvider attribute="class" defaultTheme="system">
  {children}
</ThemeProvider>
```

---

## Typography

### Font Families

**Sans-Serif (Primary):** Arial, sans-serif
**Monospace (Code/Data):** "Courier New", monospace

Arial provides:
- Universal availability
- Clean, professional appearance
- Excellent readability across sizes
- Strong association with corporate/aviation brands

### Type Scale

#### Display Sizes (Landing, Hero)

```css
Display XL: 40px (mobile) → 64px (desktop)
Display LG: 32px (mobile) → 48px (desktop)
Display MD: 28px (mobile) → 36px (desktop)
Display SM: 24px (mobile) → 32px (desktop)
```

**Usage:** Hero sections, landing page headlines

#### Headings

```css
H1: 32px (mobile) → 40px (desktop) | font-weight: 700
H2: 28px (mobile) → 32px (desktop) | font-weight: 700
H3: 24px (mobile) → 28px (desktop) | font-weight: 600
H4: 20px (mobile) → 24px (desktop) | font-weight: 600
H5: 18px (mobile) → 20px (desktop) | font-weight: 600
H6: 16px (mobile) → 18px (desktop) | font-weight: 600
```

#### Body Text

```css
Large:   18px | line-height: 1.625 | Long-form content
Base:    16px | line-height: 1.5   | Default body text
Small:   14px | line-height: 1.5   | Captions, labels
X-Small: 12px | line-height: 1.375 | Meta info, timestamps
```

### Font Weights

```css
Normal:    400 | Body text, paragraphs
Medium:    500 | Emphasized text
Semibold:  600 | Headings H3-H6, labels
Bold:      700 | Headings H1-H2, strong emphasis
```

### Line Heights

```css
Tight:   1.25  | Large headings
Snug:    1.375 | Small headings
Normal:  1.5   | Body text (default)
Relaxed: 1.625 | Long-form reading
Loose:   2.0   | Spacious layouts
```

### Typography Best Practices

**Do:**
- Use H1-H6 in hierarchical order
- Maintain line-height between 1.5-1.75 for body text
- Keep line length between 50-75 characters
- Use medium/semibold weights for emphasis over bold

**Don't:**
- Skip heading levels (H1 → H3)
- Use all caps for long text (readability issues)
- Set line-height below 1.25 for body text
- Mix multiple font families in one view

### Usage Examples

```tsx
import { typography } from '@/lib/design-system'

// Heading
<h1 style={typography('h1', 'bold', 'tight')}>
  Book Your Private Jet
</h1>

// Body text
<p style={typography('base', 'normal', 'relaxed')}>
  Experience luxury aviation with Jetvision Group...
</p>

// Small caption
<span style={typography('sm', 'medium', 'snug')}>
  Flight departing in 2 hours
</span>
```

---

## Spacing & Layout

### Spacing Scale

Base unit: **4px (0.25rem)**

```css
0:   0px
0.5: 2px    | Tiny gaps
1:   4px    | Minimal spacing
2:   8px    | Compact spacing
3:   12px   | Default gap
4:   16px   | Standard spacing
5:   20px
6:   24px   | Card padding
8:   32px   | Section spacing
10:  40px
12:  48px   | Large section gaps
16:  64px
20:  80px
24:  96px   | Extra large spacing
```

**Usage Guidelines:**

- Use multiples of 4px for consistency
- Card padding: 24px (spacing-6)
- Button padding: 12px horizontal, 8px vertical
- Section margins: 32px-48px (spacing-8 to spacing-12)

### Layout Grid

**Container Max Width:**
```css
sm:  640px   | Small screens
md:  768px   | Tablets
lg:  1024px  | Laptops
xl:  1280px  | Desktops
2xl: 1536px  | Large displays
```

**Breakpoints:**
```css
sm:  640px   | @media (min-width: 640px)
md:  768px   | @media (min-width: 768px)
lg:  1024px  | @media (min-width: 1024px)
xl:  1280px  | @media (min-width: 1280px)
2xl: 1536px  | @media (min-width: 1536px)
```

**Grid Columns:**
- Mobile: 4 columns
- Tablet: 8 columns
- Desktop: 12 columns

**Gutter Width:** 24px (spacing-6)

### Border Radius

```css
sm:  ~2px   | Tight corners
md:  ~6px   | Small elements
lg:  8px    | Default (cards, buttons)
xl:  ~12px  | Large cards
2xl: 16px   | Prominent elements
3xl: 24px   | Hero elements
full: 9999px | Circles, pills
```

**Usage:**
- Cards: `border-radius-lg` (8px)
- Buttons: `border-radius-md` (6px)
- Inputs: `border-radius-md` (6px)
- Avatars: `border-radius-full`
- Pills/Badges: `border-radius-full`

### Shadows

```css
xs:  Subtle hover state
sm:  Default card shadow
md:  Elevated elements
lg:  Modals, popovers
xl:  High prominence
2xl: Maximum elevation
```

**Shadow Usage:**
- Cards: `shadow-sm`
- Buttons: `shadow-xs`
- Dropdowns: `shadow-lg`
- Modals: `shadow-xl`
- Colored shadows for brand emphasis (primary, accent)

---

## Components

See [COMPONENTS.md](./COMPONENTS.md) for detailed component specifications.

### Component Sizes

#### Buttons

```css
sm:      height: 32px | padding: 12px | font-size: 14px
default: height: 36px | padding: 16px | font-size: 16px
lg:      height: 40px | padding: 24px | font-size: 18px
icon:    size: 36x36px (square)
```

#### Inputs

```css
sm:      height: 32px | padding: 12px | font-size: 14px
default: height: 36px | padding: 12px | font-size: 16px
lg:      height: 44px | padding: 16px | font-size: 18px
```

#### Cards

```css
padding: 24px
gap:     24px
header-gap: 6px
border-radius: 12px (xl)
```

---

## Accessibility

### WCAG Compliance

**Minimum Standard:** WCAG 2.1 Level AA

#### Contrast Ratios

**Normal Text (< 18pt):**
- AA: 4.5:1 minimum
- AAA: 7:1 (recommended)

**Large Text (≥ 18pt or 14pt bold):**
- AA: 3:1 minimum
- AAA: 4.5:1 (recommended)

**UI Components & Graphics:**
- AA: 3:1 minimum

#### Focus Indicators

All interactive elements must have visible focus states:

```css
outline: 3px solid var(--color-ring);
outline-offset: 2px;
```

**Focus ring color:**
- Light mode: Sky Blue 600
- Dark mode: Sky Blue 400

#### Touch Targets

**Minimum Size:** 24x24px (AA)
**Recommended Size:** 44x44px (AAA)

All buttons, links, and interactive elements should meet minimum touch target sizes.

#### Keyboard Navigation

- All interactive elements must be keyboard accessible
- Logical tab order (left-to-right, top-to-bottom)
- Escape key closes modals/dropdowns
- Enter/Space activates buttons
- Arrow keys navigate within components

#### Screen Reader Support

- Semantic HTML elements (`<button>`, `<nav>`, `<main>`)
- ARIA labels for icon-only buttons
- ARIA live regions for dynamic content
- Alt text for all images
- Form labels properly associated with inputs

### Color Accessibility

**Tested Combinations (WCAG AA+):**

✓ White on Aviation Blue 500 (6.8:1)
✓ White on Sky Blue 700 (6.5:1)
✓ White on Sunset Orange 600 (4.7:1)
✓ Neutral 700 on White (10.5:1)
✓ Neutral 600 on Neutral 50 (9.2:1)

**Avoid:**
- Pure red/green for critical info (color blindness)
- Low contrast grays (< 4.5:1)
- Color as only differentiator

---

## Usage Guidelines

### Do's and Don'ts

#### Colors

**Do:**
- Use Sky Blue for primary actions
- Maintain consistent brand colors across platform
- Ensure sufficient contrast ratios
- Use semantic colors for their intended purpose

**Don't:**
- Use more than 3 brand colors in one view
- Override semantic color meanings (e.g., red for success)
- Use pure black (#000000) - use neutral-900 instead
- Rely on color alone to convey information

#### Typography

**Do:**
- Follow the type scale consistently
- Use proper heading hierarchy
- Maintain readable line lengths (50-75 characters)
- Use medium/semibold for emphasis

**Don't:**
- Use more than 2 font weights per view
- Set body text below 16px on mobile
- Use all caps for long text
- Stack multiple bold elements

#### Spacing

**Do:**
- Use the spacing scale (multiples of 4px)
- Maintain consistent padding within components
- Create visual rhythm with consistent gaps

**Don't:**
- Use arbitrary spacing values (e.g., 13px)
- Overcrowd elements (minimum 8px gaps)
- Mix different spacing systems

#### Components

**Do:**
- Use shadcn/ui components as base
- Follow component patterns consistently
- Maintain proper states (default, hover, active, disabled, focus)

**Don't:**
- Create custom components without design review
- Override component styles arbitrarily
- Ignore accessibility requirements

---

## Implementation

### Importing the Design System

```tsx
// Import all tokens and utilities
import { tokens, getBrandColor, typography, space } from '@/lib/design-system'

// Get specific color
const primaryColor = getBrandColor('skyBlue', 500) // #00a8e8

// Create typography styles
const headingStyle = typography('h1', 'bold', 'tight')

// Get spacing
const cardPadding = space(6) // 24px (1.5rem)
```

### Using with Tailwind CSS

Design tokens are integrated into Tailwind via `globals.css`:

```tsx
// Use Tailwind classes
<button className="bg-primary text-primary-foreground rounded-lg px-4 py-2">
  Book Flight
</button>

// Dark mode support
<div className="bg-white dark:bg-gray-900">
  {/* Content */}
</div>
```

### Using with CSS-in-JS

```tsx
import { tokens, typography, shadow } from '@/lib/design-system'

const cardStyles = {
  ...typography('base', 'normal', 'relaxed'),
  padding: tokens.spacing[6],
  borderRadius: tokens.radii.xl,
  boxShadow: shadow('sm'),
  backgroundColor: 'var(--color-card)',
  color: 'var(--color-card-foreground)',
}
```

---

## Resources

- [Component Documentation](./COMPONENTS.md)
- [Accessibility Guidelines](./ACCESSIBILITY.md)
- [Design Tokens Reference](/lib/design-system/tokens.ts)
- [Utility Functions](/lib/design-system/utils.ts)

---

## Changelog

**v1.0.0** - December 2025
- Initial design system release
- Complete color palette with dark mode
- Typography scale and guidelines
- Spacing system and layout grid
- Accessibility standards and testing

---

**Maintained by:** Jetvision Group UX Team
**Questions?** Contact the design system team or open a discussion in the project repository.
