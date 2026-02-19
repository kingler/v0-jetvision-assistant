# Epic ID: EPIC029
# Epic Name: Notification Display System
# Parent Feature: [[F012-realtime-notifications|F012 - Real-Time Notification Pipeline]]
# Status: Implemented
# Priority: High

## Description
Multi-channel notification display system that presents Avinode webhook events as toast messages, system chat messages, and sidebar badges. Includes deduplication logic to prevent duplicate notifications from retry events, batch grouping for multiple quotes arriving in rapid succession, and consistent formatting across all display channels.

## Goals
- Display notifications consistently across toast, chat, and badge channels
- Deduplicate notifications from webhook retries or duplicate events
- Batch multiple related notifications (e.g., several quotes arriving within seconds)
- Format notification content with relevant details (operator name, aircraft, price)

## User Stories
- [[US119-toast-new-quote|US119 - View toast notification when a new quote is received]]
- [[US120-system-message-in-chat|US120 - View system message in chat thread for quote and message events]]
- [[US121-batch-quote-notifications|US121 - Batch multiple quote notifications into a single grouped message]]
- [[US122-dedup-notifications|US122 - Deduplicate notifications from repeated webhook deliveries]]

## Acceptance Criteria Summary
- Toast notifications appear within 1 second of event receipt
- System messages are inserted into the active chat thread with appropriate formatting
- Notifications arriving within a 3-second window are batched into a single display
- Duplicate events (same event_id or matching content hash) are suppressed
- Each notification channel (toast, chat, badge) can be independently enabled/disabled
- Notification content includes contextual details (operator, aircraft type, quoted price)

## Technical Scope
- lib/chat/agent-notifications.ts - Notification creation, formatting, and dispatch
- lib/chat/hooks/use-message-deduplication.ts - Deduplication logic with content hashing
- components/ui/sonner.tsx - Toast notification component (Sonner wrapper)
- components/chat-interface.tsx - System message insertion into chat thread
- components/chat-sidebar.tsx - Unread badge count updates
