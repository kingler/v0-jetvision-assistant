# User Story ID: US122
# Title: Deduplicate Notifications
# Parent Epic: [[EPIC029-notification-display|EPIC029 - Agent Notification & Chat Integration]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want duplicate notifications deduplicated, so I don't see the same event twice.

## Acceptance Criteria

### AC1: Duplicate Event Filtering
**Given** the same webhook event fires twice (e.g., due to retry)
**When** useMessageDeduplication processes both events
**Then** only one notification appears in the chat

### AC2: Deduplication Key Generation
**Given** a deduplication key is generated from timestamp + type + quoteId
**When** a second event with a matching key arrives
**Then** the duplicate is silently discarded without user notification

## Tasks
- [[TASK228-deduplication-hook|TASK228 - Implement useMessageDeduplication hook for tracking seen events]]
- [[TASK229-generate-dedup-keys|TASK229 - Generate deduplication keys from event metadata (timestamp, type, quoteId)]]

## Technical Notes
- Dedup key format: `{timestamp}:{eventType}:{quoteId}`
- Seen keys stored in a Set with TTL-based cleanup (expire after 5 minutes)
- Hook maintains state across re-renders using useRef
- Maximum set size capped at 1000 entries to prevent memory leaks
- Works in conjunction with batch notification system
