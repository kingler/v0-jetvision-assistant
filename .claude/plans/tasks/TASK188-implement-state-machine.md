# Task ID: TASK188
# Task Name: Implement State Machine
# Parent User Story: [[US098-transition-workflow-state|US098 - Workflow State Machine]]
# Status: Done
# Priority: Critical
# Estimate: 5h

## Description
Implement the WorkflowStateMachine with 11 workflow states, valid transition rules, and transition history tracking. The state machine enforces the RFP processing workflow order.

## Acceptance Criteria
- WorkflowStateMachine supports 11 states: CREATED, ANALYZING, FETCHING_CLIENT_DATA, SEARCHING_FLIGHTS, AWAITING_QUOTES, ANALYZING_PROPOSALS, GENERATING_EMAIL, SENDING_PROPOSAL, COMPLETED, FAILED, CANCELLED
- Constructor takes a requestId and initializes to CREATED state
- transition(newState, agentId) moves to the new state if valid
- getState() returns current WorkflowState
- isInProgress() returns true for non-terminal states
- isTerminal() returns true for COMPLETED, FAILED, CANCELLED
- getDuration() returns milliseconds since creation
- State machine is immutable once in a terminal state

## Implementation Details
- **File(s)**: agents/coordination/state-machine.ts
- **Approach**: Define WorkflowState enum and a VALID_TRANSITIONS map (Map<WorkflowState, WorkflowState[]>) that defines allowed next states for each state. transition() checks VALID_TRANSITIONS, throws if invalid, updates currentState, and records in history. Terminal states have no valid transitions. Include WorkflowStateManager singleton for managing multiple workflows.

## Dependencies
- WorkflowState enum definition
- Message bus for state change notifications (optional)
