# User Story ID: US093
# Title: Execute Agent with Context
# Parent Epic: [[EPIC022-agent-core|EPIC022 - Agent Core Framework]]
# Status: Implemented
# Priority: Critical
# Story Points: 5

## User Story
As a developer, I want to execute agents with context, so they have session and conversation data.

## Acceptance Criteria

### AC1: Agent execution with context
**Given** an agent and an `AgentContext` (sessionId, requestId, userId)
**When** `execute()` is called
**Then** the agent processes the task and returns an `AgentResult`

### AC2: Metrics update after execution
**Given** execution completes
**When** metrics update
**Then** `totalExecutions`, `successCount`, and `tokenUsage` are tracked

## Tasks
- [[TASK178-implement-agent-execution|TASK178 - Implement agent execution in BaseAgent]]
- [[TASK179-context-management|TASK179 - Context management with AgentContext]]

## Technical Notes
- `AgentContext` contains: `sessionId`, `requestId`, `userId`, and optional `conversationHistory`
- `AgentResult` contains: `success`, `data`, `error`, `metrics` (latency, tokens)
- Each `execute()` call increments metrics counters and records latency
- Context is immutable during execution; updates create new context instances
- Located in `agents/core/base-agent.ts` and `agents/core/agent-context.ts`
