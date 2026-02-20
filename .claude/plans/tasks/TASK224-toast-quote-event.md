# Task ID: TASK224
# Task Name: Toast Notification on New Quote
# Parent User Story: [[US119-toast-new-quote|US119 - Display toast notification when a new quote is received]]
# Status: Done
# Priority: High
# Estimate: 1h

## Description
Trigger a toast success notification in the chat interface whenever a new `TripRequestSellerResponse` webhook event is received, indicating an operator has submitted a quote. The toast should display a brief summary including the operator name and aircraft type.

## Acceptance Criteria
- `toast.success()` is called when a new quote event is received
- Toast message includes operator name and aircraft type (e.g., "New quote from XYZ Aviation - Gulfstream G650")
- Toast auto-dismisses after 5 seconds
- Toast does not fire for duplicate events (integrates with deduplication)
- Unit tests verify toast is triggered with correct content

## Implementation Details
- **File(s)**: `components/chat-interface.tsx`
- **Approach**: In the chat interface component, subscribe to quote events from the webhook hook. When a new quote arrives, extract operator and aircraft details from the event payload and call `toast.success()` with a formatted message. Use the existing toast library (sonner or react-hot-toast).

## Dependencies
- [[TASK221-handle-operator-message-events|TASK221]] (handle-operator-message-events) for webhook event stream
- [[TASK228-deduplication-hook|TASK228]] (deduplication-hook) to prevent duplicate toasts
