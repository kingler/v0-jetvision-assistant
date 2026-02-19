# Task ID: TASK174
# Task Name: Agent Factory Singleton
# Parent User Story: [[US091-create-agent-via-factory|US091 - Agent Factory and Lifecycle Management]]
# Status: Done
# Priority: Critical
# Estimate: 3h

## Description
Implement the AgentFactory as a singleton that manages agent creation and lifecycle. The factory provides `registerAgentType` for registering agent constructors and `createAndInitialize` for instantiating and initializing agents in a single call.

## Acceptance Criteria
- AgentFactory uses singleton pattern (getInstance returns same instance)
- registerAgentType(type, constructor) registers agent classes by AgentType enum
- createAndInitialize(config) creates an agent instance and calls initialize()
- Factory tracks all created agents for lifecycle management
- Attempting to register the same type twice throws an error
- createAndInitialize with unregistered type throws descriptive error
- Factory exposes shutdown() to gracefully terminate all agents

## Implementation Details
- **File(s)**: agents/core/agent-factory.ts
- **Approach**: Implement private constructor with static instance field. Use a Map<AgentType, AgentConstructor> for the registry. createAndInitialize instantiates from the registry, calls agent.initialize(), adds to active agents list, and returns the initialized agent. Include shutdown() that iterates all active agents and calls their shutdown methods.

## Dependencies
- BaseAgent abstract class (agents/core/base-agent.ts)
- AgentType enum (agents/core/types.ts)
