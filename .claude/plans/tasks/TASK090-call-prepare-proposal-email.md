# Task ID: TASK090
# Task Name: Call prepare_proposal_email MCP Tool
# Parent User Story: [[US045-preview-proposal-email|US045 - Review email before sending proposal]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Invoke the prepare_proposal_email MCP tool to generate a draft email for the proposal. The tool takes the proposal details and customer information and returns a structured email object with subject line, body (HTML), recipient email, and the proposal PDF as an attachment reference.

## Acceptance Criteria
- Calls prepare_proposal_email MCP tool with proposal_id and customer details
- Returns structured email data: subject, body_html, recipient_email, attachment_url
- Subject line includes proposal number and customer name
- Email body is professionally formatted HTML with proposal summary
- Attachment references the stored PDF URL
- Handles MCP tool errors gracefully
- Email content is suitable for direct sending after approval

## Implementation Details
- **File(s)**: Agent tool execution pipeline (JetvisionAgent)
- **Approach**: The JetvisionAgent calls prepare_proposal_email as part of the proposal sending workflow. The tool fetches proposal and customer data, uses an LLM to generate a professional email body, and returns the structured email object. The result is passed to the EmailApprovalUI component (TASK091) for user review before sending.

## Dependencies
- [[TASK079-create-proposal-record|TASK079]] (Create proposal record) - proposal must exist
- [[TASK086-store-pdf-url|TASK086]] (Store PDF URL) - PDF URL needed for attachment
- Gmail MCP server must have prepare_proposal_email tool registered
