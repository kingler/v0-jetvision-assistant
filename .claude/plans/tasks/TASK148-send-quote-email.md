# Task ID: TASK148
# Task Name: Send Quote Email
# Parent User Story: [[US077-send-quote-summary-email|US077 - Send Quote Comparison Email]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Implement the ability to send a quote comparison email by calling the send_quote_email MCP tool with the request_id and selected quote_ids. The email should contain a formatted comparison of the selected quotes for the client's review.

## Acceptance Criteria
- send_quote_email MCP tool accepts request_id and quote_ids array
- Email contains formatted comparison of all selected quotes
- Quote details include aircraft type, pricing, operator, and availability
- Email subject line includes the route and date
- Email is sent to the client associated with the request
- Tool returns confirmation with message ID on success
- Handles case where quotes are no longer valid/available

## Implementation Details
- **File(s)**: Gmail MCP server (send_quote_email tool)
- **Approach**: Create a send_quote_email tool that fetches the request and selected quotes from the database. Generate an HTML email body with a comparison table showing key quote attributes. Determine the recipient from the request's associated client profile. Call the base send_email functionality with the constructed email. Return the send confirmation.

## Dependencies
- [[TASK145-send-email-mcp|TASK145]] (base send_email functionality)
- Quote data available in database
- Client profile linked to the request
