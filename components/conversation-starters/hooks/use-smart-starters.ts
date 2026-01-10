"use client"

import { useMemo, useCallback, useRef, useEffect } from "react"
import type { ConversationStarter } from "../types"
import { DEFAULT_STARTERS } from "../default-starters"

/**
 * User context for smart starter prioritization
 */
export interface UserContext {
  /** Number of active flight requests */
  activeRequestCount?: number
  /** Number of pending quotes awaiting review */
  pendingQuotesCount?: number
  /** Number of hot opportunities needing attention */
  hotOpportunitiesCount?: number
  /** Whether user has reached their request limit */
  isAtRequestLimit?: boolean
}

/**
 * Result returned by useSmartStarters hook
 */
export interface SmartStartersResult {
  /** Enhanced conversation starters with context-aware badges and priorities */
  starters: ConversationStarter[]
  /** Whether starters are being calculated */
  isLoading: boolean
  /** Error if calculation failed */
  error: Error | null
  /** Function to force recalculation of starters */
  refresh: () => void
}

/** Threshold for prioritizing active requests */
const ACTIVE_REQUEST_PRIORITY_THRESHOLD = 1

/** Threshold for prioritizing pending quotes */
const PENDING_QUOTES_PRIORITY_THRESHOLD = 1

/**
 * Calculate category priority based on user context
 * Lower number = higher priority
 */
function calculateCategoryPriority(
  category: "flight" | "deals" | "pipeline",
  context: UserContext
): number {
  const { activeRequestCount = 0, pendingQuotesCount = 0 } = context

  // Base priorities
  const basePriorities: Record<"flight" | "deals" | "pipeline", number> = {
    flight: 1,
    deals: 2,
    pipeline: 3,
  }

  let priority = basePriorities[category]

  // If pending quotes exist, prioritize deals
  if (pendingQuotesCount >= PENDING_QUOTES_PRIORITY_THRESHOLD && category === "deals") {
    priority = 0.5
  }

  // If active requests exist but no pending quotes, keep flights first
  if (
    activeRequestCount >= ACTIVE_REQUEST_PRIORITY_THRESHOLD &&
    pendingQuotesCount === 0 &&
    category === "flight"
  ) {
    priority = 0.5
  }

  return priority
}

/**
 * Apply context-aware enhancements to a starter
 */
function enhanceStarter(
  starter: ConversationStarter,
  context: UserContext
): ConversationStarter {
  const {
    activeRequestCount = 0,
    pendingQuotesCount = 0,
    hotOpportunitiesCount = 0,
    isAtRequestLimit = false,
  } = context

  const enhanced: ConversationStarter = { ...starter }

  // Apply badges based on starter ID
  switch (starter.id) {
    case "active-requests":
      if (activeRequestCount > 0) {
        enhanced.badge = activeRequestCount
        // Boost priority when there are active requests
        enhanced.priority = 0
      }
      break

    case "show-deals":
      if (pendingQuotesCount > 0) {
        enhanced.badge = pendingQuotesCount
      }
      break

    case "hot-opportunities":
      if (hotOpportunitiesCount > 0) {
        enhanced.badge = hotOpportunitiesCount
        enhanced.variant = "amber"
      }
      break

    case "new-flight-request":
      if (isAtRequestLimit) {
        enhanced.disabled = true
      }
      break
  }

  return enhanced
}

/**
 * Sort starters by category priority and internal priority
 */
function sortStarters(
  starters: ConversationStarter[],
  context: UserContext
): ConversationStarter[] {
  return [...starters].sort((a, b) => {
    // First sort by category priority
    const categoryPriorityA = calculateCategoryPriority(a.category, context)
    const categoryPriorityB = calculateCategoryPriority(b.category, context)

    if (categoryPriorityA !== categoryPriorityB) {
      return categoryPriorityA - categoryPriorityB
    }

    // Then by internal priority within category
    return (a.priority ?? 99) - (b.priority ?? 99)
  })
}

/**
 * Check if context has meaningful values for analytics
 */
function hasSignificantContext(context: UserContext | undefined): boolean {
  if (!context) return false

  const {
    activeRequestCount = 0,
    pendingQuotesCount = 0,
    hotOpportunitiesCount = 0,
  } = context

  return activeRequestCount > 0 || pendingQuotesCount > 0 || hotOpportunitiesCount > 0
}

/**
 * Serialize context for comparison (memoization key)
 */
function serializeContext(context: UserContext | undefined): string {
  if (!context) return ""
  return JSON.stringify({
    activeRequestCount: context.activeRequestCount ?? 0,
    pendingQuotesCount: context.pendingQuotesCount ?? 0,
    hotOpportunitiesCount: context.hotOpportunitiesCount ?? 0,
    isAtRequestLimit: context.isAtRequestLimit ?? false,
  })
}

/**
 * useSmartStarters - Intelligent conversation starter selection
 *
 * Analyzes user context to provide contextually relevant conversation starters
 * with appropriate badges, priorities, and disabled states.
 *
 * @param context - Optional user context for prioritization
 * @returns SmartStartersResult with enhanced starters
 *
 * @example
 * ```tsx
 * const { starters, isLoading, refresh } = useSmartStarters({
 *   activeRequestCount: 3,
 *   pendingQuotesCount: 5,
 * })
 *
 * return <ConversationStarterHub starters={starters} />
 * ```
 */
export function useSmartStarters(context?: UserContext): SmartStartersResult {
  const refreshTrigger = useRef(0)
  const previousContextRef = useRef<string>("")

  // Memoize starters calculation
  const starters = useMemo(() => {
    // Normalize context
    const normalizedContext: UserContext = {
      activeRequestCount: Math.max(0, context?.activeRequestCount ?? 0),
      pendingQuotesCount: Math.max(0, context?.pendingQuotesCount ?? 0),
      hotOpportunitiesCount: Math.max(0, context?.hotOpportunitiesCount ?? 0),
      isAtRequestLimit: context?.isAtRequestLimit ?? false,
    }

    // Enhance each starter with context-aware properties
    const enhanced = DEFAULT_STARTERS.map((starter) =>
      enhanceStarter(starter, normalizedContext)
    )

    // Sort by priority
    return sortStarters(enhanced, normalizedContext)
  }, [
    context?.activeRequestCount,
    context?.pendingQuotesCount,
    context?.hotOpportunitiesCount,
    context?.isAtRequestLimit,
    refreshTrigger.current,
  ])

  // Analytics tracking
  useEffect(() => {
    const currentContextKey = serializeContext(context)

    // Only track if context has meaningful values and changed
    if (
      hasSignificantContext(context) &&
      currentContextKey !== previousContextRef.current
    ) {
      // Dynamic import to avoid SSR issues and keep bundle small
      import("@/lib/analytics")
        .then(({ trackEvent }) => {
          trackEvent("smart_starters_context_updated", {
            activeRequestCount: context?.activeRequestCount ?? 0,
            pendingQuotesCount: context?.pendingQuotesCount ?? 0,
            hotOpportunitiesCount: context?.hotOpportunitiesCount ?? 0,
          })
        })
        .catch(() => {
          // Analytics failure should not affect functionality
        })

      previousContextRef.current = currentContextKey
    }
  }, [context])

  // Refresh function to force recalculation
  const refresh = useCallback(() => {
    refreshTrigger.current += 1
  }, [])

  return {
    starters,
    isLoading: false,
    error: null,
    refresh,
  }
}
