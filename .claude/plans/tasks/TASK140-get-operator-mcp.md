# Task ID: TASK140
# Task Name: Get Operator via MCP
# Parent User Story: [[US072-view-operator-profile|US072 - View Operator Profile]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Implement the ability to retrieve an operator profile by calling the get_operator MCP tool on the Supabase MCP server. The tool should return the full operator profile including company details, contact information, and any associated metadata.

## Acceptance Criteria
- get_operator MCP tool accepts operator_id as a parameter
- Returns full operator profile with all fields
- Returns null/error for non-existent operator_id
- Response includes avinode_operator_id if available
- Response includes operator company name, contact details
- Tool is registered and accessible by the JetvisionAgent

## Implementation Details
- **File(s)**: Supabase MCP server (get_operator tool)
- **Approach**: Define the get_operator tool with operator_id as a required parameter. Query the operator_profiles table by ID. Return the full record or a descriptive error if not found. Include any related data (e.g., preferred status, historical quote count) if available through joins.

## Dependencies
- Supabase MCP server infrastructure
- operator_profiles table with data (TASK122, TASK144)
