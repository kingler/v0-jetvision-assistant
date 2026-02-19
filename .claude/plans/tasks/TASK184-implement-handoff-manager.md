# Task ID: TASK184
# Task Name: Implement Handoff Manager
# Parent User Story: [[US096-hand-off-task|US096 - Agent Task Handoff]]
# Status: Done
# Priority: High
# Estimate: 5h

## Description
Implement the HandoffManager singleton that manages task delegation between agents. The handoff flow includes initiating a handoff, tracking pending handoffs, and routing to the target agent.

## Acceptance Criteria
- HandoffManager uses singleton pattern
- handoff(config) creates a pending handoff with fromAgent, toAgent, task, context, reason
- Handoff is published to message bus as AGENT_HANDOFF message
- Pending handoffs are tracked by task ID
- getPendingHandoffs() returns all unaccepted handoffs
- getPendingHandoffs(agentId) returns handoffs for a specific target agent
- Handoff timeout (configurable, default 60s) auto-fails if not accepted
- getHandoffHistory() returns completed/failed handoffs for auditing

## Implementation Details
- **File(s)**: agents/coordination/handoff-manager.ts
- **Approach**: Use a Map<string, HandoffRecord> to track pending handoffs. handoff() creates a record, publishes AGENT_HANDOFF via message bus, and sets a timeout. Include HandoffRecord with: id, fromAgent, toAgent, task, context, reason, status, createdAt. Status transitions: pending -> accepted/rejected/timed_out.

## Dependencies
- [[TASK182-implement-message-bus|TASK182]] (implement-message-bus)
- Task and HandoffConfig types
