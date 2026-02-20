# Task ID: TASK227
# Task Name: Batch Quote Event Formatting
# Parent User Story: [[US121-batch-quote-notifications|US121 - Batch multiple quote events into a single message]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Implement batch formatting logic that collects multiple quote events arriving within a short time window and consolidates them into a single summary notification message, rather than flooding the chat with individual notifications.

## Acceptance Criteria
- Quote events received within a configurable time window (default: 5 seconds) are batched together
- Batched message summarizes all quotes (e.g., "3 new quotes received from operators X, Y, Z")
- Individual quote details are accessible via expandable section or metadata
- Single quote events that arrive outside the batch window are formatted individually
- Batch timer resets when a new event arrives within the window
- Unit tests cover single event, batch of 2+, and timer expiry scenarios

## Implementation Details
- **File(s)**: `lib/chat/agent-notifications.ts`
- **Approach**: Implement a `QuoteBatchCollector` class that accumulates events and uses a debounce timer. When the timer expires, call `formatBatchedQuoteMessage` to produce a single summary message. Expose a `flush` method for immediate processing.

## Dependencies
- [[TASK225-format-agent-notifications|TASK225]] (format-agent-notifications) for individual message formatting
- [[TASK228-deduplication-hook|TASK228]] (deduplication-hook) to prevent duplicate events in batches
