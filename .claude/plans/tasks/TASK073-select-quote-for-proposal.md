# Task ID: TASK073
# Task Name: Mark quote as selected, enable proposal generation
# Parent User Story: [[US036-select-quote-for-proposal|US036 - Select a quote for proposal generation]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Allow the sales representative to select a specific quote from the comparison view or individual quote card. Selecting a quote marks it as the chosen option and enables the proposal generation workflow.

## Acceptance Criteria
- Each quote card has a "Select for Proposal" action button
- Clicking the button marks the quote as selected in the UI
- Selected quote gets a visual indicator (checkmark, border change, "Selected" badge)
- Only one quote per request can be selected at a time
- Selecting a new quote deselects the previously selected one
- Selection triggers an API call to update the quote status to "selected"
- A "Generate Proposal" button appears or becomes enabled after selection
- User can deselect by clicking again or selecting a different quote

## Implementation Details
- **File(s)**: `components/quotes/`
- **Approach**: Add a selection mechanism to quote cards and the comparison view. Use React state to track the selected quote ID. On selection, call the quotes API to update the status. Show a "Generate Proposal" CTA that becomes enabled only when a quote is selected. The selected state is reflected both visually in the UI and persisted in the database.

## Dependencies
- [[TASK071-implement-quote-comparison|TASK071]] (implement-quote-comparison) - Selection happens within comparison view
- [[TASK075-update-quote-status|TASK075]] (update-quote-status) - API endpoint to persist selection
