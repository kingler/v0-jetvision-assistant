# User Story ID: US136
# Title: Track Agent Execution Metrics
# Parent Epic: [[EPIC033-analytics-dashboard|EPIC033 - Analytics & Monitoring]]
# Status: Partial
# Priority: Medium
# Story Points: 3

## User Story
As an admin, I want to track agent execution metrics, so I can monitor AI performance.

## Acceptance Criteria

### AC1: Agent Metrics Display
**Given** the JetvisionAgent has processed requests
**When** execution metrics are displayed
**Then** I see execution count, success rate, average latency, and total tokens used

## Tasks
- [[TASK251-log-agent-executions|TASK251 - Log agent execution metrics to database on each run]]
- [[TASK252-metrics-dashboard|TASK252 - Build agent metrics dashboard component]]

## Technical Notes
- BaseAgent.getMetrics() provides per-agent execution data
- Metrics logged: execution count, success/failure count, latency (p50, p95, p99), token usage
- Storage: `agent_metrics` table in Supabase
- Dashboard shows trend charts using recharts library
- Partially implemented; metric collection exists in BaseAgent, dashboard UI pending
