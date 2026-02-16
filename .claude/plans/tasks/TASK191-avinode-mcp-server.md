# Task ID: TASK191
# Task Name: Avinode MCP Server
# Parent User Story: [[US099-connect-avinode-mcp|US099 - Avinode MCP Server Integration]]
# Status: Done
# Priority: Critical
# Estimate: 8h

## Description
Implement the full Avinode MCP server with 8 tools using stdio transport. The server wraps the Avinode API and exposes flight management operations as MCP-compatible tools that agents can invoke.

## Acceptance Criteria
- MCP server starts on stdio transport using @modelcontextprotocol/sdk
- Server registers 8 tools with proper schemas (input/output definitions)
- Each tool has descriptive name, description, and JSON Schema for parameters
- Server handles tool invocation and returns structured results
- Error responses follow MCP error format with descriptive messages
- Server gracefully handles Avinode API authentication
- Server logs tool invocations for debugging
- Connection lifecycle (initialize, tool listing, tool calling) works correctly

## Implementation Details
- **File(s)**: mcp-servers/avinode-mcp-server/src/index.ts
- **Approach**: Create an MCP Server using the SDK's Server class. Register each tool with server.setRequestHandler for tools/list and tools/call. Implement an AvinodeApiClient that handles authentication and HTTP calls to the Avinode API. Each tool handler validates input, calls the API client, and returns formatted results. Use stdio transport for agent communication.

## Dependencies
- @modelcontextprotocol/sdk package
- Avinode API credentials (environment variables)
- Avinode API documentation for endpoint specifications
