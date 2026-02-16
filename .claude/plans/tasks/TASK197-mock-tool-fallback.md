# Task ID: TASK197
# Task Name: Mock Tool Fallback
# Parent User Story: [[US102-fallback-mock-tools|US102 - Development Mock Tools]]
# Status: Done
# Priority: Medium
# Estimate: 3h

## Description
Implement hardcoded tool definitions that are used as fallbacks when MCP servers are unavailable. This enables development and testing without requiring live API connections.

## Acceptance Criteria
- Mock tool definitions mirror the real MCP tool schemas exactly
- Mock handlers return realistic static data for each tool
- Fallback is automatic when MCP server connection fails
- Console warning is logged when falling back to mock tools
- Mock mode can be forced via MOCK_MCP_TOOLS=true environment variable
- Mock responses are consistent (same input always returns same output)
- Mock tools cover all 8 Avinode, 3 Gmail, and 14 Supabase tools

## Implementation Details
- **File(s)**: agents/jetvision-agent/
- **Approach**: Create a mock-tools.ts file that exports tool definitions with hardcoded response handlers. In the agent's tool executor, check if the MCP server is connected; if not, route to the mock handler. Include a flag to force mock mode for development. Mock data should be realistic and cover common scenarios.

## Dependencies
- TASK191-196 (MCP server tool schemas for reference)
- JetvisionAgent tool executor
