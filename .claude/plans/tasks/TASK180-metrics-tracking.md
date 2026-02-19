# Task ID: TASK180
# Task Name: Metrics Tracking
# Parent User Story: [[US094-track-agent-metrics|US094 - Agent Metrics and Observability]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement metrics tracking within BaseAgent to record execution statistics including total executions, successes, failures, latency, and token usage. Metrics are updated automatically during each execute() call.

## Acceptance Criteria
- Track totalExecutions counter (incremented on every execute call)
- Track successCount and failureCount separately
- Track averageLatencyMs and lastLatencyMs for performance monitoring
- Track totalTokensUsed and breakdown by prompt/completion tokens
- Track lastExecutionAt timestamp
- Metrics are updated atomically during execution
- Metrics survive across multiple execute() calls (cumulative)
- Metrics can be reset via resetMetrics() for testing

## Implementation Details
- **File(s)**: agents/core/base-agent.ts
- **Approach**: Add a private `metrics: AgentMetrics` property initialized with zeros. In execute(), wrap the main logic with timing (Date.now() before/after). On success, increment successCount and update latency. On failure, increment failureCount. Extract token usage from OpenAI response headers/body. Update averageLatencyMs using running average formula.

## Dependencies
- [[TASK178-implement-agent-execution|TASK178]] (implement-agent-execution)
- AgentMetrics type definition in agents/core/types.ts
