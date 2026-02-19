# Task ID: TASK115
# Task Name: Preserve Session Context During Avinode Interaction
# Parent User Story: [[US058-return-from-avinode-with-context|US058 - Maintain session while interacting with Avinode]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Ensure that chat session data (conversation history, request context, trip details) persists while the user is interacting with Avinode in a separate browser tab. When the user returns to the Jetvision tab, all context should be intact and ready for the next workflow step.

## Acceptance Criteria
- Chat session state persists when user switches to Avinode tab
- Conversation history is fully preserved on return
- Active request/trip context is maintained
- No data loss during tab switching
- Session does not time out during normal Avinode interaction (up to 30 minutes)
- Works with browser page visibility API for optimization
- Reconnects to any active SSE/WebSocket streams on return

## Implementation Details
- **File(s)**: lib/chat/hooks/use-chat-state.ts
- **Approach**: Ensure the chat state management persists data to a durable store (localStorage or Supabase) in addition to React state. Use the Page Visibility API to detect when the user leaves and returns. On visibility change to visible, refresh the session state and reconnect any dropped real-time connections. Implement a heartbeat mechanism if using server-side session storage.

## Dependencies
- Chat state management hooks must exist
- Session persistence layer (localStorage/Supabase)
- Real-time connection management (SSE reconnection)
