# Task ID: TASK092
# Task Name: Send Proposal Email
# Parent User Story: [[US046-approve-send-proposal-email|US046 - Send proposal email to client]]
# Status: Done
# Priority: Critical
# Estimate: 2h

## Description
Execute the send_proposal_email MCP tool to deliver the approved proposal email to the client. This is triggered when the user clicks "Send" in the EmailApprovalUI after reviewing the email content. The tool sends the email via Gmail with the proposal PDF attached.

## Acceptance Criteria
- Calls send_proposal_email MCP tool with finalized email data
- Email is sent via Gmail API with correct recipient, subject, and body
- Proposal PDF is attached to the email
- Returns confirmation with message_id and sent timestamp
- Handles sending failures with retry logic (up to 3 attempts)
- Updates proposal status to "sent" on success (TASK093)
- Logs the email sending event for audit trail
- Shows success confirmation in the chat interface

## Implementation Details
- **File(s)**: Agent tool execution pipeline (JetvisionAgent)
- **Approach**: The agent calls send_proposal_email MCP tool with the email data from EmailApprovalUI (potentially modified by the user). The Gmail MCP server handles the actual SMTP delivery. On success, trigger TASK093 to update proposal status. On failure, surface the error to the user via chat message with option to retry.

## Dependencies
- [[TASK091-render-email-approval-ui|TASK091]] (Email approval UI) - provides approved email data
- [[TASK093-update-proposal-status|TASK093]] (Update proposal status) - called on success
- Gmail MCP server must be running and authenticated
