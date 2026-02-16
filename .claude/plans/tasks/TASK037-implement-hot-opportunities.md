# Task ID: TASK037
# Task Name: Implement Hot Opportunities Component
# Parent User Story: [[US015-view-pipeline-dashboard|US015 - View sales pipeline and hot opportunities]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Implement the hot opportunities list component that displays high-priority deals requiring immediate attention, with quick action buttons for each opportunity.

## Acceptance Criteria
- Hot opportunities are displayed as a prioritized list
- Each opportunity shows client name, route, value, and urgency indicator
- Urgency is indicated by color (red for critical, orange for high, yellow for medium)
- Quick action buttons are provided (e.g., "Send Quote", "Follow Up", "View Details")
- List is sorted by urgency/priority
- Empty state is shown when no hot opportunities exist
- Maximum of 5-10 items displayed with a "View All" link for more
- Component refreshes data periodically or on demand

## Implementation Details
- **File(s)**: `components/message-components/hot-opportunities.tsx`
- **Approach**: Create a `HotOpportunities` component that receives an `opportunities` array with `{ id, clientName, route, value, urgency, daysOpen, actions }`. Render as a compact list with each item showing the key details and action buttons. Use an urgency indicator (colored dot or badge) based on priority level. Include quick action buttons that trigger chat commands or API calls. Limit display to top N items with a "View All" link. Style with design system list and badge tokens.

## Dependencies
- [[TASK032-implement-action-buttons|TASK032]] (action buttons component for quick actions)
- [[TASK036-implement-pipeline-dashboard|TASK036]] (pipeline dashboard provides context for hot deals)
