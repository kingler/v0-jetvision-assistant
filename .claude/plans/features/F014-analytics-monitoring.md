# Feature ID: F014
# Feature Name: Analytics & Monitoring
# Status: Partial
# Priority: Medium

## Description
System monitoring, analytics, and health checking infrastructure for agents, MCP servers, and third-party integrations. The monitoring layer tracks agent execution metrics (token usage, latency, success rates), exposes circuit breaker health endpoints for resilience visibility, and provides MCP server health checks. Error tracking is handled via Sentry integration, while Vercel Analytics captures frontend performance metrics. An agent monitoring dashboard is available behind a feature flag.

## Business Value
Operational visibility is essential for maintaining the reliability of a multi-agent system that brokers depend on for time-sensitive charter flight operations. When an MCP server goes down, an agent starts producing errors, or latency spikes, the monitoring infrastructure enables rapid detection and diagnosis. Circuit breaker health endpoints prevent cascading failures by exposing degraded service states before they impact end users. Analytics data also informs optimization priorities -- identifying which agent tools are most used, where latency bottlenecks occur, and which integrations are least reliable.

## Key Capabilities
- Agent execution metrics tracking including token consumption, response latency, success/failure rates, and tool call frequency
- Circuit breaker health endpoint exposing the current state (closed/open/half-open) of each external service circuit breaker
- MCP server health checks verifying connectivity and response times for Avinode, Supabase, and Gmail MCP servers
- System diagnostics for authentication errors, configuration issues, and environment validation
- Vercel Analytics integration for frontend web vitals, page views, and user interaction tracking
- Sentry error tracking with source maps for production error capture, session replay, and performance monitoring
- Agent monitoring dashboard (feature-flagged) providing a consolidated view of agent health, active sessions, and execution history

## Related Epics
- [[EPIC032-health-monitoring|EPIC032 - Health & Monitoring]]
- [[EPIC033-analytics-dashboard|EPIC033 - Analytics Dashboard]]

## Dependencies
- [[F010-multi-agent-infrastructure|F010 - Multi-Agent System (provides the agent execution layer that monitoring instruments)]]

## Technical Components
- `app/api/health/circuit-breakers/` - API route exposing circuit breaker states for all external service integrations
- `app/api/mcp/health/` - API route for MCP server health checks (Avinode, Supabase, Gmail connectivity and latency)
- `@sentry/nextjs` - Sentry SDK integration for error tracking, performance monitoring, and session replay
- `@vercel/analytics` - Vercel Analytics SDK for frontend web vitals and usage metrics
- `scripts/diagnostics/` - CLI diagnostic scripts for environment validation, auth testing, and configuration verification
