# Task ID: TASK131
# Task Name: Track Unread Message Counts
# Parent User Story: [[US067-view-unread-message-count|US067 - Unread Message Badges]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Implement logic to count unread messages per operator thread in the chat sidebar. The count should reflect messages received after the user last viewed each operator's thread.

## Acceptance Criteria
- Unread count is calculated per operator thread
- Count updates in real-time when new messages arrive
- Count resets to zero when the user opens the operator thread
- Counts persist across component re-renders
- Total unread count available for aggregate display
- Efficient calculation that does not require fetching all messages

## Implementation Details
- **File(s)**: components/chat-sidebar.tsx
- **Approach**: Maintain a state map of operator ID to unread count. On SSE message events, increment the count for the relevant operator. When the user opens a thread (TASK126), reset that operator's count to zero. Derive the total unread count by summing all operator counts. Use React context or zustand for cross-component state sharing if needed.

## Dependencies
- [[TASK126-track-read-unread|TASK126]] (read/unread tracking provides lastMessagesReadAt)
- SSE events for real-time message arrival
