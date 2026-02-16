# Task ID: TASK226
# Task Name: Persist System Messages
# Parent User Story: [[US120-system-message-in-chat|US120 - Save system notifications to messages table]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Extend the message persistence layer to save system-generated notification messages (quote received, operator message) to the messages database table. This ensures notifications are preserved across page reloads and session switches.

## Acceptance Criteria
- System notification messages are saved to the `messages` table with role='system'
- Messages include metadata (event type, quote ID, operator ID) as JSON in a metadata column
- Persistence is non-blocking (does not delay UI rendering)
- Failed persistence attempts are logged but do not crash the application
- Messages are retrievable when loading session history
- Unit tests verify persistence calls and error handling

## Implementation Details
- **File(s)**: `lib/conversation/message-persistence.ts`
- **Approach**: Add a `persistSystemMessage` function that accepts a formatted notification message and writes it to the messages table via the Supabase client. Include the session ID and request ID for proper association. Use fire-and-forget pattern with error logging.

## Dependencies
- [[TASK225-format-agent-notifications|TASK225]] (format-agent-notifications) provides the formatted message objects
- [[TASK232-load-session-messages|TASK232]] (load-session-messages) for retrieval on session load
