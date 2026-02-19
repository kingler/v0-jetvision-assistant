# Task ID: TASK190
# Task Name: Track State History
# Parent User Story: [[US098-transition-workflow-state|US098 - Workflow State Machine]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement transition history tracking on the WorkflowStateMachine. Every state change is recorded with timestamp, agent ID, and previous/new state for complete audit trail and performance analysis.

## Acceptance Criteria
- getHistory() returns an array of StateTransition records
- Each record includes: fromState, toState, agentId, timestamp, duration (time in previous state)
- History is ordered chronologically (oldest first)
- getStateTimings() returns a map of WorkflowState to total milliseconds spent
- History includes the initial CREATED state entry
- History is immutable from external access (returns a copy)
- getLastTransition() returns the most recent transition record

## Implementation Details
- **File(s)**: agents/coordination/state-machine.ts
- **Approach**: Maintain a private history: StateTransition[] array. On each transition(), push a new record with fromState=currentState, toState=newState, agentId, timestamp=Date.now(), and duration calculated from previous entry's timestamp. getStateTimings() iterates history and sums durations per state. Return copies from getHistory() to prevent external mutation.

## Dependencies
- [[TASK188-implement-state-machine|TASK188]] (implement-state-machine)
- [[TASK189-enforce-transitions|TASK189]] (enforce-transitions)
