# Task ID: TASK250
# Task Name: Analytics Summary Card Component
# Parent User Story: [[US135-view-analytics-summary|US135 - Analytics display component]]
# Status: Partial
# Priority: Medium
# Estimate: 2h

## Description
Build a reusable analytics summary card component that displays key business metrics in a visually appealing card format. The component is designed to be rendered inline in the chat when the agent provides analytics data.

## Acceptance Criteria
- Component renders a card with title, primary metric value, and trend indicator
- Supports multiple metric types: count, percentage, currency, duration
- Trend indicator shows up/down arrow with percentage change and color coding
- Card uses design system tokens for consistent styling
- Component accepts structured data props (not raw API response)
- Responsive layout adapts to chat message width
- Loading skeleton state while data is being fetched
- Unit tests verify rendering for each metric type and trend direction

## Implementation Details
- **File(s)**: `components/message-components/analytics-summary-card.tsx`
- **Approach**: Create a React component with typed props for metric value, label, trend percentage, and metric type. Use a switch on metric type to format the display value (e.g., currency formatting with Intl.NumberFormat, percentage with % suffix). Render trend arrow using SVG icons with green (up) or red (down) coloring.

## Dependencies
- [[TASK249-analytics-api|TASK249]] (analytics-api) provides the data
- Design system tokens from `lib/design-system/index.ts`
