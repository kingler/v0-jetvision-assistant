# User Story ID: US101
# Title: Connect to Supabase MCP Server
# Parent Epic: [[EPIC024-mcp-server-infrastructure|EPIC024 - MCP Server Integration]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As a developer, I want to connect to the Supabase MCP server, so database tools are available.

## Acceptance Criteria

### AC1: CRM tools registration
**Given** Supabase credentials are configured
**When** the MCP server connects
**Then** CRM tools for clients, requests, quotes, and operators are registered

## Tasks
- [[TASK195-supabase-mcp-server|TASK195 - Implement Supabase MCP server]]
- [[TASK196-register-database-tools|TASK196 - Register database tools for CRM operations]]

## Technical Notes
- Supabase MCP server located in `mcp-servers/supabase/`
- Provides 12 database tools covering all CRM entities
- Tools include CRUD operations for: clients, flight_requests, quotes, operators, iso_agents
- Uses `SUPABASE_SERVICE_ROLE_KEY` for elevated access (bypasses RLS)
- Query tools support filtering, pagination, and sorting
- Server connects via stdio transport configured in `.mcp.json`
