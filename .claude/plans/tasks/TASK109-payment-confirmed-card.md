# Task ID: TASK109
# Task Name: Payment Confirmed Card Component
# Parent User Story: [[US054-view-payment-confirmation|US054 - Display payment confirmation details]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Create a card component that displays payment confirmation details within the chat interface after a payment is recorded. The card shows the payment amount, method, reference number, and timestamp in a clear, professional format.

## Acceptance Criteria
- Displays payment amount formatted as currency (e.g., $125,450.00)
- Shows payment method (Wire Transfer, Credit Card, etc.)
- Displays reference/transaction number
- Shows payment date and confirmation timestamp
- Shows contract number for reference
- Visual success indicator (green checkmark or success styling)
- Responsive layout within chat message area
- Uses design system tokens for consistent styling

## Implementation Details
- **File(s)**: components/contract/payment-confirmed-card.tsx
- **Approach**: Build as a React component that accepts payment data as props. Use a Card component with success-themed styling (green border/accent). Structure with icon + title header, detail rows for each field, and a subtle footer with timestamp. Format currency with Intl.NumberFormat. Use design system color tokens for the success theme.

## Dependencies
- [[TASK107-call-confirm-payment|TASK107]] (Confirm payment API) - provides payment data
- Design system Card component and color tokens
- Currency formatting utilities
