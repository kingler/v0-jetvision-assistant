# Task ID: TASK189
# Task Name: Enforce State Transitions
# Parent User Story: [[US098-transition-workflow-state|US098 - Workflow State Machine]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Implement transition validation logic that prevents invalid state changes. The canTransition() method checks if a transition is allowed, and transition() throws a descriptive error for invalid attempts.

## Acceptance Criteria
- canTransition(targetState) returns boolean indicating if transition is valid
- transition() throws InvalidTransitionError if canTransition returns false
- Error message includes: current state, attempted state, and list of valid next states
- FAILED state is reachable from any non-terminal state (error recovery)
- CANCELLED state is reachable from any non-terminal state (user cancellation)
- Terminal states (COMPLETED, FAILED, CANCELLED) reject all transitions
- Forward-only transitions enforced (cannot go back to previous states)

## Implementation Details
- **File(s)**: agents/coordination/state-machine.ts
- **Approach**: Define VALID_TRANSITIONS as a const object mapping each state to its allowed next states. canTransition checks if targetState is in VALID_TRANSITIONS[currentState]. transition() calls canTransition first. Create a custom InvalidTransitionError class extending Error with currentState, targetState, and validTransitions properties.

## Dependencies
- [[TASK188-implement-state-machine|TASK188]] (implement-state-machine)
