# Task ID: TASK070
# Task Name: Color-coded badge for sent/unanswered/quoted/declined/expired
# Parent User Story: [[US034-see-quote-status-badge|US034 - View quote status badge]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement a color-coded status badge for operator quotes that displays the current quote status. Each status has a distinct color for quick visual identification when reviewing multiple quotes.

## Acceptance Criteria
- Badge supports statuses: Sent, Unanswered, Quoted, Declined, Expired
- Color mapping:
  - Sent: Blue (info)
  - Unanswered: Yellow/amber (warning/pending)
  - Quoted: Green (success/positive)
  - Declined: Red (error/negative)
  - Expired: Gray (muted/inactive)
- Badge renders as a compact pill with background color and text
- Text color has sufficient contrast against the background
- Badge handles unknown status values with a neutral gray fallback
- Uses design system color tokens for consistency
- Accessible: proper color contrast ratios (WCAG AA)

## Implementation Details
- **File(s)**: `components/avinode/rfq-flight-card.tsx`
- **Approach**: Define a status-to-color mapping object similar to the FlightRequestStageBadge pattern. The badge component receives a status string prop, looks up the corresponding colors, and renders a styled span/div. Include a default/fallback mapping for unknown statuses. Place the badge prominently in the RFQFlightCard header area.

## Dependencies
- None (standalone UI component within the quote card)
