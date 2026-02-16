# Task ID: TASK176
# Task Name: Implement Agent Registry
# Parent User Story: [[US092-register-agent-in-registry|US092 - Agent Registry and Discovery]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Implement the AgentRegistry singleton that provides centralized registration and lookup of agent instances. Supports register, unregister, getByType, and getAll operations for managing the pool of active agents.

## Acceptance Criteria
- AgentRegistry uses singleton pattern
- register(agent) adds an agent to the registry indexed by id and type
- unregister(agentId) removes an agent from the registry
- getByType(type) returns all agents of a given AgentType
- getAll() returns all registered agents
- Duplicate registration (same id) throws an error
- Unregistering a non-existent agent throws an error
- Registry emits events on register/unregister for observability

## Implementation Details
- **File(s)**: agents/core/agent-registry.ts
- **Approach**: Implement with a Map<string, IAgent> for id-based lookup and a Map<AgentType, Set<string>> for type-based grouping. Register adds to both maps, unregister removes from both. Include clear() method for testing. Emit events via the message bus on registration changes.

## Dependencies
- BaseAgent / IAgent interface (agents/core/types.ts)
- AgentType enum (agents/core/types.ts)
