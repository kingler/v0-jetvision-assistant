# Feature ID: F011
# Feature Name: Design System
# Status: Implemented
# Priority: High

## Description
Comprehensive design system providing brand colors, typography, spacing, motion presets, and accessible components for the Jetvision AI Assistant. The system is built on CSS custom properties using the oklch color space with full Tailwind CSS integration, enabling consistent theming across dark/light modes with WCAG AA accessibility compliance. It serves as the foundational visual layer upon which all UI components and layouts are constructed.

## Business Value
A unified design system ensures visual consistency across every surface of the Jetvision application, reducing design debt and accelerating UI development. By codifying brand identity (Sky Blue primary, neutral palette, semantic colors) into reusable tokens and components, the team avoids ad-hoc styling decisions that lead to visual fragmentation. The accessibility-first approach (focus rings, 48px touch targets, contrast ratios) ensures the product meets compliance requirements and is usable by all charter flight brokers regardless of assistive technology needs.

## Key Capabilities
- Brand color system with Sky Blue #00a8e8 as the primary color, a 10-shade neutral palette, and semantic colors for success, warning, error, and info states
- Responsive typography using clamp-based fluid scaling (16-20px base range) for consistent readability across screen sizes
- 12-step spacing scale built on a 4px base unit for predictable layout rhythm
- Motion presets with Framer Motion integration including fadeInUp, staggerContainer, and crossfade animations
- Dark/light mode theming via CSS custom properties in the oklch color space for perceptually uniform color transitions
- WCAG AA accessibility compliance with visible focus rings, minimum 48px touch targets, and enforced contrast ratios
- Tailwind CSS integration via design tokens, enabling utility-class-based styling that maps directly to the design system
- 30+ base UI components including button with 8 variants (default, destructive, outline, secondary, ghost, link, premium, subtle), responsive modal, tabs, cards, badges, and form elements

## Related Epics
- [[EPIC025-design-tokens-theme|EPIC025 - Design Tokens & Theme]]
- [[EPIC026-base-ui-components|EPIC026 - Base UI Components]]
- [[EPIC027-accessibility-responsive|EPIC027 - Accessibility & Responsive]]

## Dependencies
- None (foundational feature - other features depend on this)

## Technical Components
- `lib/design-system/index.ts` - Barrel exports for all design system modules
- `lib/design-system/tokens.ts` - Design token definitions (colors, spacing, typography, radii, shadows)
- `lib/design-system/utils.ts` - Utility functions for token resolution and theme manipulation
- `lib/design-system/motion-presets.ts` - Framer Motion animation presets (fadeInUp, staggerContainer, crossfade, slideIn)
- `lib/design-system/tailwind-theme.ts` - Tailwind theme extension mapping design tokens to utility classes
- `lib/design-system/tailwind-helpers.ts` - Helper functions for generating Tailwind-compatible class strings from tokens
- `components/ui/` - 30+ base UI components (button.tsx, tabs.tsx, card.tsx, badge.tsx, dialog.tsx, input.tsx, select.tsx, etc.)
- `app/globals.css` (~530 lines) - CSS custom properties, oklch color definitions, dark/light mode variables, and global base styles
