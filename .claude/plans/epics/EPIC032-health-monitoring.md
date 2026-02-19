# Epic ID: EPIC032
# Epic Name: System Health Monitoring
# Parent Feature: [[F014-analytics-monitoring|F014 - Observability and Analytics]]
# Status: Partial
# Priority: Medium

## Description
System health monitoring infrastructure that tracks the operational status of agents, MCP server connections, circuit breakers, and external integration auth states. Provides API endpoints for health checks and diagnostic scripts for troubleshooting connectivity and authentication issues.

## Goals
- Monitor circuit breaker status across all external service integrations
- Track MCP server connectivity and response times
- Provide authentication diagnostics for Avinode, Gmail, and Supabase
- Surface health status through API endpoints consumable by dashboards and alerts

## User Stories
- [[US132-view-circuit-breaker-status|US132 - View circuit breaker status (closed, open, half-open) for each integration]]
- [[US133-check-mcp-health|US133 - Check MCP server health including connectivity and tool availability]]
- [[US134-run-auth-diagnostics|US134 - Run authentication diagnostics to verify API keys and token validity]]

## Acceptance Criteria Summary
- Health API returns status for each circuit breaker with failure counts and last state change
- MCP health check verifies server process is running and responds to tool list requests
- Auth diagnostics validate credentials without making destructive API calls
- Health endpoints return within 5 seconds with timeout handling for unresponsive services
- Responses follow standard health check format (status, components, timestamp)
- Diagnostic scripts can be run from CLI for local troubleshooting

## Technical Scope
- app/api/health/circuit-breakers/ - Circuit breaker status API endpoints
- app/api/mcp/health/ - MCP server health check endpoints
- scripts/diagnostics/ - CLI diagnostic scripts for auth and connectivity
- lib/utils/circuit-breaker.ts - Circuit breaker implementation with state tracking
- agents/monitoring/ - Agent health metrics collection (planned)
