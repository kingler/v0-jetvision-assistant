# Task ID: TASK244
# Task Name: Group Messages by Operator
# Parent User Story: [[US131-view-operator-threads-per-session|US131 - Group operator messages by operatorId]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Implement message grouping logic in the sidebar that clusters operator messages by their operator ID, creating a threaded view where each operator has their own message group within a session.

## Acceptance Criteria
- Messages from the same operator are grouped together in the sidebar
- Each operator group shows the operator name as a header
- Groups are sorted by most recent message timestamp
- Clicking an operator group expands to show individual messages
- Collapsed view shows operator name and message count
- Groups update in real-time as new messages arrive
- Unit tests verify grouping logic, sorting, and dynamic updates

## Implementation Details
- **File(s)**: `components/chat-sidebar.tsx`
- **Approach**: Add a `groupMessagesByOperator` utility function that takes an array of messages and returns a `Map<string, OperatorMessageGroup>` keyed by operator ID. Each group contains the operator name, message array, and latest timestamp. Render groups as collapsible sections within the session detail view.

## Dependencies
- [[TASK237-sidebar-session-list|TASK237]] (sidebar-session-list) for the sidebar structure
- [[TASK221-handle-operator-message-events|TASK221]] (handle-operator-message-events) for operator message data
