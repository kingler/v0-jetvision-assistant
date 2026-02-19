# Task ID: TASK142
# Task Name: List Preferred Operators
# Parent User Story: [[US073-list-preferred-operators|US073 - List Preferred Operators]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Implement the ability to list preferred operators by calling the list_preferred_operators MCP tool on the Supabase MCP server. Preferred operators are those marked with a special status indicating they are trusted or frequently used partners.

## Acceptance Criteria
- list_preferred_operators MCP tool returns all operators with preferred status
- Results include company name, contact details, and avinode_operator_id
- Results are sorted alphabetically by company name
- Tool handles the case where no preferred operators exist
- Pagination support for large lists
- Tool is accessible by the JetvisionAgent

## Implementation Details
- **File(s)**: Supabase MCP server (list_preferred_operators tool)
- **Approach**: Define the list_preferred_operators tool that queries operator_profiles where is_preferred = true. Return the list ordered by company_name. Include pagination with limit/offset parameters. Return metadata about total count for UI pagination display.

## Dependencies
- Supabase MCP server infrastructure
- operator_profiles table with is_preferred column
