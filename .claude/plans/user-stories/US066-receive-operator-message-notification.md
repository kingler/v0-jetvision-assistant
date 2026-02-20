# User Story ID: US066
# Title: Receive Operator Message Notification
# Parent Epic: [[EPIC015-operator-messaging|EPIC015 - Operator Messaging]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want to be notified of new operator messages, so I can respond promptly.

## Acceptance Criteria

### AC1: Notification appears in chat
**Given** an operator sends a message
**When** the webhook processes
**Then** a notification appears in chat

### AC2: Notification format is clear
**Given** the notification formats
**When** it renders
**Then** it says "New message from [operator] regarding quote [ID]: '[preview]'"

## Tasks
- [[TASK129-format-operator-notification|TASK129 - Format operator message notification]]
- [[TASK130-display-notification-chat|TASK130 - Display in chat]]

## Technical Notes
- Notifications are triggered by `TripChatSeller` webhook events processed via SSE
- The notification format includes operator name, quote reference, and a truncated message preview
- Notifications are rendered as system messages in the active chat session
- The `agent-notifications.ts` module handles formatting and delivery of notification messages
