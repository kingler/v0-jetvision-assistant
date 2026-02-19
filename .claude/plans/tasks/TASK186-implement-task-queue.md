# Task ID: TASK186
# Task Name: Implement Task Queue
# Parent User Story: [[US097-queue-async-task|US097 - Async Task Queue with BullMQ]]
# Status: Done
# Priority: High
# Estimate: 5h

## Description
Implement the AgentTaskQueue using BullMQ for async task processing. The queue supports addTask, startWorker, and stopWorker operations with Redis as the backing store.

## Acceptance Criteria
- AgentTaskQueue wraps BullMQ Queue and Worker
- addTask(task, context, options) adds a job to the Redis-backed queue
- startWorker(processor) starts consuming jobs with the provided handler
- stopWorker() gracefully stops the worker, completing in-progress jobs
- Jobs include task data, context, and processing options
- Failed jobs are automatically retried (configurable attempts, default 3)
- Job completion/failure events are published to the message bus
- Queue name is configurable (default: 'agent-tasks')
- Redis connection uses environment variables (REDIS_HOST, REDIS_PORT)

## Implementation Details
- **File(s)**: agents/coordination/task-queue.ts
- **Approach**: Create AgentTaskQueue class that initializes a BullMQ Queue on construction. addTask calls queue.add() with serialized task and context. startWorker creates a BullMQ Worker with the provided processor function. Include event listeners for 'completed' and 'failed' that publish to the message bus. stopWorker calls worker.close().

## Dependencies
- BullMQ package
- Redis connection (REDIS_HOST, REDIS_PORT env vars)
- [[TASK182-implement-message-bus|TASK182]] (implement-message-bus) for event publishing
