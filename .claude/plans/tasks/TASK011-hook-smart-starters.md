# Task ID: TASK011
# Task Name: Implement useSmartStarters Hook
# Parent User Story: [[US004-use-conversation-starters|US004 - See conversation starter prompts on empty chat]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Implement a `useSmartStarters` hook that provides contextual conversation starter prompts based on the user's recent activity, pending requests, and current workflow state.

## Acceptance Criteria
- Hook returns an array of contextual starter prompts
- Prompts are personalized based on user's recent flight requests
- Prompts include pending actions (e.g., "Review 3 new quotes for KTEB-KLAX")
- Default generic starters are returned when no context is available
- Hook handles loading and error states gracefully
- Starters refresh when user context changes

## Implementation Details
- **File(s)**: `components/conversation-starters/hooks/use-smart-starters.ts`
- **Approach**: Create a custom hook that fetches user context (recent requests, pending quotes, active trips) from the API or Supabase. Generate contextual prompts based on the data. Fall back to a default set of generic starters if the fetch fails or returns empty. Memoize results to prevent unnecessary re-renders. Include a `isLoading` flag for skeleton UI support.

## Dependencies
- [[TASK010-implement-conversation-starters|TASK010]] (conversation starters component consumes hook output)
