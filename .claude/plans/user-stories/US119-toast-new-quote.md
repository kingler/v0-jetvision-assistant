# User Story ID: US119
# Title: Toast Notification for New Quotes
# Parent Epic: [[EPIC029-notification-display|EPIC029 - Agent Notification & Chat Integration]]
# Status: Implemented
# Priority: High
# Story Points: 2

## User Story
As an ISO agent, I want a toast notification for new quotes, so I notice them even if not looking at chat.

## Acceptance Criteria

### AC1: Toast on Quote Arrival
**Given** a new quote arrives via the webhook subscription
**When** the notification system processes the event
**Then** a toast.success notification shows "Quote received from [operator]!" with operator name

## Tasks
- [[TASK224-toast-quote-event|TASK224 - Trigger toast notification on quote_received event from webhook subscription]]

## Technical Notes
- Uses sonner toast library for notifications
- Toast includes operator name extracted from webhook payload
- Toast auto-dismisses after 5 seconds
- Toast is clickable to navigate to the relevant quote in chat
- Triggered from the agent notification handler in `lib/chat/agent-notifications.ts`
