# Task ID: TASK089
# Task Name: Create Client Inline from Selection Dialog
# Parent User Story: [[US044-select-customer-for-proposal|US044 - Select or create customer for proposal]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Enable creating a new client directly from within the customer selection dialog without navigating away. The inline form collects minimal required fields (name, email) and optional fields (phone, company), creates the client via the MCP tool or API, and automatically selects the newly created client for the proposal.

## Acceptance Criteria
- Inline form appears within the customer selection dialog
- Required fields: first_name, last_name, email
- Optional fields: phone, company
- Form validation with error messages (email format, required fields)
- Submit creates the client via create_client MCP tool or API
- Newly created client is automatically selected and dialog closes
- Loading state during creation
- Error handling with user-friendly messages
- Cancel returns to search view without creating

## Implementation Details
- **File(s)**: components/customer-selection-dialog.tsx
- **Approach**: Add a "create mode" state toggle within the CustomerSelectionDialog. When active, render a form with Input components for each field. On submit, call the create_client endpoint or MCP tool. On success, set the created client as selected and call the onSelect callback. Use Zod for form validation. Toggle back to search mode on cancel.

## Dependencies
- [[TASK087-customer-selection-dialog|TASK087]] (Customer selection dialog) - parent component
- Supabase MCP server create_client tool or POST /api/clients endpoint
- Clients table must accept new records
