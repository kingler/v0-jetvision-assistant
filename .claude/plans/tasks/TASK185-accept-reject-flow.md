# Task ID: TASK185
# Task Name: Accept and Reject Handoff Flow
# Parent User Story: [[US096-hand-off-task|US096 - Agent Task Handoff]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Implement the acceptHandoff and rejectHandoff methods on the HandoffManager that allow target agents to accept or decline delegated tasks with reason tracking.

## Acceptance Criteria
- acceptHandoff(taskId, agentId) marks the handoff as accepted
- Only the target agent (matching agentId) can accept a handoff
- Accepting publishes TASK_STARTED on the message bus
- rejectHandoff(taskId, agentId, reason) marks as rejected with reason string
- Rejecting publishes TASK_FAILED with the rejection reason
- Accepting a non-existent or already-resolved handoff throws an error
- Rejecting a non-existent or already-resolved handoff throws an error
- Handoff record is moved from pending to history after resolution
- Reason is stored in the handoff record for auditing

## Implementation Details
- **File(s)**: agents/coordination/handoff-manager.ts
- **Approach**: acceptHandoff validates the task exists in pending map and agentId matches toAgent, updates status to 'accepted', moves to history, publishes TASK_STARTED. rejectHandoff similarly validates, updates status to 'rejected' with reason, moves to history, publishes TASK_FAILED. Both clear the timeout timer.

## Dependencies
- [[TASK184-implement-handoff-manager|TASK184]] (implement-handoff-manager)
- [[TASK182-implement-message-bus|TASK182]] (implement-message-bus)
