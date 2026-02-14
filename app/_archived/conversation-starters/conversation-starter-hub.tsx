"use client"

import { useMemo } from "react"
import { Plane, DollarSign, BarChart3 } from "lucide-react"
import { StarterCard } from "./starter-card"
import { cn } from "@/lib/utils"
import type {
  ConversationStarter,
  ConversationStarterHubProps,
  StarterCategory,
  StarterCategoryConfig,
} from "./types"

/**
 * Category configuration with icons and colors
 */
const CATEGORY_CONFIG: Record<StarterCategory, StarterCategoryConfig> = {
  flight: {
    id: "flight",
    label: "Flight Requests",
    icon: Plane,
    variant: "cyan",
  },
  deals: {
    id: "deals",
    label: "Deals",
    icon: DollarSign,
    variant: "green",
  },
  pipeline: {
    id: "pipeline",
    label: "Pipeline",
    icon: BarChart3,
    variant: "blue",
  },
}

/**
 * Category display order
 */
const CATEGORY_ORDER: StarterCategory[] = ["flight", "deals", "pipeline"]

/**
 * ConversationStarterHub - Container for conversation starters
 *
 * Displays starters grouped by category (Flight, Deals, Pipeline)
 * using the card-style layout from LandingPage.
 *
 * @example
 * ```tsx
 * <ConversationStarterHub
 *   starters={[
 *     { id: "1", title: "New Flight", description: "...", icon: Plane, category: "flight", action: "new-flight" },
 *     { id: "2", title: "My Deals", description: "...", icon: DollarSign, category: "deals", action: "show-deals" },
 *   ]}
 *   onStarterClick={(action) => handleAction(action)}
 * />
 * ```
 */
export function ConversationStarterHub({
  starters,
  onStarterClick,
  loading = false,
  className,
  showCategoryHeaders = true,
  maxPerCategory = 0,
}: ConversationStarterHubProps) {
  // Group starters by category
  const startersByCategory = useMemo(() => {
    const grouped: Record<StarterCategory, ConversationStarter[]> = {
      flight: [],
      deals: [],
      pipeline: [],
    }

    // Sort starters by priority (lower = higher priority)
    const sorted = [...starters].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))

    for (const starter of sorted) {
      if (grouped[starter.category]) {
        grouped[starter.category].push(starter)
      }
    }

    // Apply maxPerCategory limit if specified
    if (maxPerCategory > 0) {
      for (const category of CATEGORY_ORDER) {
        grouped[category] = grouped[category].slice(0, maxPerCategory)
      }
    }

    return grouped
  }, [starters, maxPerCategory])

  // Get categories that have starters
  const activeCategories = useMemo(() => {
    return CATEGORY_ORDER.filter((cat) => startersByCategory[cat].length > 0)
  }, [startersByCategory])

  // Empty state
  if (!loading && activeCategories.length === 0) {
    return (
      <div
        className={cn("text-center py-8 text-muted-foreground", className)}
        data-testid="starter-hub-empty"
      >
        <p>No conversation starters available</p>
      </div>
    )
  }

  // Loading skeleton state
  if (loading) {
    return (
      <div className={cn("space-y-6", className)} data-testid="starter-hub-loading">
        {CATEGORY_ORDER.map((category) => (
          <div key={category} className="space-y-3">
            {showCategoryHeaders && (
              <div className="h-5 bg-surface-tertiary rounded w-32 animate-pulse" />
            )}
            <div className="grid gap-3">
              <StarterCard
                icon={Plane}
                title=""
                description=""
                onClick={() => {}}
                loading
              />
              <StarterCard
                icon={Plane}
                title=""
                description=""
                onClick={() => {}}
                loading
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)} data-testid="starter-hub">
      {activeCategories.map((category) => {
        const config = CATEGORY_CONFIG[category]
        const categoryStarters = startersByCategory[category]
        const CategoryIcon = config.icon

        return (
          <div key={category} className="space-y-3" data-testid={`starter-category-${category}`}>
            {/* Category Header */}
            {showCategoryHeaders && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CategoryIcon className="w-4 h-4" />
                <span className="text-sm font-medium">{config.label}</span>
              </div>
            )}

            {/* Starters Grid */}
            <div className="grid gap-3">
              {categoryStarters.map((starter) => (
                <StarterCard
                  key={starter.id}
                  icon={starter.icon}
                  title={starter.title}
                  description={starter.description}
                  onClick={() => onStarterClick(starter.action, starter)}
                  variant={starter.variant ?? config.variant}
                  badge={starter.badge}
                  disabled={starter.disabled}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

