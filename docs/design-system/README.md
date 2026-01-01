# Jetvision Group Design System

**Version:** 1.0.0
**Last Updated:** December 2025

Welcome to the Jetvision Group design system—a comprehensive collection of design tokens, components, and guidelines for building consistent, accessible, and beautiful user experiences in our private aviation platform.

---

## Quick Links

- **[Style Guide](./STYLE_GUIDE.md)** - Colors, typography, spacing, and visual design
- **[Components](./COMPONENTS.md)** - Complete component library with examples
- **[Accessibility](./ACCESSIBILITY.md)** - WCAG 2.1 AA compliance guidelines
- **[Design Tokens](../../lib/design-system/tokens.ts)** - All design tokens in TypeScript
- **[Utilities](../../lib/design-system/utils.ts)** - Helper functions for working with tokens

---

## What's Inside

### Design Tokens

Production-ready TypeScript design tokens covering:

- **Colors** - Brand palette (Aviation Blue, Sky Blue, Sunset Orange) + semantic colors
- **Typography** - Font families, sizes, weights, line heights
- **Spacing** - Consistent spacing scale (4px base unit)
- **Shadows** - Elevation system for depth
- **Border Radius** - Rounded corners for modern aesthetic
- **Breakpoints** - Responsive design breakpoints
- **Animations** - Transition durations and easing functions

### Components

Comprehensive component library following Atomic Design methodology:

- **Atoms** - Button, Input, Badge, Avatar, Label
- **Molecules** - Form Field, Search Input, Icon Button, Card Header
- **Organisms** - Navigation Header, Quote Card, Data Table, Modal Dialog
- **Templates** - Dashboard Layout, Auth Layout, Landing Page Layout

All components built with:
- shadcn/ui + Radix UI primitives
- Full TypeScript support
- Dark mode compatibility
- WCAG AA accessibility
- Responsive design

### Documentation

Three comprehensive guides:

1. **Style Guide** - Visual design language, brand identity, usage guidelines
2. **Component Library** - Complete component specs with code examples
3. **Accessibility Guidelines** - WCAG compliance, testing, best practices

---

## Getting Started

### Installation

The design system is already integrated into the Jetvision codebase. To use it:

```tsx
import { tokens, getBrandColor, typography, space } from '@/lib/design-system'
```

### Using Design Tokens

```tsx
import { tokens, getBrandColor, typography } from '@/lib/design-system'

// Get a brand color
const primaryColor = getBrandColor('aviationBlue', 500) // #0066cc

// Create typography styles
const headingStyle = typography('h1', 'bold', 'tight')

// Access spacing
const cardPadding = tokens.spacing[6] // 1.5rem (24px)

// Get shadows
const cardShadow = tokens.shadows.sm
```

### Using with Tailwind CSS

All design tokens are automatically available as Tailwind utility classes via `tailwind.config.ts`:

```tsx
// Brand Colors
<button className="bg-aviation-blue-500 hover:bg-aviation-blue-600 text-white">
  Primary Action
</button>

<div className="bg-sky-blue-50 border-sky-blue-200">
  Sky Blue Container
</div>

<span className="text-sunset-orange-500">
  Accent Text
</span>

// Semantic Colors
<div className="bg-success text-white">Success Message</div>
<div className="bg-warning text-white">Warning Alert</div>
<div className="bg-error text-white">Error Message</div>
<div className="bg-info text-white">Info Banner</div>

// Shadows
<div className="shadow-primary">Elevated Card</div>
<div className="shadow-accent">Highlighted Element</div>

// Border Radius
<div className="rounded-sm">Small Radius</div>
<div className="rounded-lg">Large Radius (Default)</div>
<div className="rounded-full">Fully Rounded</div>

// Z-Index Layers
<div className="z-dropdown">Dropdown Menu</div>
<div className="z-modal">Modal Dialog</div>
<div className="z-tooltip">Tooltip</div>
```

**Complete Token-to-Class Mapping:**

| Token Category | Tailwind Classes | Example |
|---------------|------------------|---------|
| **Aviation Blue** | `bg-aviation-blue-{50-900}` | `bg-aviation-blue-500` |
| **Sky Blue** | `bg-sky-blue-{50-900}` | `text-sky-blue-600` |
| **Sunset Orange** | `bg-sunset-orange-{50-900}` | `border-sunset-orange-500` |
| **Neutral** | `bg-neutral-{50-950}` | `bg-neutral-100` |
| **Success** | `bg-success`, `text-success` | `bg-success` |
| **Warning** | `bg-warning`, `text-warning` | `bg-warning` |
| **Error** | `bg-error`, `text-error` | `bg-error` |
| **Info** | `bg-info`, `text-info` | `bg-info` |
| **Spacing** | `p-{0-96}`, `m-{0-96}`, `gap-{0-96}` | `p-6`, `gap-4` |
| **Border Radius** | `rounded-{sm,md,lg,xl,2xl,3xl,full}` | `rounded-lg` |
| **Shadows** | `shadow-{xs,sm,md,lg,xl,2xl,primary,accent}` | `shadow-md` |
| **Z-Index** | `z-{dropdown,modal,tooltip,etc}` | `z-modal` |

### Using Components

```tsx
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

<Card>
  <CardHeader>
    <CardTitle>Flight Search</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <div>
        <Label htmlFor="departure">Departure</Label>
        <Input id="departure" placeholder="Los Angeles (LAX)" />
      </div>
      <Button className="w-full">Search Flights</Button>
    </div>
  </CardContent>
</Card>
```

