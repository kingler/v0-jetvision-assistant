import type { LucideIcon } from "lucide-react"
import type { StarterCardVariant } from "./starter-card"

/**
 * Starter category identifiers
 */
export type StarterCategory = "flight" | "deals" | "pipeline"

/**
 * Individual conversation starter definition
 */
export interface ConversationStarter {
  /** Unique identifier for the starter */
  id: string
  /** Display title */
  title: string
  /** Secondary description */
  description: string
  /** Lucide icon component */
  icon: LucideIcon
  /** Category this starter belongs to */
  category: StarterCategory
  /** Color variant for the card */
  variant?: StarterCardVariant
  /** Optional badge count (e.g., active requests) */
  badge?: number
  /** Action identifier for click handler */
  action: string
  /** Prompt template to submit to chat when clicked */
  prompt: string
  /** Whether this starter is currently disabled */
  disabled?: boolean
  /** Priority for ordering within category (lower = higher priority) */
  priority?: number
}

/**
 * Category configuration
 */
export interface StarterCategoryConfig {
  /** Category identifier */
  id: StarterCategory
  /** Display label */
  label: string
  /** Category icon */
  icon: LucideIcon
  /** Default color variant for starters in this category */
  variant: StarterCardVariant
}

/**
 * Props for the ConversationStarterHub component
 */
export interface ConversationStarterHubProps {
  /** Array of starters to display */
  starters: ConversationStarter[]
  /** Handler called when a starter is clicked */
  onStarterClick: (action: string, starter: ConversationStarter) => void
  /** Whether all starters are in loading state */
  loading?: boolean
  /** Custom class name */
  className?: string
  /** Whether to show category headers */
  showCategoryHeaders?: boolean
  /** Maximum starters to show per category (0 = unlimited) */
  maxPerCategory?: number
}
