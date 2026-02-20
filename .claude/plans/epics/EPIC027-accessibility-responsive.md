# Epic ID: EPIC027
# Epic Name: Accessibility and Responsive Design
# Parent Feature: [[F011-design-system|F011 - Design System Foundation]]
# Status: Implemented
# Priority: High

## Description
WCAG AA accessibility compliance across all interactive components and responsive design patterns that adapt gracefully from mobile (320px) to desktop (1440px+). Includes focus management utilities, touch target enforcement, motion-safe animation presets, and adaptive layout components that switch rendering strategies based on viewport size.

## Goals
- Achieve WCAG AA compliance for all interactive elements
- Ensure responsive layouts work across mobile, tablet, and desktop breakpoints
- Respect user motion preferences with prefers-reduced-motion media query
- Provide utility functions that make accessibility the default, not an afterthought

## User Stories
- [[US111-focus-rings|US111 - Focus rings visible on all interactive elements during keyboard navigation]]
- [[US112-touch-targets|US112 - Touch targets meet 48px minimum size on mobile devices]]
- [[US113-respect-reduced-motion|US113 - Animations respect prefers-reduced-motion user preference]]
- [[US114-responsive-layouts|US114 - Responsive layouts adapt seamlessly from mobile to desktop]]

## Acceptance Criteria Summary
- All focusable elements display a visible focus ring (2px offset, brand color)
- Touch targets are minimum 48x48px on touch devices (44px acceptable with spacing)
- Animations are disabled or reduced when prefers-reduced-motion is set to reduce
- Layout components use CSS Grid/Flexbox with mobile-first breakpoint progression
- Color contrast ratios meet WCAG AA minimum (4.5:1 for normal text, 3:1 for large text)
- Screen reader announcements provided for dynamic content updates
- No content is lost or inaccessible at any supported viewport width

## Technical Scope
- lib/design-system/utils.ts - focusRing() utility, touchTarget() utility, cn() class merge helper
- lib/design-system/motion-presets.ts - useMotionSafe() hook, animation presets with reduced-motion fallbacks
- components/ui/responsive-modal.tsx - Viewport-adaptive modal (Dialog on desktop, Drawer on mobile)
- app/globals.css - Base accessible styles, focus-visible rules, reduced-motion media queries
- Radix UI primitives - Built-in ARIA attributes, keyboard navigation, focus trapping
