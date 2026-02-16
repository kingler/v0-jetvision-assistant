# Task ID: TASK202
# Task Name: Theme Provider
# Parent User Story: [[US105-dark-mode-toggle|US105 - Dark Mode Support]]
# Status: Done
# Priority: Medium
# Estimate: 3h

## Description
Implement a ThemeProvider component that manages light/dark theme state and provides a toggle mechanism. The provider wraps the application and applies the correct theme class to the document root.

## Acceptance Criteria
- ThemeProvider component wraps children and manages theme state
- Supports three modes: 'light', 'dark', 'system' (follows OS preference)
- Theme preference is persisted in localStorage
- System mode listens to prefers-color-scheme media query changes
- useTheme() hook returns current theme and toggle function
- Theme class ('light' or 'dark') is applied to <html> element
- No flash of wrong theme on initial load (SSR-safe)
- Theme transition is smooth (no jarring color change)

## Implementation Details
- **File(s)**: components/theme-provider.tsx
- **Approach**: Create a React context provider that reads initial theme from localStorage (or system preference), applies the class to document.documentElement, and provides setTheme/toggleTheme via context. Use next-themes package or custom implementation. Include a script tag in the HTML head to prevent flash of unstyled content (FOUC).

## Dependencies
- [[TASK199-define-brand-tokens|TASK199]] (define-brand-tokens) for theme token values
- [[TASK203-dark-mode-css-vars|TASK203]] (dark-mode-css-vars) for CSS custom properties
