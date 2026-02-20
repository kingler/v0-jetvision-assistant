# Task ID: TASK145
# Task Name: Send Email via MCP
# Parent User Story: [[US075-send-general-email|US075 - Send Email]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement the ability to send emails by calling the send_email MCP tool on the Gmail MCP server. The tool should accept to, subject, and body parameters and send the email through the configured Gmail account.

## Acceptance Criteria
- send_email MCP tool accepts to (email address), subject, and body (HTML)
- Email is sent successfully through Gmail API
- Tool returns confirmation with message ID on success
- Invalid email addresses are rejected with clear error
- HTML body is rendered correctly in the sent email
- Tool handles Gmail API rate limits gracefully
- Tool is registered and accessible by the JetvisionAgent

## Implementation Details
- **File(s)**: Gmail MCP server (send_email tool)
- **Approach**: Define the send_email tool in the Gmail MCP server with input schema validation. Use the Gmail API's messages.send endpoint with the provided parameters. Construct the email MIME message with proper headers (To, Subject, Content-Type). Handle OAuth token refresh if needed. Return the sent message ID and thread ID on success.

## Dependencies
- Gmail MCP server infrastructure
- Gmail API OAuth credentials configured
