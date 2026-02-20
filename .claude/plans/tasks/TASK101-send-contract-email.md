# Task ID: TASK101
# Task Name: Send Contract Email to Client
# Parent User Story: [[US050-send-contract-to-customer|US050 - Send contract to client for signing]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Create a POST /api/contract/send endpoint that sends the contract document to the client via email. The email includes the contract details and a link or attachment for the client to review and sign.

## Acceptance Criteria
- POST /api/contract/send accepts { contract_id, recipient_email }
- Generates or attaches the contract document (PDF)
- Sends email via Gmail MCP tool with professional formatting
- Email includes contract summary, total amount, and signing instructions
- Updates contract status to "sent" (TASK102)
- Returns confirmation with email message_id
- Handles sending failures with appropriate error messages
- Only sends contracts in "draft" status

## Implementation Details
- **File(s)**: app/api/contract/send/route.ts
- **Approach**: Create a POST route handler that fetches the contract data, prepares the email content with contract summary and signing link, calls the Gmail MCP send_email tool, and updates the contract status on success. Include the contract PDF as an attachment if available.

## Dependencies
- [[TASK100-create-contract-record|TASK100]] (Create contract record) - contract must exist
- [[TASK102-update-contract-status-sent|TASK102]] (Update contract status) - called on success
- Gmail MCP server must be running and authenticated
