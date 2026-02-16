# User Story ID: US102
# Title: Fallback Mock Tools When MCP Unavailable
# Parent Epic: [[EPIC024-mcp-server-infrastructure|EPIC024 - MCP Server Integration]]
# Status: Implemented
# Priority: Medium
# Story Points: 3

## User Story
As a developer, I want fallback mock tools when MCP is unavailable, so development is not blocked.

## Acceptance Criteria

### AC1: Fallback activation on connection failure
**Given** an MCP server fails to connect
**When** the fallback activates
**Then** hardcoded tool definitions are used in place of the MCP tools

### AC2: Mock data responses
**Given** mock mode is active
**When** tools are executed
**Then** test data is returned instead of real API calls

## Tasks
- [[TASK197-mock-tool-fallback|TASK197 - Implement mock tool fallback mechanism]]
- [[TASK198-test-data-fixtures|TASK198 - Create test data fixtures for all tool types]]

## Technical Notes
- Fallback tool definitions are maintained in `lib/mcp-ui/tool-ui-registry.ts`
- Mock data covers all 23 tools across Avinode (8), Supabase (12), and Gmail (3)
- Fallback is triggered automatically when MCP server connection times out or errors
- Mock responses include realistic data structures matching actual API responses
- Environment variable `MCP_MOCK_MODE=true` forces mock mode regardless of server availability
- Test fixtures are reused in unit and integration tests
