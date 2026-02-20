# Task ID: TASK135
# Task Name: Search Clients via MCP
# Parent User Story: [[US069-search-clients|US069 - Search Client Profiles]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement client search functionality by calling the list_clients MCP tool with a search parameter. The search should match against company name, contact name, and email fields to return relevant client profiles.

## Acceptance Criteria
- list_clients MCP tool accepts an optional search parameter
- Search matches against company_name, contact_name, and email fields
- Search is case-insensitive
- Partial matches are supported (e.g., "jet" matches "JetBlue")
- Results are ordered by relevance or recency
- Empty search returns all clients (with pagination)
- Results include all client profile fields needed for display

## Implementation Details
- **File(s)**: Supabase MCP server (list_clients tool)
- **Approach**: Implement the list_clients tool with an optional search parameter. When provided, use Supabase's `ilike` or `textSearch` to filter across company_name, contact_name, and email columns. Use `or` to combine the filter conditions. Apply reasonable pagination defaults (limit 20). Order results by updated_at descending.

## Dependencies
- Supabase MCP server infrastructure
- client_profiles table populated with data
