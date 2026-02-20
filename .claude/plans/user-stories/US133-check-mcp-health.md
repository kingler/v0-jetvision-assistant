# User Story ID: US133
# Title: Check MCP Server Health
# Parent Epic: [[EPIC032-health-monitoring|EPIC032 - System Health & Diagnostics]]
# Status: Partial
# Priority: Medium
# Story Points: 2

## User Story
As an admin, I want to check MCP server health, so I know if tools are available.

## Acceptance Criteria

### AC1: MCP Server Health Status
**Given** MCP servers are configured (Avinode, Supabase, Gmail)
**When** a health check runs against each server
**Then** I see connected/disconnected status for each MCP server

## Tasks
- [[TASK247-mcp-health-check|TASK247 - Implement MCP health check endpoint and status display]]

## Technical Notes
- Health check pings each MCP server's stdio or HTTP transport
- Servers checked: Avinode MCP, Supabase MCP, Gmail MCP
- Endpoint: GET `/api/health/mcp`
- Response includes: server name, status, last ping time, tool count
- Partially implemented; automated periodic checks and admin UI pending
