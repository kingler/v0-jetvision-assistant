# Task ID: TASK258
# Task Name: Agent Test Suite
# Parent User Story: [[US141-run-agent-tests|US141 - Agent tests with mocked MCP]]
# Status: Done
# Priority: Medium
# Estimate: 3h

## Description
Write a comprehensive test suite for the JetvisionAgent that validates agent behavior with mocked MCP servers. Tests should cover tool routing, response generation, error handling, and multi-turn conversation flows.

## Acceptance Criteria
- Tests for JetvisionAgent initialization and configuration
- Tests for tool routing: flight search routes to Avinode MCP, CRM queries route to Supabase MCP
- Tests for response generation: agent produces valid structured responses
- Tests for error handling: MCP server failure, timeout, invalid tool response
- Tests for multi-turn conversations: context is maintained across turns
- All MCP servers are fully mocked (no real API calls)
- OpenAI API is mocked with deterministic responses
- Test coverage meets 75% threshold for agent code
- Tests run in under 30 seconds total

## Implementation Details
- **File(s)**: `__tests__/unit/agents/` (multiple test files)
- **Approach**: Create mock MCP server implementations that return predetermined responses. Mock the OpenAI client to return scripted completions. Test each agent capability in isolation. Use `vi.fn()` for spy/mock functions. Test both happy path and error scenarios. Organize tests by feature area (initialization, tool execution, conversation, error handling).

## Dependencies
- [[TASK254-configure-vitest-unit|TASK254]] (configure-vitest-unit) for test configuration
- Agent implementation must exist for testing
