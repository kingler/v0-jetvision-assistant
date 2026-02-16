# Task ID: TASK187
# Task Name: Priority Scheduling
# Parent User Story: [[US097-queue-async-task|US097 - Async Task Queue with BullMQ]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement priority-based scheduling for the task queue with four priority levels mapped to BullMQ priority values. Higher priority tasks are processed before lower priority ones.

## Acceptance Criteria
- Four priority levels: urgent(1), high(2), normal(5), low(10)
- Priority is specified in addTask options or defaults to 'normal'
- BullMQ processes lower numeric priority values first
- Tasks with same priority are processed in FIFO order
- Priority can be specified as string ('urgent') or number (1)
- TaskPriority enum maps string names to numeric values
- Priority is included in job metadata for observability

## Implementation Details
- **File(s)**: agents/coordination/task-queue.ts
- **Approach**: Define TaskPriority enum with urgent=1, high=2, normal=5, low=10. In addTask, extract priority from options, resolve string to number via the enum, and pass as BullMQ job priority option. Add a helper function resolvePriority(input: string | number): number that handles both formats.

## Dependencies
- [[TASK186-implement-task-queue|TASK186]] (implement-task-queue)
- BullMQ priority feature
