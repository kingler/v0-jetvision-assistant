# Task ID: TASK195
# Task Name: Supabase MCP Server
# Parent User Story: [[US101-connect-supabase-mcp|US101 - Supabase CRM MCP Server]]
# Status: Done
# Priority: High
# Estimate: 5h

## Description
Implement the Supabase MCP server that provides 14 CRM tools for database operations. The server wraps Supabase client calls and exposes them as MCP-compatible tools for agents to manage clients, requests, quotes, operators, proposals, contracts, and payments.

## Acceptance Criteria
- MCP server starts on stdio transport
- Supabase client initialized with service role key for full access
- 14 CRM tools registered with proper schemas
- All database operations use parameterized queries (no SQL injection)
- Row Level Security is respected where applicable
- Error handling for database constraints, not found, and permission errors
- Connection pooling for efficient database access
- Response pagination for list operations (default limit 50)

## Implementation Details
- **File(s)**: mcp-servers/supabase/
- **Approach**: Create MCP Server with Supabase client initialized using SUPABASE_SERVICE_ROLE_KEY. Each tool maps to one or more Supabase operations (select, insert, update). Use the Supabase JS client's query builder for type-safe operations. Include input validation before database calls.

## Dependencies
- @supabase/supabase-js package
- Supabase project with CRM tables
- Database schema with proper constraints and indexes
