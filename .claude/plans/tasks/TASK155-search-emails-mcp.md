# Task ID: TASK155
# Task Name: Search Emails via MCP
# Parent User Story: [[US081-check-inbox-for-replies|US081 - Search Email History]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Implement the ability to search the user's email history by calling the search_emails MCP tool on the Gmail MCP server. The tool should support searching by query string, sender, subject, and date range.

## Acceptance Criteria
- search_emails MCP tool accepts a query string parameter
- Supports Gmail search operators (from:, to:, subject:, after:, before:)
- Returns a list of matching emails with metadata (subject, sender, date, snippet)
- Results are ordered by date (newest first)
- Pagination support for large result sets
- Returns empty array when no matches found
- Tool is registered and accessible by the JetvisionAgent

## Implementation Details
- **File(s)**: Gmail MCP server (search_emails tool)
- **Approach**: Define the search_emails tool with a query parameter that supports Gmail's native search syntax. Use the Gmail API's messages.list endpoint with the query parameter. For each result, fetch the message metadata (headers) to extract subject, from, date. Return a structured array of email summaries with message IDs for potential follow-up reads.

## Dependencies
- Gmail MCP server infrastructure
- Gmail API OAuth credentials configured
