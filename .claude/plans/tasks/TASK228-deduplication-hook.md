# Task ID: TASK228
# Task Name: Message Deduplication Hook
# Parent User Story: [[US122-dedup-notifications|US122 - Prevent duplicate messages from webhook events]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Create a `useMessageDeduplication` React hook that tracks processed message keys and prevents the same webhook event from being processed multiple times. This is critical for SSE connections that may replay events on reconnection.

## Acceptance Criteria
- `useMessageDeduplication` hook exposes `isDuplicate(key)` and `markProcessed(key)` functions
- Maintains a Set of processed message keys in memory
- Keys expire after a configurable TTL (default: 5 minutes) to prevent unbounded memory growth
- Hook cleans up expired keys on a periodic interval
- Returns boolean from `isDuplicate` to allow callers to skip processing
- Unit tests cover deduplication, TTL expiry, and cleanup

## Implementation Details
- **File(s)**: `lib/chat/hooks/use-message-deduplication.ts`
- **Approach**: Use `useRef` to maintain a `Map<string, number>` where keys are message dedup keys and values are timestamps. Implement `isDuplicate` by checking if the key exists and is not expired. Use `useEffect` with `setInterval` for periodic cleanup of expired entries.

## Dependencies
- [[TASK229-generate-dedup-keys|TASK229]] (generate-dedup-keys) for key generation logic
