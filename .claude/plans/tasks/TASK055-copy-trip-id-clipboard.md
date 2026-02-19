# Task ID: TASK055
# Task Name: Copy button copies trip ID, shows toast
# Parent User Story: [[US024-copy-trip-id|US024 - Copy trip ID to clipboard]]
# Status: Done
# Priority: Low
# Estimate: 1h

## Description
Add a copy-to-clipboard button next to the trip ID display in the TripSummaryCard. When clicked, the trip ID is copied to the user's clipboard and a toast notification confirms the action.

## Acceptance Criteria
- Copy icon button appears next to the trip ID text
- Clicking the button copies the trip ID string to the clipboard
- A toast notification appears confirming "Trip ID copied to clipboard"
- Toast auto-dismisses after 2-3 seconds
- Button shows a brief visual feedback (icon change to checkmark)
- Uses the Clipboard API (navigator.clipboard.writeText)
- Graceful fallback if Clipboard API is unavailable
- Accessible: proper tooltip and ARIA label on the button

## Implementation Details
- **File(s)**: `components/avinode/trip-summary-card.tsx`
- **Approach**: Add a small icon button (copy icon from the icon library) next to the trip ID display. On click, use `navigator.clipboard.writeText()` to copy the trip ID, then show a toast using the app's toast system. Include a brief icon swap animation (copy → check) for immediate visual feedback.

## Dependencies
- [[TASK053-implement-trip-summary-card|TASK053]] (implement-trip-summary-card) - Trip ID is displayed in this card
