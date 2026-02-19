# Task ID: TASK193
# Task Name: Gmail MCP Server
# Parent User Story: [[US100-connect-gmail-mcp|US100 - Gmail MCP Server Integration]]
# Status: Done
# Priority: High
# Estimate: 5h

## Description
Implement the Gmail MCP server with OAuth 2.0 authentication and three email tools: send_email, search_emails, and get_email. The server enables agents to send proposals and manage email communications.

## Acceptance Criteria
- MCP server starts on stdio transport
- OAuth 2.0 authentication flow with Google APIs
- Credentials stored securely (refresh token persistence)
- send_email supports to, cc, bcc, subject, body (HTML), and attachments
- search_emails supports Gmail search query syntax with pagination
- get_email retrieves full email content by message ID
- Rate limiting respects Gmail API quotas
- Error handling for authentication failures, quota exceeded, invalid recipients

## Implementation Details
- **File(s)**: mcp-servers/gmail/
- **Approach**: Create MCP Server with Gmail API client. Use googleapis package for Gmail API access. Implement OAuth 2.0 flow with stored refresh token. Each tool handler constructs the appropriate Gmail API call, handles the response, and returns structured data. Include retry logic for transient failures.

## Dependencies
- googleapis package
- Google Cloud project with Gmail API enabled
- OAuth 2.0 credentials (client ID, client secret, refresh token)
