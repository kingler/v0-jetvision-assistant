# Task ID: TASK181
# Task Name: Expose Metrics API
# Parent User Story: [[US094-track-agent-metrics|US094 - Agent Metrics and Observability]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Expose the collected agent metrics through a getMetrics() public method on BaseAgent. The method returns a snapshot of the current AgentMetrics object that can be used by monitoring dashboards and logging systems.

## Acceptance Criteria
- getMetrics() returns a readonly AgentMetrics object
- Returned object is a snapshot (copy), not a reference to internal state
- AgentMetrics includes: totalExecutions, successCount, failureCount, averageLatencyMs, lastLatencyMs, totalTokensUsed, promptTokens, completionTokens, lastExecutionAt
- Method is callable at any time without side effects
- Metrics are JSON-serializable for logging and API responses
- getMetrics() returns zero-initialized metrics before first execution

## Implementation Details
- **File(s)**: agents/core/base-agent.ts
- **Approach**: Implement getMetrics() as a public method that returns a deep copy (structuredClone or spread) of the internal metrics object. Define the AgentMetrics interface in types.ts with all required fields. Ensure the return type is Readonly<AgentMetrics> to prevent external mutation.

## Dependencies
- [[TASK180-metrics-tracking|TASK180]] (metrics-tracking)
