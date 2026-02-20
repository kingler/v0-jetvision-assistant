# User Story ID: US141
# Title: Run Agent-Specific Tests
# Parent Epic: [[EPIC034-test-infrastructure|EPIC034 - Testing Infrastructure]]
# Status: Implemented
# Priority: Medium
# Story Points: 2

## User Story
As a developer, I want to run agent-specific tests, so I can verify agent behavior independently.

## Acceptance Criteria

### AC1: Agent Test Execution
**Given** agent test files exist in the test directory
**When** npm run test:agents executes
**Then** agent tests run with mocked MCP servers and verify agent behavior

## Tasks
- [[TASK258-agent-test-suite|TASK258 - Write agent test suite with mocked MCP tool responses]]

## Technical Notes
- Test pattern: `__tests__/unit/agents/**/*.test.ts` and `__tests__/agents/**/*.test.ts`
- MCP tools mocked to return predefined responses
- Tests verify: tool selection logic, response formatting, error handling
- JetvisionAgent tested with various flight request scenarios
- Agent context and session state properly initialized in test setup
