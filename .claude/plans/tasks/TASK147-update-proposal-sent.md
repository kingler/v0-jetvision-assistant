# Task ID: TASK147
# Task Name: Update Proposal Status to Sent
# Parent User Story: [[US076-send-proposal-email-with-pdf|US076 - Send Proposal Email with Attachment]]
# Status: Done
# Priority: High
# Estimate: 1h

## Description
After successfully sending a proposal email with the PDF attachment, update the proposal record's status to "sent" in the database. This tracks the proposal lifecycle and prevents accidental re-sends.

## Acceptance Criteria
- Proposal status is updated to "sent" after successful email delivery
- sent_at timestamp is recorded on the proposal record
- Status update only occurs after confirmed email delivery (not before)
- Failed email sends do not change the proposal status
- Status transition is validated (only "draft" or "approved" proposals can become "sent")
- Updated proposal record is returned for UI confirmation

## Implementation Details
- **File(s)**: lib/services/proposal-service.ts
- **Approach**: Add an `updateProposalStatus` method that transitions the proposal to "sent" status. Call this method in the email send flow after receiving confirmation from the Gmail MCP tool. Set sent_at to the current timestamp. Validate the current status allows the transition. Update the database record via Supabase.

## Dependencies
- [[TASK146-send-email-attachment|TASK146]] (email with attachment must succeed first)
- [[TASK079-create-proposal-record|TASK079]] (proposal record exists in database)
