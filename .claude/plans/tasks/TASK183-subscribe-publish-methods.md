# Task ID: TASK183
# Task Name: Subscribe and Publish Methods
# Parent User Story: [[US095-publish-subscribe-messages|US095 - Inter-Agent Message Bus]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Implement the subscribe and publish method variants on the MessageBus including type-based subscription, agent-targeted subscription, and wildcard subscription for monitoring.

## Acceptance Criteria
- subscribe(type, handler) subscribes to a specific MessageType, returns unsubscribe function
- subscribeToAgent(agentId, handler) receives all messages targeting a specific agent
- subscribeAll(handler) receives all messages (for logging/monitoring)
- unsubscribe function returned by subscribe properly removes the handler
- Multiple handlers can subscribe to the same message type
- Handler receives the full Message object as argument
- Handlers are invoked in registration order
- subscribeToAgent filters by targetAgent field

## Implementation Details
- **File(s)**: agents/coordination/message-bus.ts
- **Approach**: subscribe(type, handler) uses EventEmitter.on(type, handler) and returns a function that calls removeListener. subscribeToAgent creates a filtered handler that checks message.targetAgent before invoking. subscribeAll listens on a wildcard '*' event that publish() always emits in addition to the typed event.

## Dependencies
- [[TASK182-implement-message-bus|TASK182]] (implement-message-bus)
