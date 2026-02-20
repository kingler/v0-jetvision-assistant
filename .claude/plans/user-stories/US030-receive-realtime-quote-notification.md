# User Story ID: US030
# Title: Receive Real-Time Quote Notification
# Parent Epic: [[EPIC007-quote-reception-display|EPIC007 - Quote Management]]
# Status: Implemented
# Priority: Critical
# Story Points: 5

## User Story
As an ISO agent, I want to receive real-time notifications when operators submit quotes, so that I can respond quickly.

## Acceptance Criteria

### AC1: Real-Time Webhook Notification
**Given** I have an active trip
**When** an operator submits a quote via Avinode
**Then** the webhook fires and I see a notification within seconds

### AC2: Quote Data Persistence
**Given** the webhook arrives
**When** it's processed
**Then** the quote is stored in the database with full details (price, aircraft, operator)

### AC3: Chat Notification Display
**Given** the notification renders
**When** it appears in chat
**Then** it says "New quote received from [operator name]"

## Tasks
- [[TASK063-process-quote-webhook|TASK063 - Implement Avinode webhook handler at `/api/webhooks/avinode` for TripRequestSellerResponse events]]
- [[TASK064-store-quote-database|TASK064 - Store incoming quote data in avinode_webhook_events table with full details (price, aircraft, operator)]]
- [[TASK065-broadcast-quote-event|TASK065 - Push real-time notifications via SSE to chat interface showing "New quote received from [operator name]"]]

## Technical Notes
- Avinode sends TripRequestSellerResponse webhook events when operators submit quotes
- The webhook handler is at `/api/webhooks/avinode` and validates incoming payloads
- Quote data is stored in the avinode_webhook_events table with event_type, payload, and processing status
- Real-time delivery uses Server-Sent Events (SSE) via the `/api/avinode/events` endpoint
- The AvinodeConnectionStatus component (`components/avinode/`) indicates the SSE connection state
- The agent notification system (`lib/chat/agent-notifications.ts`) formats and delivers notifications in the chat
- Latency target: notification should appear within 2-3 seconds of webhook receipt
