# Epic ID: EPIC033
# Epic Name: Analytics and Metrics Dashboard
# Parent Feature: [[F014-analytics-monitoring|F014 - Observability and Analytics]]
# Status: Partial
# Priority: Medium

## Description
Analytics and metrics visualization system that tracks both business KPIs (quotes received, proposals sent, conversion rates) and system performance metrics (agent execution times, error rates, API latency). Integrates with Vercel Analytics for web vitals and Sentry for error tracking and performance monitoring.

## Goals
- Track agent execution metrics including duration, success rate, and tool usage
- Monitor business KPIs such as quotes received, proposals sent, and response times
- Capture and report errors with full context via Sentry integration
- Provide API endpoints for metrics data consumed by dashboard components

## User Stories
- [[US135-view-analytics-summary|US135 - View analytics summary with key business and system metrics]]
- [[US136-track-agent-execution-metrics|US136 - Track per-agent execution metrics (duration, success/failure, tool calls)]]
- [[US137-view-error-reports|US137 - View error reports and performance traces via Sentry dashboard]]

## Acceptance Criteria Summary
- Analytics API returns aggregated metrics for configurable time periods
- Agent metrics track total executions, average duration, error rate, and tool call distribution
- Business KPIs include quotes per day, average response time, and conversion funnel
- Sentry captures unhandled errors with session context and breadcrumbs
- Vercel Analytics tracks Core Web Vitals (LCP, FID, CLS) automatically
- Metrics data is queryable by date range, agent type, and session ID

## Technical Scope
- app/api/analytics/ - Analytics data API endpoints
- @vercel/analytics - Web vitals and page view tracking
- @sentry/nextjs - Error tracking, performance monitoring, session replay
- agents/monitoring/ - Agent-level metrics collection and aggregation (planned)
- lib/utils/metrics.ts - Metrics utility functions and aggregation helpers
