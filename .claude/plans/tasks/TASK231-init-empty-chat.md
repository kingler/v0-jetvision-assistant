# Task ID: TASK231
# Task Name: Initialize Empty Chat State
# Parent User Story: [[US123-create-new-session|US123 - Initialize empty chat state for new session]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
When a new chat session is created, initialize the chat state hook with an empty message array, a fresh session ID, and default UI state (no active request, input focused, sidebar updated).

## Acceptance Criteria
- Creating a new session clears any existing messages from the chat state
- New session ID is set in the chat state
- Chat input is focused and ready for user input
- Sidebar session list is updated to include the new session
- No stale data from previous sessions persists in state
- Unit tests verify state reset behavior

## Implementation Details
- **File(s)**: `lib/chat/hooks/use-chat-state.ts`
- **Approach**: Add an `initNewSession` function to the chat state hook that resets messages to an empty array, sets the new session ID, clears any active request reference, and triggers a sidebar refresh. Call this function after a successful POST to the create session API.

## Dependencies
- [[TASK230-create-session-api|TASK230]] (create-session-api) provides the new session ID
