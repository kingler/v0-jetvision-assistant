# User Story ID: US058
# Title: Return from Avinode with Context
# Parent Epic: [[EPIC013-deep-link-workflow|EPIC013 - Avinode Deep Link Integration]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want to return from Avinode and have the chat retain context, so that the workflow continues seamlessly.

## Acceptance Criteria

### AC1: Chat session retains trip context
**Given** I selected operators in Avinode
**When** I return to Jetvision
**Then** my chat session still shows the trip context

### AC2: Quotes appear automatically via webhooks
**Given** operators were selected
**When** webhooks arrive
**Then** new quotes appear automatically in my chat

## Tasks
- [[TASK115-preserve-session-context|TASK115 - Preserve session context]]
- [[TASK116-wire-webhook-to-session|TASK116 - Wire webhook to session]]

## Technical Notes
- Chat session persistence is handled by `message-persistence.ts` which stores session state in Supabase
- Trip context (trip_id, route, status) is maintained in the session metadata
- SSE endpoint at `/api/avinode/events` pushes real-time webhook events to the active session
- Webhook events are matched to sessions via `trip_id` linkage in the requests table
