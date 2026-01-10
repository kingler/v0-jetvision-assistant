"use client"

import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Color variant configuration for StarterCard
 * Each variant defines light/dark mode colors for icon background and icon
 */
const variantStyles = {
  cyan: {
    iconBg: "bg-cyan-100 dark:bg-cyan-900",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    hoverBorder: "hover:border-cyan-300 dark:hover:border-cyan-600",
  },
  blue: {
    iconBg: "bg-blue-100 dark:bg-blue-900",
    iconColor: "text-blue-600 dark:text-blue-400",
    hoverBorder: "hover:border-blue-300 dark:hover:border-blue-600",
  },
  green: {
    iconBg: "bg-green-100 dark:bg-green-900",
    iconColor: "text-green-600 dark:text-green-400",
    hoverBorder: "hover:border-green-300 dark:hover:border-green-600",
  },
  amber: {
    iconBg: "bg-amber-100 dark:bg-amber-900",
    iconColor: "text-amber-600 dark:text-amber-400",
    hoverBorder: "hover:border-amber-300 dark:hover:border-amber-600",
  },
} as const

export type StarterCardVariant = keyof typeof variantStyles

export interface StarterCardProps {
  /** Lucide icon component to display */
  icon: LucideIcon
  /** Main title text */
  title: string
  /** Secondary description text */
  description: string
  /** Click handler */
  onClick: () => void
  /** Color variant for icon background */
  variant?: StarterCardVariant
  /** Optional badge count (displays in top-right) */
  badge?: number
  /** Disable the card */
  disabled?: boolean
  /** Show loading skeleton */
  loading?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * StarterCard - Card-style conversation starter component
 *
 * Matches the existing LandingPage pattern with:
 * - Icon in colored rounded box (left)
 * - Title and description text (right)
 * - Border highlight on hover
 *
 * @example
 * ```tsx
 * <StarterCard
 *   icon={Plane}
 *   title="New Flight Request"
 *   description="Start a new charter request"
 *   onClick={() => handleStarterClick("new-flight")}
 *   variant="cyan"
 * />
 * ```
 */
export function StarterCard({
  icon: Icon,
  title,
  description,
  onClick,
  variant = "cyan",
  badge,
  disabled = false,
  loading = false,
  className,
}: StarterCardProps) {
  const styles = variantStyles[variant]

  // Loading skeleton state
  if (loading) {
    return (
      <div
        className={cn(
          "h-auto p-3 sm:p-4 rounded-md border-2 border-gray-200 dark:border-gray-700 bg-transparent animate-pulse",
          className
        )}
        data-testid="starter-card-skeleton"
      >
        <div className="flex items-center space-x-3 w-full">
          {/* Icon skeleton */}
          <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          {/* Text skeleton */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 sm:h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-auto p-3 sm:p-4 justify-start text-left",
        "hover:bg-gray-50 dark:hover:bg-gray-800",
        "border-2 transition-all bg-transparent",
        styles.hoverBorder,
        disabled && "opacity-50 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent",
        className
      )}
      data-testid="starter-card"
    >
      <div className="flex items-center space-x-3 w-full relative">
        {/* Icon box */}
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center",
            styles.iconBg
          )}
        >
          <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5", styles.iconColor)} />
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">
            {title}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>

        {/* Optional badge */}
        {badge !== undefined && badge > 0 && (
          <div
            className={cn(
              "absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5",
              "flex items-center justify-center",
              "rounded-full text-xs font-medium",
              "bg-red-500 text-white"
            )}
            data-testid="starter-card-badge"
          >
            {badge > 99 ? "99+" : badge}
          </div>
        )}
      </div>
    </Button>
  )
}

export default StarterCard
