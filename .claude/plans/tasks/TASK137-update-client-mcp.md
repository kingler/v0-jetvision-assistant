# Task ID: TASK137
# Task Name: Update Client via MCP
# Parent User Story: [[US070-update-client-info|US070 - Update Client Profile]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Implement the ability to update an existing client profile by calling the update_client MCP tool on the Supabase MCP server. The tool should accept a client ID and the fields to update.

## Acceptance Criteria
- update_client MCP tool accepts client_id and updatable fields
- Only provided fields are updated (partial update support)
- updated_at timestamp is refreshed on each update
- Non-existent client_id returns a clear error
- Email uniqueness is enforced on update
- Tool returns the updated client profile
- Audit trail of changes is maintained if applicable

## Implementation Details
- **File(s)**: Supabase MCP server (update_client tool)
- **Approach**: Define the update_client tool with client_id as a required parameter and optional fields for company_name, contact_name, email, phone, and notes. Use Supabase's update method with a `match` on client_id. Handle unique constraint violations on email. Return the updated record. Set updated_at to current timestamp.

## Dependencies
- Supabase MCP server infrastructure
- [[TASK133-create-client-mcp|TASK133]] (create_client for initial record creation)
