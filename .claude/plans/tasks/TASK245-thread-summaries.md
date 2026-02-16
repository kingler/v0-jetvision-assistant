# Task ID: TASK245
# Task Name: Thread Summaries
# Parent User Story: [[US131-view-operator-threads-per-session|US131 - Show latest message preview per thread]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Display a preview of the latest message in each operator thread within the sidebar. The preview should show a truncated message body to give users a quick glance at the most recent communication without expanding the thread.

## Acceptance Criteria
- Each operator thread group displays the latest message as a preview
- Message preview is truncated to a maximum of 80 characters with ellipsis
- Preview includes a relative timestamp (e.g., "2m ago", "1h ago", "Yesterday")
- Preview text style is muted/secondary to distinguish from the operator name
- Preview updates when a new message arrives in the thread
- Unread indicator appears if the latest message is unread
- Unit tests verify truncation, timestamp formatting, and update behavior

## Implementation Details
- **File(s)**: `components/chat-sidebar.tsx`
- **Approach**: In each operator group component, extract the last message from the sorted message array. Truncate the content using a `truncateText(text, maxLength)` utility. Format the timestamp using a relative time formatter (e.g., `formatDistanceToNow` from date-fns). Render below the operator name in the collapsed group view.

## Dependencies
- [[TASK244-group-messages-operator|TASK244]] (group-messages-operator) for the grouped message structure
