# User Story ID: US098
# Title: Enforce Workflow State Transitions
# Parent Epic: [[EPIC023-agent-coordination|EPIC023 - Agent Coordination]]
# Status: Implemented
# Priority: Critical
# Story Points: 5

## User Story
As a developer, I want to enforce workflow state transitions, so invalid states are prevented.

## Acceptance Criteria

### AC1: Valid state transition
**Given** a workflow in state `ANALYZING`
**When** transitioning to `SEARCHING_FLIGHTS`
**Then** the transition succeeds

### AC2: Terminal state enforcement
**Given** a workflow in state `COMPLETED`
**When** attempting any transition
**Then** it throws an error because `COMPLETED` is a terminal state

### AC3: Transition history
**Given** a workflow with state history
**When** queried
**Then** all state transitions with timestamps and triggering agents are returned

## Tasks
- [[TASK188-implement-state-machine|TASK188 - Implement WorkflowStateMachine]]
- [[TASK189-enforce-transitions|TASK189 - Enforce valid transition rules]]
- [[TASK190-track-state-history|TASK190 - Track state transition history with timestamps]]

## Technical Notes
- 11 workflow states: CREATED, ANALYZING, FETCHING_CLIENT_DATA, SEARCHING_FLIGHTS, AWAITING_QUOTES, ANALYZING_PROPOSALS, GENERATING_EMAIL, SENDING_PROPOSAL, COMPLETED, FAILED, CANCELLED
- Terminal states: COMPLETED, FAILED, CANCELLED (no transitions allowed)
- State machine validates transitions against an allowed-transitions map
- Each transition records: `fromState`, `toState`, `triggeredBy` (agent ID), `timestamp`
- `getStateTimings()` returns duration spent in each state
- Located in `agents/coordination/state-machine.ts`
