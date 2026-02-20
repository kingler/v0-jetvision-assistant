# Task ID: TASK209
# Task Name: useIsMobile Hook
# Parent User Story: [[US108-responsive-modal|US108 - Responsive Modal Component]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
Implement the useIsMobile React hook that detects mobile viewport using a 768px breakpoint. The hook listens to window resize events and returns a boolean indicating mobile state.

## Acceptance Criteria
- useIsMobile() returns true when viewport width <= 768px
- useIsMobile() returns false when viewport width > 768px
- Updates reactively on window resize
- Uses matchMedia API for efficient event-driven detection
- SSR-safe: returns false during server-side rendering
- Debounced to prevent excessive re-renders during resize
- Breakpoint value is configurable via optional parameter
- Cleans up event listeners on unmount

## Implementation Details
- **File(s)**: hooks/use-mobile.tsx
- **Approach**: Use window.matchMedia('(max-width: 768px)') to create a MediaQueryList. Listen to its 'change' event to update state. Initialize with matchMedia.matches on mount. Return undefined during SSR (typeof window === 'undefined'). Use useEffect for listener setup and cleanup.

## Dependencies
- React hooks (useState, useEffect)
