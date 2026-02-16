# User Story ID: US100
# Title: Connect to Gmail MCP Server
# Parent Epic: [[EPIC024-mcp-server-infrastructure|EPIC024 - MCP Server Integration]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As a developer, I want to connect to the Gmail MCP server, so email tools are available.

## Acceptance Criteria

### AC1: Gmail tools registration
**Given** Gmail OAuth credentials are configured
**When** the MCP server connects
**Then** email tools (send_email, search_emails, etc.) are registered

## Tasks
- [[TASK193-gmail-mcp-server|TASK193 - Implement Gmail MCP server with OAuth]]
- [[TASK194-register-email-tools|TASK194 - Register email tools (send, search, read)]]

## Technical Notes
- Gmail MCP server located in `mcp-servers/gmail/`
- Uses Google OAuth 2.0 for authentication with refresh token flow
- Tools include: `send_email`, `search_emails`, `get_email`
- Email templates for proposals and quotes are stored in the server
- Requires `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REFRESH_TOKEN` env vars
- Server connects via stdio transport configured in `.mcp.json`
