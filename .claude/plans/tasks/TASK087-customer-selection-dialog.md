# Task ID: TASK087
# Task Name: Customer Selection Dialog Component
# Parent User Story: [[US044-select-customer-for-proposal|US044 - Select or create customer for proposal]]
# Status: Done
# Priority: High
# Estimate: 5h

## Description
Create a dialog component that enables sales representatives to search for existing clients, select one for the proposal, or create a new client inline. The dialog includes a search input with debounced search, a scrollable results list, and a "Create New Client" option that expands an inline form.

## Acceptance Criteria
- Dialog opens when triggered from proposal workflow
- Search input with debounced query (300ms) searches clients by name, email, or company
- Displays search results in a scrollable list with client name, email, and company
- Clicking a result selects that client and closes the dialog
- "Create New Client" button expands an inline creation form
- Inline form includes: first_name, last_name, email, phone, company (minimum fields)
- Created client is automatically selected after creation
- Empty state shown when no search results found
- Loading state during search
- Accessible with keyboard navigation and screen reader support

## Implementation Details
- **File(s)**: components/customer-selection-dialog.tsx
- **Approach**: Build using the design system Dialog component. Use useState for search query and selected client. Implement debounced search with useEffect and a timer. Call the search clients API (TASK088) on query change. Render results as a list of clickable items. Toggle between search view and create form view. Use the design system Input, Button, and Form components.

## Dependencies
- [[TASK088-search-clients-mcp|TASK088]] (Search clients MCP) - backend search functionality
- [[TASK089-create-client-inline|TASK089]] (Create client inline) - inline client creation
- Design system Dialog, Input, Button components