---

## Brand Identity

### Vision

Jetvision Group represents the pinnacle of private aviation services. Our design embodies:

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

### Color Palette

**Primary - Sky Blue (#00a8e8)**
Represents trust, professionalism, innovation, speed, and the open sky.

**Secondary - Text Link Style**
Flat text link style using primary color (Sky Blue) for text, transparent background.

**Accent - Sunset Orange (#ff6b35)**
Adds warmth, energy, and a premium feel.

---

## Key Features

### Accessibility First

- **WCAG 2.1 Level AA** compliance (minimum)
- Tested color contrast ratios (4.5:1+ for text)
- Full keyboard navigation support
- Screen reader compatible
- Focus indicators on all interactive elements
- 44x44px minimum touch targets (exceeds AA standard)

### Dark Mode Support

Complete dark mode implementation:
- Automatic theme detection
- Manual theme toggle
- All components tested in both modes
- Adjusted color values for optimal contrast

### Responsive Design

Mobile-first approach:
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
- Fluid typography
- Flexible layouts
- Touch-friendly interactions

### TypeScript Ready

Full TypeScript support:
- Typed design tokens
- Typed component props
- Type-safe utility functions
- IntelliSense autocomplete

---

## File Structure

```
lib/design-system/
├── tokens.ts           # All design tokens (colors, typography, spacing, etc.)
├── utils.ts            # Helper functions for working with tokens
└── index.ts            # Barrel exports

docs/design-system/
├── README.md           # This file
├── STYLE_GUIDE.md      # Visual design language and brand guidelines
├── COMPONENTS.md       # Component library documentation
└── ACCESSIBILITY.md    # Accessibility guidelines and testing

components/ui/          # shadcn/ui components (atoms)
components/aviation/    # Custom aviation-specific components (molecules/organisms)
```

---

## Usage Examples

### Creating a Custom Component

```tsx
import { tokens, typography, shadow, radius } from '@/lib/design-system'

const customCardStyles = {
  ...typography('base', 'normal', 'relaxed'),
  padding: tokens.spacing[6],
  borderRadius: tokens.radii.xl,
  boxShadow: shadow('md'),
  backgroundColor: 'var(--color-card)',
  color: 'var(--color-card-foreground)',
  border: `1px solid ${tokens.cssVarColors.light.border}`,
}

export function CustomCard({ children }) {
  return <div style={customCardStyles}>{children}</div>
}
```

### Responsive Typography

```tsx
import { getResponsiveFontSize } from '@/lib/design-system'

const headingSize = getResponsiveFontSize('h1')
// Returns: { mobile: '2rem', desktop: '2.5rem' }

<h1 className="text-[2rem] md:text-[2.5rem]">
  Heading
</h1>
```

### Semantic Colors

```tsx
import { getSemanticColor, getSemanticBg } from '@/lib/design-system'

const successColor = getSemanticColor('success', 'light')    // #10b981
const successBg = getSemanticBg('success', 'light')          // #dcfce7

<div
  style={{
    color: successColor,
    backgroundColor: successBg,
    padding: tokens.spacing[3],
    borderRadius: tokens.radii.md,
  }}
>
  Booking confirmed!
</div>
```

---

## Browser Support

- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Testing

### Visual Regression Testing

```bash
# Run visual tests
npm run test:visual
```

### Accessibility Testing

```bash
# Run accessibility audit
npm run test:a11y

# Manual testing with screen readers
# macOS: VoiceOver (Cmd+F5)
# Windows: NVDA or JAWS
```

### Component Testing

```bash
# Run component tests
npm run test:unit

# Watch mode
npm run test:watch
```

---

## Contributing

### Before Creating New Components

1. Check if a similar component exists
2. Review the [Style Guide](./STYLE_GUIDE.md) for design patterns
3. Ensure WCAG AA accessibility compliance
4. Test in both light and dark modes
5. Document with examples in [COMPONENTS.md](./COMPONENTS.md)

### Design Token Changes

Changes to design tokens require:
- UX team approval
- Visual regression testing
- Accessibility re-validation
- Documentation updates

---

## Roadmap

### Version 1.1 (Planned)

- [ ] Additional aviation-specific components
- [ ] Animation library
- [ ] Icon system
- [ ] Illustration guidelines
- [ ] Email templates

### Version 2.0 (Future)

- [ ] Figma design kit
- [ ] Storybook component playground
- [ ] Design system CLI tool
- [ ] Automated accessibility testing in CI/CD

---

## Resources

### Internal

- [Jetvision Brand Guidelines](../brand/BRAND_GUIDELINES.md) (if exists)
- [Component Library Storybook](http://localhost:6006) (if setup)
- [Figma Design Files](https://figma.com/...) (if available)

### External

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Radix UI Primitives](https://www.radix-ui.com)
- [Tailwind CSS Docs](https://tailwindcss.com)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## Support

**Questions?** Contact the UX team or open a discussion in the project repository.

**Found an issue?** Open an issue with the `design-system` label.

**Need a new component?** Submit a request with use cases and mockups.

---

**Maintained by:** Jetvision Group UX Team
**Current Version:** 1.0.0
**License:** Proprietary - Jetvision Group

---

*Built with care for private aviation excellence.*
