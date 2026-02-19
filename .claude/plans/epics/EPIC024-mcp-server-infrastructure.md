# Epic ID: EPIC024
# Epic Name: MCP Server Infrastructure
# Parent Feature: [[F010-multi-agent-infrastructure|F010 - Agent Infrastructure]]
# Status: Partial
# Priority: Critical

## Description
Provides the Model Context Protocol (MCP) server infrastructure that connects the agent system to external services including Avinode, Gmail, Supabase, and Google Sheets. Each MCP server exposes a standardized set of tools that agents invoke to perform operations on external systems. The infrastructure supports stdio transport for local development and includes a mock mode that enables development and testing without live external connections.

## Goals
- Provide a standardized MCP tool interface that agents use to interact with all external services
- Support stdio transport for local MCP server communication during development
- Enable mock mode for all MCP servers to support development and testing without live connections
- Maintain consistent error handling and response formatting across all MCP server implementations

## User Stories
- [[US099-connect-avinode-mcp|US099 - Connect to Avinode MCP: Agent connects to the Avinode MCP server and invokes tools for trip creation, quote retrieval, messaging, and airport search]]
- [[US100-connect-gmail-mcp|US100 - Connect to Gmail MCP: Agent connects to the Gmail MCP server and invokes tools for sending emails, proposals, and quote summaries]]
- [[US101-connect-supabase-mcp|US101 - Connect to Supabase MCP: Agent connects to the Supabase MCP server and invokes tools for CRM operations on clients, requests, quotes, and operators]]
- [[US102-fallback-mock-tools|US102 - Fallback to mock tools: When MCP servers are unavailable or in development mode, the system falls back to mock tool implementations that return realistic test data]]

## Acceptance Criteria Summary
- Avinode MCP server exposes all 8 tools (create_trip, get_rfq, get_quote, cancel_trip, send_trip_message, get_trip_messages, search_airports, search_empty_legs)
- Gmail MCP server exposes all 3 tools (send_email, send_proposal_email, send_quote_email)
- Supabase MCP server exposes all 12 CRM tools for clients, requests, quotes, and operators
- All MCP servers communicate via stdio transport in development
- Mock mode returns realistic test data that matches the schema of live responses
- MCP server connection failures are handled gracefully with descriptive error messages
- Tool invocation includes input validation and structured error responses
- MCP servers can be started independently or concurrently via npm scripts

## Technical Scope
- `mcp-servers/avinode-mcp-server/` - Avinode MCP server with 8 flight operation tools
- `mcp-servers/gmail/` - Gmail MCP server with 3 email sending tools
- `mcp-servers/supabase/` - Supabase MCP server with 12 CRM tools
- `mcp-servers/shared/` - Shared MCP utilities and base classes
- `@modelcontextprotocol/sdk` - MCP SDK for server implementation
- stdio transport configuration for local development
- Mock tool implementations for development and testing
- `npm run dev:mcp` - Concurrent MCP server startup script
- `npm run mcp:test` - MCP connection testing script
