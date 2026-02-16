# Task ID: TASK112
# Task Name: Closed Won Confirmation Card Component
# Parent User Story: [[US056-view-closed-won-confirmation|US056 - Display deal closure celebration]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Create a celebration card component that displays in the chat interface when a deal is successfully closed. The card shows a summary of the completed deal including flight details, total revenue, customer name, and a congratulatory message. This provides positive reinforcement and a clear endpoint to the sales workflow.

## Acceptance Criteria
- Displays a visually celebratory card (success colors, optional confetti animation)
- Shows deal summary: flight route, dates, aircraft type
- Displays total revenue amount prominently
- Shows customer name and company
- Includes contract number and proposal number for reference
- Shows timeline: request created -> proposal sent -> contract signed -> payment received
- "View Details" link to full contract view
- Responsive layout within chat message area

## Implementation Details
- **File(s)**: components/contract/closed-won-confirmation.tsx
- **Approach**: Build as a React component with celebratory styling. Use Card component with a gradient or accent border in success colors. Structure with a header (trophy/celebration icon + "Deal Closed!" title), summary section with key metrics, timeline section showing workflow milestones with timestamps, and a footer with navigation links. Consider using framer-motion for subtle entrance animation.

## Dependencies
- [[TASK110-update-closed-won|TASK110]] (Update closed won) - triggers this display
- Contract, proposal, and request data must be available
- Design system Card component and color tokens
