# Task ID: TASK136
# Task Name: Display Client Search Results
# Parent User Story: [[US069-search-clients|US069 - Search Client Profiles]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
Display client search results in the CustomerSelectionDialog component, showing company name, contact name, and email for each matching client profile.

## Acceptance Criteria
- Search results are displayed in a list/table format
- Each result shows company_name, contact_name, and email
- Results are clickable/selectable
- Loading state shown while search is in progress
- Empty state shown when no results match
- Search input allows real-time filtering with debounce
- Selected client is highlighted visually

## Implementation Details
- **File(s)**: components/customer-selection-dialog.tsx
- **Approach**: Render search results as a list of selectable items within the dialog. Each item displays the three key fields in a structured layout. Use debounced input to trigger search API calls. Show a spinner during loading and a "No results found" message for empty results. On selection, highlight the item and enable the confirm/select button.

## Dependencies
- [[TASK135-search-clients-mcp-list|TASK135]] (search clients MCP provides the data)
