# Task ID: TASK229
# Task Name: Generate Deduplication Keys
# Parent User Story: [[US122-dedup-notifications|US122 - Generate unique deduplication keys for webhook events]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement a key generation function that produces unique, deterministic deduplication keys for incoming webhook events. The key format combines timestamp, event type, and entity ID to uniquely identify each event.

## Acceptance Criteria
- Key format: `{timestamp}:{eventType}:{entityId}` (e.g., `1704067200000:TripRequestSellerResponse:quote-abc123`)
- Keys are deterministic: same event always produces the same key
- Function handles all webhook event types (TripRequestSellerResponse, TripChatSeller, TripChatMine)
- Missing fields fall back to reasonable defaults (e.g., 'unknown' for missing entity ID)
- Keys are string type for use as Map/Set keys
- Unit tests cover all event types, edge cases, and missing field scenarios

## Implementation Details
- **File(s)**: `lib/chat/hooks/use-message-deduplication.ts`
- **Approach**: Export a `generateDedupKey` function that accepts a webhook event object and extracts the relevant fields. Use a switch statement on event type to determine which entity ID field to use (quoteId for quotes, messageId for messages). Concatenate with colon separator.

## Dependencies
- [[TASK228-deduplication-hook|TASK228]] (deduplication-hook) consumes the generated keys
