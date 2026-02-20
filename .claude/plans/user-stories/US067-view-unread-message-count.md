# User Story ID: US067
# Title: View Unread Message Count
# Parent Epic: [[EPIC015-operator-messaging|EPIC015 - Operator Messaging]]
# Status: Implemented
# Priority: Medium
# Story Points: 2

## User Story
As an ISO agent, I want to see unread message counts, so I know which threads need attention.

## Acceptance Criteria

### AC1: Unread badges show per operator thread
**Given** unread messages exist
**When** the sidebar renders
**Then** unread badges show per operator thread

## Tasks
- [[TASK131-track-unread-counts|TASK131 - Track unread counts]]
- [[TASK132-display-unread-badges|TASK132 - Display badges in sidebar]]

## Technical Notes
- Unread counts are tracked locally per operator thread using read/unread message status
- Badge components display the count next to each operator thread in the sidebar
- Counts reset to zero when the user opens and views the corresponding thread
- The `AvinodeSidebarCard` component integrates unread count display
