# Task ID: TASK223
# Task Name: Auto-Reconnect on Disconnect
# Parent User Story: [[US118-handle-connection-status|US118 - Automatic reconnection on SSE disconnect]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement automatic reconnection logic in the webhook subscription hook so that when the SSE connection drops (network error, server restart, timeout), the client automatically attempts to re-establish the connection with exponential backoff.

## Acceptance Criteria
- Connection drop is detected via EventSource `onerror` or `onclose` events
- Reconnection attempts use exponential backoff (e.g., 1s, 2s, 4s, 8s, max 30s)
- Maximum retry count is configurable (default: 10 attempts)
- Connection status is updated during reconnection (yellow/reconnecting state)
- Successful reconnection resets the backoff timer
- After max retries, status transitions to disconnected (red) and stops retrying
- Unit tests cover reconnection logic, backoff timing, and max retry behavior

## Implementation Details
- **File(s)**: `lib/chat/hooks/use-webhook-subscription.ts`
- **Approach**: Wrap the EventSource creation in a reconnection manager. Track attempt count and compute delay using `Math.min(1000 * 2^attempt, 30000)`. Use `setTimeout` for delayed retries. Expose connection status via the hook return value for the status indicator component.

## Dependencies
- [[TASK222-connection-status-component|TASK222]] (connection-status-component) consumes the connection state
