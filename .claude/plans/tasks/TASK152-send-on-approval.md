# Task ID: TASK152
# Task Name: Send Email on Approval
# Parent User Story: [[US079-approve-email-to-send|US079 - Approve and Send Email]]
# Status: Done
# Priority: Critical
# Estimate: 2h

## Description
Implement the API endpoint that executes the email send after the user approves the draft. This endpoint receives the approved email content and triggers the Gmail MCP tool to send the proposal email with the PDF attachment.

## Acceptance Criteria
- POST /api/proposal/approve-email endpoint accepts proposal_id and email content
- Endpoint validates authentication and authorization
- Email is sent via Gmail MCP with the approved content
- PDF proposal is attached to the email
- Proposal status is updated to "sent" on success
- Response includes send confirmation with message ID
- Endpoint handles Gmail API failures gracefully
- Idempotent: re-sending an already-sent proposal is prevented

## Implementation Details
- **File(s)**: app/api/proposal/approve-email/route.ts
- **Approach**: Create a POST handler that validates the request, fetches the proposal and its PDF, calls the Gmail MCP send_email tool with the approved content and PDF attachment, updates the proposal status to "sent" via the proposal service, and returns the result. Include error handling for each step with meaningful error messages.

## Dependencies
- [[TASK146-send-email-attachment|TASK146]] (send email with attachment)
- [[TASK147-update-proposal-sent|TASK147]] (update proposal status)
- [[TASK151-handle-approve-action|TASK151]] (UI triggers this endpoint)
