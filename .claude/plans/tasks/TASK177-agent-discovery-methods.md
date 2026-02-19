# Task ID: TASK177
# Task Name: Agent Discovery Methods
# Parent User Story: [[US092-register-agent-in-registry|US092 - Agent Registry and Discovery]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement agent discovery methods on the registry that allow finding agents by id, type, or retrieving the full list. These methods are used by the coordination layer to route tasks to appropriate agents.

## Acceptance Criteria
- getAgent(id) returns a single agent by its unique identifier or undefined
- getAgentsByType(type) returns an array of agents matching the AgentType
- getAllAgents() returns an array of all registered agents
- Methods return empty arrays (not null/undefined) when no agents match
- getAgent returns undefined (not throw) for non-existent id
- All methods are O(1) or O(n) where n is result set size

## Implementation Details
- **File(s)**: agents/core/agent-registry.ts
- **Approach**: Extend the AgentRegistry with typed getter methods. getAgent uses the id-indexed Map directly. getAgentsByType uses the type-indexed Map to get the Set of ids, then resolves each to the agent instance. getAllAgents returns Array.from the values of the id Map.

## Dependencies
- [[TASK176-implement-agent-registry|TASK176]] (implement-agent-registry)
