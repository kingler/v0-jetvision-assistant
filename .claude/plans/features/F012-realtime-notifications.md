# Feature ID: F012
# Feature Name: Real-time Notifications
# Status: Implemented
# Priority: High

## Description
Real-time notification system that delivers webhook events, quote updates, and operator messages to the chat interface as they occur. The system subscribes to Supabase Realtime channels for the avinode_webhook_events table, streams events via SSE, and renders contextual toast notifications and formatted agent messages within the chat. Message deduplication prevents duplicate notifications when events arrive through multiple channels simultaneously.

## Business Value
Charter flight brokerage is time-sensitive -- operators respond to RFQs within minutes, and brokers who act fastest secure the best aircraft and pricing. Real-time notifications ensure ISO agents are immediately aware of new quotes, operator messages, and status changes without manual polling or page refreshes. This reduces response latency from minutes to seconds, directly improving quote win rates and operator relationship management.

## Key Capabilities
- Supabase Realtime webhook subscription monitoring the avinode_webhook_events table for new inserts and updates
- Server-Sent Events (SSE) streaming for pushing webhook events to the frontend in real-time
- Toast notifications via Sonner for transient alerts (quote received, message sent, connection status changes)
- System notifications rendered as formatted agent messages within the chat conversation
- Message deduplication logic to prevent duplicate notifications when the same event arrives through Supabase Realtime and SSE simultaneously
- Agent notification formatting for batch quote messages (grouping multiple quotes into a single summary) and operator message previews (showing sender, snippet, and action buttons)
- Unread message indicators on session sidebar cards and operator thread badges

## Related Epics
- [[EPIC028-webhook-subscription|EPIC028 - Webhook Subscription]]
- [[EPIC029-notification-display|EPIC029 - Notification Display]]

## Dependencies
- [[F006-avinode-marketplace-integration|F006 - Avinode Integration (provides the webhook events and SSE infrastructure that notifications subscribe to)]]
- [[F001-ai-chat-assistant|F001 - AI Chat Assistant (provides the chat interface where system notifications are rendered)]]

## Technical Components
- `lib/chat/hooks/use-webhook-subscription.ts` - React hook for subscribing to Supabase Realtime channels and processing incoming webhook events
- `lib/chat/hooks/use-message-deduplication.ts` - React hook implementing deduplication logic with event fingerprinting to prevent duplicate notifications
- `lib/chat/agent-notifications.ts` - Utility module for formatting agent notification messages (batch quote summaries, operator message previews, status change alerts)
- `components/ui/sonner.tsx` - Sonner toast notification wrapper component configured with Jetvision design system theming
