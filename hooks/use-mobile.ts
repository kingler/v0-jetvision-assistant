import * as React from 'react'

/** Breakpoint below which layout is treated as mobile (e.g. single column, overlay sidebar). */
const MOBILE_BREAKPOINT = 768

/** Breakpoint below which sidebar is overlay and should close on phone/tablet (e.g. iPad). */
const SIDEBAR_OVERLAY_BREAKPOINT = 1024

/**
 * Returns true when viewport width is below the mobile breakpoint (768px).
 * Used for mobile-only UI (e.g. touch targets, sheet modals).
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener('change', onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isMobile
}

/**
 * Returns true when viewport is tablet or smaller (< 1024px).
 * Use for sidebar overlay + auto-close so sidebar closes on phone and iPad/tablet width.
 */
export function useIsTabletOrSmaller() {
  const [isTabletOrSmaller, setIsTabletOrSmaller] = React.useState<boolean>(false)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${SIDEBAR_OVERLAY_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsTabletOrSmaller(window.innerWidth < SIDEBAR_OVERLAY_BREAKPOINT)
    }
    mql.addEventListener('change', onChange)
    setIsTabletOrSmaller(window.innerWidth < SIDEBAR_OVERLAY_BREAKPOINT)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isTabletOrSmaller
}
