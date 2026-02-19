# User Story ID: US095
# Title: Publish/Subscribe Messages Between Agents
# Parent Epic: [[EPIC023-agent-coordination|EPIC023 - Agent Coordination]]
# Status: Implemented
# Priority: Critical
# Story Points: 5

## User Story
As a developer, I want pub/sub messaging between agents, so they can communicate asynchronously.

## Acceptance Criteria

### AC1: Message delivery to subscribers
**Given** a subscriber exists for a message type
**When** a message is published
**Then** the handler receives it with correct type, source agent, target agent, and payload

### AC2: Message type filtering
**Given** 7 message types (TASK_CREATED, TASK_STARTED, TASK_COMPLETED, TASK_FAILED, AGENT_HANDOFF, CONTEXT_UPDATE, ERROR)
**When** a message is published
**Then** only subscribers matching the message type receive it

## Tasks
- [[TASK182-implement-message-bus|TASK182 - Implement MessageBus with EventEmitter pattern]]
- [[TASK183-subscribe-publish-methods|TASK183 - Subscribe and publish methods with type filtering]]

## Technical Notes
- `MessageBus` is a singleton using Node.js `EventEmitter` under the hood
- `subscribe()` returns an `unsubscribe` function for cleanup
- Messages include: `type`, `sourceAgent`, `targetAgent`, `payload`, `context`, `timestamp`
- Message bus is in-memory only; no persistence or cross-process delivery
- Located in `agents/coordination/message-bus.ts`
