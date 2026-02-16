# Task ID: TASK138
# Task Name: Open Customer Selection Dialog
# Parent User Story: [[US071-select-client-for-proposal|US071 - Link Client to Proposal]]
# Status: Done
# Priority: High
# Estimate: 1h

## Description
Trigger the CustomerSelectionDialog from the proposal generation flow. When the user initiates a proposal and no client is associated, the dialog should open to allow client selection before proceeding.

## Acceptance Criteria
- CustomerSelectionDialog opens when triggered from proposal flow
- Dialog can be triggered programmatically or via UI action
- Dialog provides search, select, and create-new-client options
- Selected client data is passed back to the calling component
- Dialog closes on selection or cancel
- Cancel does not affect the proposal state

## Implementation Details
- **File(s)**: components/chat-interface.tsx
- **Approach**: Add state management for the CustomerSelectionDialog visibility (isOpen). Trigger the dialog when the proposal flow requires a client and none is set. Pass an onSelect callback that receives the chosen client profile. Pass an onCancel callback to close without selection. Integrate with the chat interface's proposal workflow state.

## Dependencies
- [[TASK136-display-search-results|TASK136]] (customer selection dialog with search results)
