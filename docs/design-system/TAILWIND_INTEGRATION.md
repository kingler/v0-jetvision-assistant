# Tailwind CSS Integration Guide

This guide documents how the Jetvision Design System integrates with Tailwind CSS for consistent, type-safe styling.

## Overview

The design system tokens (`lib/design-system/tokens.ts`) are exposed to Tailwind CSS through:

1. **tailwind.config.ts** - Extends Tailwind theme with design tokens
2. **globals.css** - CSS variables for runtime theming (dark mode)
3. **tailwind-helpers.ts** - Utility functions for generating class names

## Available Tailwind Classes

### Brand Colors

```css
/* Aviation Blue (Primary) */
bg-aviation-blue-50  to bg-aviation-blue-900
text-aviation-blue-50 to text-aviation-blue-900
border-aviation-blue-50 to border-aviation-blue-900

/* Sky Blue (Secondary) */
bg-sky-blue-50 to bg-sky-blue-900
text-sky-blue-50 to text-sky-blue-900
border-sky-blue-50 to border-sky-blue-900

/* Sunset Orange (Accent) */
bg-sunset-orange-50 to bg-sunset-orange-900
text-sunset-orange-50 to text-sunset-orange-900
border-sunset-orange-50 to border-sunset-orange-900

/* Neutral */
bg-neutral-50 to bg-neutral-900
text-neutral-50 to text-neutral-900
border-neutral-50 to border-neutral-900
```

### Semantic Colors

```css
/* Success */
bg-success      /* Default green */
bg-success-bg   /* Light background */
bg-success-bg-dark
text-success
border-success-border

/* Warning */
bg-warning
bg-warning-bg
text-warning
border-warning-border

/* Error */
bg-error
bg-error-bg
text-error
border-error-border

/* Info */
bg-info
bg-info-bg
text-info
border-info-border
```

### CSS Variable Colors

These respond to dark mode automatically:

```css
bg-primary          /* Aviation Blue */
bg-secondary        /* Sky Blue */
bg-accent           /* Sunset Orange */
bg-destructive      /* Error red */
bg-muted            /* Muted surface */
bg-background       /* Page background */
bg-foreground       /* Text color */
```

### Shadows

```css
shadow-xs
shadow-sm
shadow-md
shadow-lg
shadow-xl
shadow-2xl
shadow-inner
shadow-primary     /* Blue glow */
shadow-accent      /* Orange glow */
```

### Z-Index Layers

```css
z-base             /* 0 */
z-dropdown         /* 1000 */
z-sticky           /* 1100 */
z-fixed            /* 1200 */
z-modal-backdrop   /* 1300 */
z-modal            /* 1400 */
z-popover          /* 1500 */
z-tooltip          /* 1600 */
z-notification     /* 1700 */
```

## Helper Functions

Import from `@/lib/design-system`:

```typescript
import {
  cn,
  getColorClass,
  getSemanticColorClass,
  getSpacingClass,
  getTypographyClasses,
  getShadowClass,
  getRadiusClass,
  getZIndexClass,
  buttonClasses,
} from '@/lib/design-system';
```

### cn() - Class Name Utility

Merges class names with conflict resolution:

```typescript
cn('p-4', 'bg-red-500')           // 'p-4 bg-red-500'
cn('p-2', 'p-4')                  // 'p-4' (last wins)
cn('btn', isActive && 'active')  // conditional classes
```

### getColorClass()

Generate brand color classes:

```typescript
getColorClass('aviationBlue', 500, 'bg')     // 'bg-aviation-blue-500'
getColorClass('skyBlue', 300, 'text')        // 'text-sky-blue-300'
getColorClass('sunsetOrange', 600, 'border') // 'border-sunset-orange-600'
```

### getSemanticColorClass()

Generate semantic color classes:

