# User Story ID: US097
# Title: Queue Async Tasks with Priority
# Parent Epic: [[EPIC023-agent-coordination|EPIC023 - Agent Coordination]]
# Status: Implemented
# Priority: High
# Story Points: 5

## User Story
As a developer, I want to queue async tasks with priority, so work is processed in order.

## Acceptance Criteria

### AC1: Priority-based processing
**Given** a task with priority "urgent"
**When** queued alongside "normal" and "low" priority tasks
**Then** it processes before the lower-priority tasks

### AC2: Retry with exponential backoff
**Given** a task fails during execution
**When** retried
**Then** exponential backoff applies with up to 3 attempts

## Tasks
- [[TASK186-implement-task-queue|TASK186 - Implement AgentTaskQueue with BullMQ]]
- [[TASK187-priority-scheduling|TASK187 - Priority-based scheduling with retry logic]]

## Technical Notes
- `AgentTaskQueue` wraps BullMQ for Redis-backed async processing
- Priority levels: urgent (1), high (2), normal (5), low (10)
- Retry backoff: exponential with base delay of 1 second
- Requires Redis connection; configured via `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- Workers process jobs via `queue.startWorker(handler)` callback
- Located in `agents/coordination/task-queue.ts`
