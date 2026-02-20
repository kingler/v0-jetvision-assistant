# User Story ID: US096
# Title: Hand Off Tasks Between Agents
# Parent Epic: [[EPIC023-agent-coordination|EPIC023 - Agent Coordination]]
# Status: Implemented
# Priority: High
# Story Points: 5

## User Story
As a developer, I want to hand off tasks between agents, so work can be delegated.

## Acceptance Criteria

### AC1: Task handoff to pending queue
**Given** agent A has a task
**When** it hands off to agent B
**Then** the task appears in agent B's pending queue

### AC2: Accept handoff
**Given** a pending handoff exists
**When** agent B accepts the handoff
**Then** the task is assigned to agent B and execution begins

### AC3: Reject handoff
**Given** a pending handoff exists
**When** agent B rejects the handoff
**Then** a reason is recorded and the task returns to the source agent

## Tasks
- [[TASK184-implement-handoff-manager|TASK184 - Implement HandoffManager singleton]]
- [[TASK185-accept-reject-flow|TASK185 - Accept and reject handoff flow]]

## Technical Notes
- `HandoffManager` tracks pending, active, and completed handoffs
- Handoff includes: `fromAgent`, `toAgent`, `task`, `context`, `reason`
- Handoff events are published to the `MessageBus` as `AGENT_HANDOFF` messages
- Timeout configurable per handoff; defaults to 5 minutes for acceptance
- Located in `agents/coordination/handoff-manager.ts`
