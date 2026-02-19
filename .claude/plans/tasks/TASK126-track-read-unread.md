# Task ID: TASK126
# Task Name: Track Read/Unread Messages
# Parent User Story: [[US064-view-operator-message-thread|US064 - Operator Message Thread View]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Implement read/unread tracking for operator messages. Track the lastMessagesReadAt timestamp per operator thread so the system can determine which messages are new/unread when the user opens a thread.

## Acceptance Criteria
- lastMessagesReadAt is stored per operator thread
- Opening a message thread updates lastMessagesReadAt to current time
- Messages received after lastMessagesReadAt are considered unread
- Unread count can be calculated by comparing message timestamps to lastMessagesReadAt
- Read state persists across page reloads
- Multiple operator threads maintain independent read states

## Implementation Details
- **File(s)**: components/chat-interface.tsx
- **Approach**: Store lastMessagesReadAt in the chat session or local state keyed by operator ID. When the user opens/views an operator message thread, update the timestamp to Date.now(). Expose a utility function to calculate unread count by querying messages with timestamps after lastMessagesReadAt. Persist the read timestamps to the database for cross-session consistency.

## Dependencies
- [[TASK125-operator-message-thread|TASK125]] (operator message thread component)
