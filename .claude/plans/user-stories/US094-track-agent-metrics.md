# User Story ID: US094
# Title: Track Agent Metrics
# Parent Epic: [[EPIC022-agent-core|EPIC022 - Agent Core Framework]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As a developer, I want to track agent metrics, so I can monitor performance.

## Acceptance Criteria

### AC1: Metrics exposure
**Given** an agent has executed one or more tasks
**When** `getMetrics()` is called
**Then** I see execution count, success rate, average latency, and token usage

## Tasks
- [[TASK180-metrics-tracking|TASK180 - Implement metrics tracking in BaseAgent]]
- [[TASK181-expose-metrics-api|TASK181 - Expose metrics via getMetrics() API]]

## Technical Notes
- `AgentMetrics` interface tracks: `totalExecutions`, `successCount`, `failureCount`, `avgLatencyMs`, `totalTokens`
- Metrics are updated automatically after each `execute()` call
- Latency is measured using `performance.now()` for sub-millisecond accuracy
- Token usage is extracted from OpenAI API response `usage` field
- Metrics are per-agent instance; no persistence across restarts
