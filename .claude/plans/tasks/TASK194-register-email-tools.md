# Task ID: TASK194
# Task Name: Register Email Tools
# Parent User Story: [[US100-connect-gmail-mcp|US100 - Gmail MCP Server Integration]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Register the three email tools with the Gmail MCP server including their JSON Schema definitions and handler implementations.

## Acceptance Criteria
- send_email tool: Accepts to (string[]), cc (string[]), bcc (string[]), subject (string), body (string, HTML), attachments (optional file references). Returns message ID and thread ID.
- search_emails tool: Accepts query (string, Gmail search syntax), maxResults (number, default 10), pageToken (optional). Returns array of email summaries with id, subject, from, date, snippet.
- get_email tool: Accepts messageId (string), format ('full' | 'metadata' | 'minimal'). Returns full email content with headers, body, and attachment metadata.
- All tools have complete JSON Schema input definitions
- Error responses include descriptive error codes

## Implementation Details
- **File(s)**: mcp-servers/gmail/
- **Approach**: Register tools in the MCP server's tools/list handler. Implement each tool's handler using the Gmail API client. send_email constructs MIME message, search_emails uses messages.list with query, get_email uses messages.get with the specified format.

## Dependencies
- [[TASK193-gmail-mcp-server|TASK193]] (gmail-mcp-server)
