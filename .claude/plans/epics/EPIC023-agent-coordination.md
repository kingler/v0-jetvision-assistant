# Epic ID: EPIC023
# Epic Name: Agent Coordination
# Parent Feature: [[F010-multi-agent-infrastructure|F010 - Agent Infrastructure]]
# Status: Implemented
# Priority: Critical

## Description
Implements the agent-to-agent coordination layer consisting of four subsystems: an EventEmitter-based message bus for pub/sub communication, a handoff manager for task delegation between agents, a BullMQ-backed task queue for async processing with priority levels, and a workflow state machine that enforces valid state transitions throughout the RFP processing lifecycle. Together, these components enable complex multi-step workflows across the agent system.

## Goals
- Enable publish/subscribe messaging between agents for decoupled event-driven communication
- Delegate tasks between agents via structured handoffs with acceptance/rejection semantics
- Process async tasks through a priority queue backed by BullMQ and Redis
- Enforce valid workflow state transitions through a state machine with 11 defined states

## User Stories
- [[US095-publish-subscribe-messages|US095 - Publish and subscribe to agent messages: Agents publish events (task created, completed, failed) and other agents subscribe to react to those events]]
- [[US096-hand-off-task|US096 - Hand off task to another agent: An agent delegates a task to a more specialized agent, which can accept or reject the handoff]]
- [[US097-queue-async-task|US097 - Queue async task with priority: Tasks are enqueued with priority levels (urgent, high, normal, low) for ordered asynchronous processing]]
- [[US098-transition-workflow-state|US098 - Transition workflow state: The workflow state machine transitions through defined states (CREATED -> ANALYZING -> ... -> COMPLETED) with validation]]

## Acceptance Criteria Summary
- Message bus delivers published messages to all matching subscribers within the same process
- Seven message types are supported: TASK_CREATED, TASK_STARTED, TASK_COMPLETED, TASK_FAILED, AGENT_HANDOFF, CONTEXT_UPDATE, ERROR
- Handoff manager tracks pending, accepted, and rejected handoffs with full audit trail
- Task queue processes jobs in priority order with configurable retry attempts
- State machine rejects invalid transitions and throws descriptive errors
- Workflow state machine supports all 11 states with per-state timing metrics
- Subscribers can unsubscribe to prevent memory leaks
- All coordination components follow the singleton pattern

## Technical Scope
- `agents/coordination/message-bus.ts` - EventEmitter-based pub/sub messaging system
- `agents/coordination/handoff-manager.ts` - Task delegation with accept/reject semantics
- `agents/coordination/task-queue.ts` - BullMQ async task queue with priority levels
- `agents/coordination/state-machine.ts` - Workflow state machine with 11 states and transition validation
- `agents/coordination/index.ts` - Barrel exports for coordination module
- Redis dependency for BullMQ task queue persistence
- Terminal-based handoff extensions for Claude Code terminal orchestration
