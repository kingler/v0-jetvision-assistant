# Task ID: TASK134
# Task Name: Save Client Profile
# Parent User Story: [[US068-create-client-profile|US068 - Create Client Profile]]
# Status: Done
# Priority: High
# Estimate: 1h

## Description
Ensure the client profile data is correctly persisted to the client_profiles table in Supabase when the create_client MCP tool is invoked. This includes proper field mapping, timestamp management, and data integrity.

## Acceptance Criteria
- Client profile is saved with all provided fields (company_name, contact_name, email)
- created_at and updated_at timestamps are set automatically
- UUID primary key is generated for the new record
- Row Level Security (RLS) policies allow the insert operation
- Data can be retrieved after creation via get/list operations
- Null handling for optional fields works correctly

## Implementation Details
- **File(s)**: Supabase MCP server (persistence layer)
- **Approach**: Use the Supabase client's insert method with the validated client data. Ensure the table schema includes default values for timestamps and UUID generation. Verify RLS policies permit the service role to insert records. Return the full record including generated fields (id, timestamps).

## Dependencies
- [[TASK133-create-client-mcp|TASK133]] (create_client MCP tool provides the data)
- Database migration for client_profiles table
