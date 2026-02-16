# Task ID: TASK133
# Task Name: Create Client via MCP
# Parent User Story: [[US068-create-client-profile|US068 - Create Client Profile]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement the ability to create a new client profile by calling the create_client MCP tool on the Supabase MCP server. The tool should accept company_name, contact_name, and email as parameters and create a record in the client_profiles table.

## Acceptance Criteria
- create_client MCP tool is callable with company_name, contact_name, and email
- Tool validates required fields before creating the record
- Duplicate email addresses are detected and handled gracefully
- Successful creation returns the new client profile with ID
- Error responses include meaningful messages for validation failures
- Tool is registered in the JetvisionAgent's tool set

## Implementation Details
- **File(s)**: Supabase MCP server (create_client tool)
- **Approach**: Define the create_client tool in the Supabase MCP server with input schema validation for company_name (required), contact_name (required), and email (required, valid format). Execute a Supabase insert into client_profiles. Handle unique constraint violations on email. Return the created record or error details.

## Dependencies
- Supabase MCP server infrastructure
- client_profiles table in database
