# User Story ID: US092
# Title: Register Agent in Registry
# Parent Epic: [[EPIC022-agent-core|EPIC022 - Agent Core Framework]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As a developer, I want to register agents in the AgentRegistry, so they can be discovered by other agents.

## Acceptance Criteria

### AC1: Agent registration and discovery
**Given** an agent exists
**When** it is registered
**Then** it is discoverable by ID or by type

### AC2: Query all agents
**Given** agents are registered
**When** queried
**Then** all agents or agents filtered by type are returned

## Tasks
- [[TASK176-implement-agent-registry|TASK176 - Implement AgentRegistry singleton]]
- [[TASK177-agent-discovery-methods|TASK177 - Agent discovery methods (getById, getByType, getAll)]]

## Technical Notes
- `AgentRegistry` is a singleton accessed via `AgentRegistry.getInstance()`
- Registry maintains a `Map<string, IAgent>` keyed by agent ID
- Discovery methods: `getById(id)`, `getByType(type)`, `getAll()`, `has(id)`
- Agents are automatically registered during factory creation
- Located in `agents/core/agent-registry.ts`
