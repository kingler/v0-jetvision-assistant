# User Story ID: US099
# Title: Connect to Avinode MCP Server
# Parent Epic: [[EPIC024-mcp-server-infrastructure|EPIC024 - MCP Server Integration]]
# Status: Implemented
# Priority: Critical
# Story Points: 5

## User Story
As a developer, I want to connect to the Avinode MCP server, so flight tools are available.

## Acceptance Criteria

### AC1: Avinode tools registration
**Given** `AVINODE_API_TOKEN` is set in environment
**When** the MCP server connects
**Then** 8 Avinode tools are registered (create_trip, get_rfq, get_quote, cancel_trip, send_trip_message, get_trip_messages, search_airports, search_empty_legs)

### AC2: Mock mode fallback
**Given** no Avinode API token is configured
**When** the MCP server starts
**Then** mock mode activates with test data for development

## Tasks
- [[TASK191-avinode-mcp-server|TASK191 - Implement Avinode MCP server with stdio transport]]
- [[TASK192-register-avinode-tools|TASK192 - Register all 8 Avinode tools]]

## Technical Notes
- Avinode MCP server located in `mcp-servers/avinode/`
- Uses `@modelcontextprotocol/sdk` for MCP protocol compliance
- Tools communicate with Avinode Marketplace API v2
- Mock mode returns realistic test data for all 8 tools
- Deep link integration: `create_trip` returns `trip_id` and `deep_link` URL
- Server connects via stdio transport configured in `.mcp.json`
