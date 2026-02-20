# Task ID: TASK247
# Task Name: MCP Server Health Check
# Parent User Story: [[US133-check-mcp-health|US133 - MCP server connectivity health check]]
# Status: Partial
# Priority: Medium
# Estimate: 2h

## Description
Implement a POST endpoint that tests connectivity to MCP servers (Avinode, Supabase, Gmail) and reports their health status. This allows operators to quickly diagnose which MCP servers are reachable.

## Acceptance Criteria
- POST `/api/mcp/health` tests connectivity to all configured MCP servers
- Response includes per-server status: `{ servers: [{ name, status, latencyMs, error? }] }`
- Status values: "connected", "timeout", "error", "not_configured"
- Timeout for each server check is configurable (default: 5 seconds)
- Request body can optionally specify which servers to check
- Returns 200 with health data regardless of individual server status
- Authentication required (internal diagnostic endpoint)
- Unit tests verify response format and timeout handling

## Implementation Details
- **File(s)**: `app/api/mcp/health/route.ts`
- **Approach**: Create a Next.js POST route handler. For each MCP server, attempt a lightweight ping or list-tools call with a timeout. Measure latency using `performance.now()`. Collect results and return. Use `Promise.allSettled` to handle partial failures gracefully.

## Dependencies
- MCP server configurations must be available
- [[TASK246-health-endpoint|TASK246]] (health-endpoint) for pattern consistency
