# Task ID: TASK088
# Task Name: Search Clients via MCP Tool
# Parent User Story: [[US044-select-customer-for-proposal|US044 - Select or create customer for proposal]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement client search functionality by calling the list_clients MCP tool from the Supabase MCP server with a search query. This enables the customer selection dialog to find existing clients by name, email, or company name with partial matching.

## Acceptance Criteria
- Calls list_clients MCP tool with search parameters
- Supports searching by name (first_name, last_name), email, and company
- Returns matching client records with id, name, email, phone, company
- Handles empty results gracefully (returns empty array)
- Handles MCP tool errors with appropriate error messages
- Supports pagination for large result sets (limit/offset)
- Search is case-insensitive

## Implementation Details
- **File(s)**: Supabase MCP server tool (list_clients with search filter)
- **Approach**: The list_clients MCP tool already exists in the Supabase MCP server. Ensure it accepts a search/filter parameter that performs ILIKE matching across name and email fields. The frontend calls this through the agent's tool execution pipeline. If the MCP tool doesn't support search, add a search_clients tool or enhance list_clients with query parameters.

## Dependencies
- Supabase MCP server must be running and accessible
- Clients table must exist in Supabase with appropriate columns
- MCP tool registration in the Jetvision agent
