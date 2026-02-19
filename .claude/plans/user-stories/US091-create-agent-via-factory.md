# User Story ID: US091
# Title: Create Agent via AgentFactory
# Parent Epic: [[EPIC022-agent-core|EPIC022 - Agent Core Framework]]
# Status: Implemented
# Priority: Critical
# Story Points: 5

## User Story
As a developer, I want to create agents via the AgentFactory, so agents are consistently instantiated.

## Acceptance Criteria

### AC1: Agent creation with config
**Given** agent configuration (type, name, model, temperature)
**When** I call `factory.createAndInitialize()`
**Then** an agent is created with the correct type, name, model, and temperature

### AC2: Agent initialization state
**Given** the agent is created
**When** it initializes
**Then** its status is `IDLE` and tools are registered

## Tasks
- [[TASK174-agent-factory-singleton|TASK174 - Implement AgentFactory singleton pattern]]
- [[TASK175-agent-creation-config|TASK175 - Agent creation with configuration validation]]

## Technical Notes
- `AgentFactory` is a singleton accessed via `AgentFactory.getInstance()`
- Factory validates config before creation: required fields, valid model names, temperature range 0-2
- Created agents are automatically registered in `AgentRegistry`
- Agent types defined in `AgentType` enum: ORCHESTRATOR, CLIENT_DATA, FLIGHT_SEARCH, etc.
- Located in `agents/core/agent-factory.ts`
