"use client"

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

export { Skeleton }

/**
 * Themed skeleton wrapper that uses CSS variables for dark mode support.
 * Colors defined in globals.css as --skeleton-base and --skeleton-highlight.
 */
export function ChatSkeletonTheme({ children }: { children: React.ReactNode }) {
  return (
    <SkeletonTheme
      baseColor="var(--skeleton-base)"
      highlightColor="var(--skeleton-highlight)"
      borderRadius="calc(0.5rem - 2px)"
      duration={1.2}
    >
      {children}
    </SkeletonTheme>
  )
}
