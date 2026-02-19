# User Story ID: US121
# Title: Batch Quote Notifications
# Parent Epic: [[EPIC029-notification-display|EPIC029 - Agent Notification & Chat Integration]]
# Status: Implemented
# Priority: Medium
# Story Points: 2

## User Story
As an ISO agent, I want multiple quote notifications batched, so chat isn't flooded.

## Acceptance Criteria

### AC1: Batch Multiple Quotes into Single Message
**Given** 3 quotes arrive within a short time window
**When** the batch formatter processes the notifications
**Then** one consolidated message lists all 3 operators instead of 3 separate messages

## Tasks
- [[TASK227-batch-formatting|TASK227 - Implement batch formatting logic in agent-notifications.ts]]

## Technical Notes
- Batch window is configurable (default: 5 seconds)
- Uses a debounce/accumulator pattern to collect events before formatting
- Operator names are comma-separated with Oxford comma: "op1, op2, and op3"
- If only 1 event in batch, falls back to single notification format
- Batch count included in message for clarity
