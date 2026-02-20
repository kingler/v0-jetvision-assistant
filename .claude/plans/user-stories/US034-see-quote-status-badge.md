# User Story ID: US034
# Title: See Quote Status Badge
# Parent Epic: [[EPIC007-quote-reception-display|EPIC007 - Quote Management]]
# Status: Implemented
# Priority: High
# Story Points: 2

## User Story
As an ISO agent, I want to see quote status badges, so that I know which quotes need attention.

## Acceptance Criteria

### AC1: Color-Coded Status Badges
**Given** quotes have statuses (sent/unanswered/quoted/declined/expired)
**When** they render
**Then** each shows a color-coded badge

## Tasks
- [[TASK070-implement-quote-status-badge|TASK070 - Build color-coded quote status badge component supporting sent, unanswered, quoted, declined, and expired statuses]]

## Technical Notes
- Quote status values and their color mappings:
  - **sent** (blue) - RFQ has been sent to the operator
  - **unanswered** (gray) - Operator has not yet responded
  - **quoted** (green) - Operator has submitted a quote
  - **declined** (red) - Operator declined to quote
  - **expired** (amber) - Quote or RFQ has expired
- The badge component uses design system color tokens for consistent theming
- Badges are displayed on individual quote cards, in the quote list view, and in the comparison grid
- Status transitions are updated in real-time as webhook events arrive
- The badge component follows the same pattern as FlightRequestStageBadge for visual consistency
