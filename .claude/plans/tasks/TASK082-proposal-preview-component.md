# Task ID: TASK082
# Task Name: Proposal Preview Component
# Parent User Story: [[US041-preview-proposal-before-sending|US041 - Preview proposal before sending]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Create a rich proposal preview component that renders within the chat interface, displaying all key proposal details: flight route (departure/arrival airports with codes), dates and times, aircraft type and category, pricing breakdown (base, margin, final), and customer information. The preview serves as the final review step before sending the proposal.

## Acceptance Criteria
- Displays flight route with airport codes and names (e.g., KTEB Teterboro -> KLAX Los Angeles)
- Shows departure and return dates with formatted times
- Displays aircraft type, category, and year of manufacture
- Shows pricing breakdown: base amount, margin, final amount
- Displays customer name and email
- Shows proposal number and status
- Responsive layout that works in the chat message area
- Uses design system tokens for colors, spacing, and typography

## Implementation Details
- **File(s)**: components/message-components/proposal-preview.tsx
- **Approach**: Build as a React component that receives proposal data as props. Structure with a card layout using header (proposal number, status badge), body sections (route map, flight details, pricing table), and footer (customer info). Use the existing design system components (Card, Badge, etc.) and Tailwind theme tokens.

## Dependencies
- [[TASK079-create-proposal-record|TASK079]] (Create proposal record) - proposal data structure
- Design system Card, Badge components
- [[TASK083-preview-actions|TASK083]] (Preview actions) - action buttons rendered within this component
