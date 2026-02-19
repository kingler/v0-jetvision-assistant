# Task ID: TASK175
# Task Name: Agent Creation Configuration
# Parent User Story: [[US091-create-agent-via-factory|US091 - Agent Factory and Lifecycle Management]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Define and implement the agent creation configuration interface that supports specifying type, name, model, and temperature. The factory uses this config to instantiate agents with the correct parameters.

## Acceptance Criteria
- AgentConfig interface includes: type (AgentType), name (string), model (string), temperature (number)
- Optional fields: maxTokens, systemPrompt, tools, metadata
- Temperature is validated (0.0 to 2.0 range)
- Model defaults to 'gpt-4-turbo-preview' if not specified
- Config is passed to agent constructor during creation
- Invalid config values throw validation errors with clear messages

## Implementation Details
- **File(s)**: agents/core/agent-factory.ts
- **Approach**: Define AgentConfig interface in types.ts, add validation logic in the factory's createAndInitialize method. Validate temperature range, required fields presence, and model string format before passing to the agent constructor.

## Dependencies
- [[TASK174-agent-factory-singleton|TASK174]] (agent-factory-singleton)
- agents/core/types.ts for type definitions
