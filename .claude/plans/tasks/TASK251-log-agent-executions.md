# Task ID: TASK251
# Task Name: Log Agent Executions
# Parent User Story: [[US136-track-agent-execution-metrics|US136 - Log agent executions to database]]
# Status: Partial
# Priority: Medium
# Estimate: 2h

## Description
Extend the BaseAgent class to log execution metadata (start time, end time, duration, tool calls, token usage, success/failure) to an `agent_executions` table in the database for monitoring and debugging purposes.

## Acceptance Criteria
- Every agent execution is logged to the `agent_executions` table
- Log entry includes: agent ID, session ID, start time, end time, duration
- Log entry includes: tool calls made (names and count), token usage, model used
- Log entry includes: success/failure status and error message if failed
- Logging is non-blocking (does not delay agent response)
- Failed logging attempts are caught and logged to console (do not crash agent)
- Retention policy: entries older than 90 days can be pruned
- Unit tests verify logging calls and error handling

## Implementation Details
- **File(s)**: `agents/core/base-agent.ts`
- **Approach**: Add a `logExecution` method to BaseAgent that captures execution metrics. Call it in a `finally` block after `execute()` completes. Use fire-and-forget Supabase insert. Include a `toLogEntry()` helper that serializes the execution context into the table format.

## Dependencies
- `agent_executions` table must exist in the database schema
- [[TASK252-metrics-dashboard|TASK252]] (metrics-dashboard) consumes the logged data
