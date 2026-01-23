import { Plane, ListChecks } from "lucide-react"
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
 * These prompts are submitted to the chat when a starter is clicked.
 * Tool references help the agent understand which MCP tools to use.
 *
 * Available Avinode MCP tools:
 * - create_trip: Create trip and get deep link for operator selection
 * - get_rfq: Get RFQ details and received quotes (supports trip ID)
 * - get_quote: Get detailed quote information from an operator
 * - cancel_trip: Cancel an active trip
 * - send_trip_message: Send message to operators
 * - get_trip_messages: Get message history for a trip
 * - search_airports: Search airports by code/name
 * - search_empty_legs: Find empty leg flights
 */
export const STARTER_PROMPTS = {
  "new-flight-request":
    "I'd like to create a new flight request. Use the `create_trip` tool to set up a charter flight and generate a deep link for operator selection.",
  "show-active-requests":
    "Show me my active flight requests. Fetch my pending trips from the database and use the `get_rfq` tool to retrieve RFQ details and any quotes received for each trip.",
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