```typescript
getSemanticColorClass('success', 'bg')           // 'bg-success'
getSemanticColorClass('error', 'text')           // 'text-error'
getSemanticColorClass('warning', 'bg', 'light')  // 'bg-warning-bg'
getSemanticColorClass('info', 'bg', 'dark')      // 'bg-info-bg-dark'
```

### getTypographyClasses()

Get combined typography classes:

```typescript
getTypographyClasses('h1')                      // 'text-4xl font-bold leading-tight'
getTypographyClasses('body', 'semibold')        // 'text-base font-semibold leading-normal'
getTypographyClasses('body', 'medium', 'loose') // 'text-base font-medium leading-loose'
```

### buttonClasses()

Generate button class combinations:

```typescript
buttonClasses({ variant: 'primary', size: 'md' })
buttonClasses({ variant: 'accent', size: 'lg' })
buttonClasses({ variant: 'outline', size: 'sm' })
```

## Component Variants

### Button Variants

```tsx
<Button variant="default">Aviation Blue</Button>
<Button variant="secondary">Sky Blue</Button>
<Button variant="accent">Sunset Orange</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
<Button variant="success">Success</Button>
<Button variant="warning">Warning</Button>
```

### Button Sizes

```tsx
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>
<Button size="icon">Icon Only</Button>
```

### Badge Variants

```tsx
<Badge variant="default">Primary</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="accent">Accent</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="info">Info</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>
```

### Input Sizes

```tsx
<Input size="sm" placeholder="Small" />
<Input size="default" placeholder="Default" />
<Input size="lg" placeholder="Large" />
```

### Progress Variants

```tsx
<Progress variant="default" value={50} />
<Progress variant="secondary" value={50} />
<Progress variant="success" value={100} />
<Progress variant="warning" value={75} />
<Progress variant="destructive" value={25} />
```

## Dark Mode

Dark mode is handled via CSS variables in `globals.css`:

```tsx
// Toggle dark mode by adding/removing 'dark' class on html element
document.documentElement.classList.toggle('dark');
```

All CSS variable-based colors automatically adjust for dark mode:

- `bg-primary` becomes lighter Aviation Blue
- `bg-secondary` becomes lighter Sky Blue
- `bg-accent` becomes brighter Sunset Orange
- Backgrounds invert to dark surfaces

## Best Practices

### 1. Use Semantic Classes

Prefer CSS variable colors for theme-aware styling:

```tsx
// Good - responds to dark mode
<div className="bg-primary text-primary-foreground">

// Avoid - won't respond to dark mode
<div className="bg-aviation-blue-500 text-white">
```

### 2. Use Helper Functions for Dynamic Styling

```typescript
// Good - type-safe and consistent
const colorClass = getColorClass('aviationBlue', shade, 'bg');

// Avoid - error-prone string interpolation
const colorClass = `bg-aviation-blue-${shade}`;
```

### 3. Use cn() for Class Merging

```tsx
// Good - handles conflicts properly
<div className={cn('p-4', className)}>

// Avoid - may have duplicate/conflicting classes
<div className={`p-4 ${className}`}>
```

### 4. Component Variants Over Custom Classes

```tsx
// Good - uses design system variants
<Button variant="accent" size="lg">

// Avoid - custom one-off styling
<Button className="bg-orange-500 h-12 px-8">
```

## File Structure

```text
lib/design-system/
├── index.ts              # Main exports
├── tokens.ts             # Design tokens (600+ values)
├── utils.ts              # Style utility functions
├── tailwind-theme.ts     # Tailwind theme generator
└── tailwind-helpers.ts   # Class name helpers

app/
└── globals.css           # CSS variables for theming

tailwind.config.ts        # Tailwind configuration
```

## Testing

Run design system tests:

```bash
npm run test:unit -- --run __tests__/unit/lib/design-system/
```

Current test coverage: 44 tests across 3 test files:

- `tailwind-theme.test.ts` - Theme generation (13 tests)
- `css-integration.test.ts` - CSS integration (14 tests)
- `tailwind-helpers.test.ts` - Helper utilities (17 tests)
