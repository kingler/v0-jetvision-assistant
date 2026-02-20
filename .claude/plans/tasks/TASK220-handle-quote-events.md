# Task ID: TASK220
# Task Name: Handle Quote Events
# Parent User Story: [[US116-receive-realtime-quote-notification-ws|US116 - Quote Event Processing]]
# Status: Done
# Priority: Critical
# Estimate: 3h

## Description
Implement the onQuoteReceived callback that is triggered when a TripRequestSellerResponse webhook event arrives via the Supabase Realtime subscription. The callback processes the quote data and updates the chat interface.

## Acceptance Criteria
- onQuoteReceived callback fires when event_type is 'TripRequestSellerResponse'
- Quote data is extracted and parsed from the webhook event payload
- Parsed quote includes: operator name, aircraft type, price, currency, availability, valid_until
- Quote is added to the chat as a structured message (not plain text)
- UI displays RFQQuoteDetailsCard component for the received quote
- Multiple quotes are accumulated and displayed in order of arrival
- Callback is debounced to handle rapid successive events (100ms)
- Error in callback does not break the realtime subscription

## Implementation Details
- **File(s)**: lib/chat/hooks/use-webhook-subscription.ts
- **Approach**: In the realtime event handler, check event_type for 'TripRequestSellerResponse'. Parse the payload JSON to extract quote details. Call the onQuoteReceived callback prop with the parsed QuoteEvent object. The parent component uses this callback to append a quote message to the chat. Include error handling with try/catch around parsing and callback invocation.

## Dependencies
- [[TASK218-supabase-realtime-sub|TASK218]] (supabase-realtime-sub)
- [[TASK219-filter-by-trip-id|TASK219]] (filter-by-trip-id)
- RFQQuoteDetailsCard component (components/avinode/)
- Chat message interface for structured messages
