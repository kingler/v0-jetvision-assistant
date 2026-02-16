# Task ID: TASK027
# Task Name: Wire Booking Action Button
# Parent User Story: [[US010-view-quote-card-in-chat|US010 - View detailed quote card with aircraft and pricing]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement the "Review and Book" button on the quote card that triggers the booking modal for the selected flight quote.

## Acceptance Criteria
- "Review and Book" button is visible on each quote card
- Button click opens a booking confirmation modal
- Modal displays the selected quote summary (aircraft, price, route, dates)
- Modal includes a "Confirm Booking" action button
- Modal includes a "Cancel" button that closes without action
- Button is disabled for expired or withdrawn quotes
- Loading state is shown while booking is being processed

## Implementation Details
- **File(s)**: `components/avinode/book-flight-modal.tsx`
- **Approach**: Create a `BookFlightModal` component using the design system dialog/modal pattern. Accept `quote: RFQFlight` and `onConfirm` / `onCancel` props. Display a summary of the selected quote in the modal body. On confirm, call the booking API endpoint. Use `useState` for modal open/close state in the parent card component. Disable the trigger button based on quote status.

## Dependencies
- [[TASK025-implement-quote-card|TASK025]] (quote card contains the booking button)
