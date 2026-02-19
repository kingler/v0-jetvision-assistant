# Epic ID: EPIC022
# Epic Name: Agent Core Architecture
# Parent Feature: [[F010-multi-agent-infrastructure|F010 - Agent Infrastructure]]
# Status: Implemented
# Priority: Critical

## Description
Provides the foundational agent architecture including the abstract base class, singleton factory, central registry, and context management. All agents in the system extend the BaseAgent class, which provides standard lifecycle methods, tool registration, metrics tracking, and OpenAI API integration. The factory and registry patterns ensure consistent agent creation and discoverability across the system.

## Goals
- Provide an extensible base agent architecture that all specialized agents inherit from
- Manage the complete agent lifecycle from creation through execution to shutdown
- Enable dynamic tool registration so agents can declare their capabilities at runtime
- Track agent execution metrics including invocation counts, latency, and error rates

## User Stories
- [[US091-create-agent-via-factory|US091 - Create agent via factory: Developer creates a new agent instance through the AgentFactory singleton, which handles initialization and configuration]]
- [[US092-register-agent-in-registry|US092 - Register agent in registry: Created agents are registered in the AgentRegistry for lookup by ID, type, or capability]]
- [[US093-execute-agent-with-context|US093 - Execute agent with context: Agent receives an execution context (session ID, request ID, user ID) and performs its designated task]]
- [[US094-track-agent-metrics|US094 - Track agent metrics: System tracks and exposes per-agent metrics including total executions, success rate, average latency, and error counts]]

## Acceptance Criteria Summary
- BaseAgent abstract class enforces implementation of the execute() method in all subclasses
- AgentFactory creates and initializes agents with correct configuration in a single call
- AgentRegistry maintains a complete list of all active agents, queryable by type
- Agent context provides session, request, and user scoping for every execution
- Metrics are updated after every agent execution with accurate timing data
- Tool registration validates tool definitions and prevents duplicate registrations
- Agent shutdown cleanly releases resources and deregisters from the registry
- All core classes follow the singleton pattern where specified

## Technical Scope
- `agents/core/base-agent.ts` - Abstract base class with lifecycle, tools, metrics, and OpenAI integration
- `agents/core/agent-factory.ts` - Singleton factory for creating and initializing agent instances
- `agents/core/agent-registry.ts` - Central registry for agent discovery and lookup
- `agents/core/agent-context.ts` - Execution context manager with session/request/user scoping
- `agents/core/types.ts` - TypeScript type definitions for agent interfaces, configs, and enums
- `agents/core/index.ts` - Barrel exports for clean module imports
