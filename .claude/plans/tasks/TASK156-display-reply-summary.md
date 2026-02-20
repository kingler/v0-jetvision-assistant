# Task ID: TASK156
# Task Name: Display Email Reply Summary
# Parent User Story: [[US081-check-inbox-for-replies|US081 - Search Email History]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Display email search results in the chat interface, showing the subject, sender, and a content preview for each matching email. The agent should present the results in a readable, summarized format.

## Acceptance Criteria
- Email results are displayed as structured data in the chat
- Each result shows subject line, sender name/email, and date
- Content preview shows the first 100-200 characters of the email body
- Results are numbered for easy reference
- User can ask follow-up questions about specific results
- Empty results are communicated clearly
- Multiple results are presented in a scannable list format

## Implementation Details
- **File(s)**: Agent response rendering
- **Approach**: The agent formats the search_emails results into a structured response. Each email is presented with its key metadata in a consistent format. The agent uses markdown or structured text for readability. If the user asks for more detail on a specific email, the agent can fetch the full message using the message ID. Register a custom renderer in the tool-ui-registry if a card-based display is preferred.

## Dependencies
- [[TASK155-search-emails-mcp|TASK155]] (search_emails MCP tool provides the data)
