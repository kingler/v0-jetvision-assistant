# Task ID: TASK237
# Task Name: Sidebar Session List
# Parent User Story: [[US127-view-session-list|US127 - Render session cards in sidebar]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Build the session list UI in the chat sidebar that renders individual session cards. Each card displays the flight route (origin-destination), date, current status, and a stage badge indicating the workflow progress.

## Acceptance Criteria
- Session list renders all user sessions sorted by most recent activity
- Each session card displays: route (e.g., "KTEB → KLAX"), date, status text
- Stage badge shows current workflow stage with appropriate color
- Active session is visually highlighted (different background/border)
- Empty state is shown when no sessions exist ("Start a new conversation")
- Session list updates when new sessions are created or deleted
- Responsive layout works on mobile and desktop widths
- Unit tests verify rendering, sorting, and empty state

## Implementation Details
- **File(s)**: `components/chat-sidebar.tsx`
- **Approach**: Fetch sessions from the API on mount and store in local state. Map over sessions to render `SessionCard` sub-components. Use design system tokens for colors and spacing. Apply the `FlightRequestStageBadge` component for status badges.

## Dependencies
- [[TASK230-create-session-api|TASK230]] (create-session-api) for session data
- [[TASK056-implement-stage-badge|TASK056]] (implement-stage-badge) for the stage badge component
