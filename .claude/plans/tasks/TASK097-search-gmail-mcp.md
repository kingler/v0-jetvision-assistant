# Task ID: TASK097
# Task Name: Search Gmail via MCP Tool
# Parent User Story: [[US048-check-customer-reply|US048 - Check inbox for client replies to proposals]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Call the search_emails MCP tool from the Gmail MCP server to search for emails matching a customer's email address. This enables the inbox check functionality to find client replies to sent proposals.

## Acceptance Criteria
- Calls search_emails MCP tool with query parameters (from address, subject, date range)
- Returns parsed email results with id, thread_id, subject, snippet, from, date
- Supports Gmail search syntax (e.g., "from:client@example.com after:2026/02/01")
- Handles no results gracefully (returns empty array)
- Handles MCP tool connection errors
- Results are sorted by date (newest first)

## Implementation Details
- **File(s)**: Gmail MCP server tool (search_emails)
- **Approach**: The Gmail MCP server exposes a search_emails tool that wraps the Gmail API's messages.list with a query string. The agent or API route calls this tool with constructed search queries. The tool returns parsed message metadata. Ensure the tool handles pagination for large result sets.

## Dependencies
- Gmail MCP server must be running with valid OAuth credentials
- Gmail API access must be configured for the service account
- search_emails tool must be registered in the MCP server
