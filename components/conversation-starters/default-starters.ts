import { Plane, ListChecks, DollarSign, Flame, BarChart3 } from "lucide-react"
import type { ConversationStarter } from "./types"

/**
 * Default conversation starters
 *
 * These are the standard starters displayed to users.
 * The useSmartStarters hook can override badges and disabled state
 * based on user context.
 */
/**
 * Prompt templates for conversation starters
 * These prompts are submitted to the chat when a starter is clicked
 */
export const STARTER_PROMPTS = {
  "new-flight-request": "I'd like to create a new flight request. Please help me set up a charter flight.",
  "show-active-requests": "Show me my active flight requests. I want to see the status of my pending RFQs and any quotes I've received.",
  "show-deals": "Show me my deals. Display all active deals with their status, operators, and pricing information.",
  "show-hot-opportunities": "Show me hot opportunities. I want to see high-priority deals that need immediate attention or are time-sensitive.",
  "show-pipeline": "Show me my pipeline summary. I want an overview of my request pipeline, including metrics and conversion rates.",
} as const

export const DEFAULT_STARTERS: ConversationStarter[] = [
  // Flight Requests Category
  {
    id: "new-flight-request",
    title: "New Flight Request",
    description: "Start a new charter request",
    icon: Plane,
    category: "flight",
    variant: "cyan",
    action: "new-flight-request",
    prompt: STARTER_PROMPTS["new-flight-request"],
    priority: 1,
  },
  {
    id: "active-requests",
    title: "My Active Requests",
    description: "View pending flight requests",
    icon: ListChecks,
    category: "flight",
    variant: "cyan",
    action: "show-active-requests",
    prompt: STARTER_PROMPTS["show-active-requests"],
    priority: 2,
  },

  // Deals Category
  {
    id: "show-deals",
    title: "Show My Deals",
    description: "View all active deals with status",
    icon: DollarSign,
    category: "deals",
    variant: "green",
    action: "show-deals",
    prompt: STARTER_PROMPTS["show-deals"],
    priority: 1,
  },
  {
    id: "hot-opportunities",
    title: "Hot Opportunities",
    description: "High-priority deals needing attention",
    icon: Flame,
    category: "deals",
    variant: "amber",
    action: "show-hot-opportunities",
    prompt: STARTER_PROMPTS["show-hot-opportunities"],
    priority: 2,
  },

  // Pipeline Category
  {
    id: "pipeline-summary",
    title: "Pipeline Summary",
    description: "Overview of request pipeline",
    icon: BarChart3,
    category: "pipeline",
    variant: "blue",
    action: "show-pipeline",
    prompt: STARTER_PROMPTS["show-pipeline"],
    priority: 1,
  },
]

/**
 * Get default starters with optional filtering
 *
 * @param options - Optional filtering configuration
 * @param options.categories - Only return starters from these categories
 * @param options.excludeIds - Exclude starters with these IDs
 * @returns Filtered array of conversation starters
 *
 * @example
 * ```tsx
 * // Get all default starters
 * const all = getDefaultStarters()
 *
 * // Get only flight starters
 * const flights = getDefaultStarters({ categories: ['flight'] })
 *
 * // Exclude specific starters
 * const filtered = getDefaultStarters({ excludeIds: ['new-flight-request'] })
 *
 * // Combine filters
 * const combined = getDefaultStarters({
 *   categories: ['flight', 'deals'],
 *   excludeIds: ['hot-opportunities']
 * })
 * ```
 */
export function getDefaultStarters(options?: {
  categories?: Array<"flight" | "deals" | "pipeline">
  excludeIds?: string[]
}): ConversationStarter[] {
  let starters = [...DEFAULT_STARTERS]

  if (options?.categories) {
    starters = starters.filter((s) => options.categories!.includes(s.category))
  }

  if (options?.excludeIds) {
    starters = starters.filter((s) => !options.excludeIds!.includes(s.id))
  }

  return starters
}
