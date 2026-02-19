# Task ID: TASK093
# Task Name: Update Proposal Status to Sent
# Parent User Story: [[US046-approve-send-proposal-email|US046 - Send proposal email to client]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
After successfully sending the proposal email, update the proposal status from "draft" to "sent" and advance the flight request stage accordingly. This marks the proposal as delivered and triggers downstream workflow transitions.

## Acceptance Criteria
- Updates proposal status to "sent" in the proposals table
- Sets sent_at timestamp to current time
- Stores the email message_id for tracking
- Advances the linked request to the next stage (TASK094)
- Returns the updated proposal record
- Only transitions from "draft" status (prevents duplicate sends)
- Emits a status change event for real-time UI updates

## Implementation Details
- **File(s)**: lib/services/proposal-service.ts
- **Approach**: Add an updateProposalStatus function that validates the current status is "draft", then updates to "sent" with sent_at and email_message_id. Use Supabase update with status check in the WHERE clause to prevent race conditions. After successful update, call the request stage advancement function (TASK094).

## Dependencies
- [[TASK092-send-proposal-email|TASK092]] (Send proposal email) - triggers this update
- [[TASK094-update-stage-on-send|TASK094]] (Update stage on send) - called after status update
- Proposals table must have status, sent_at, email_message_id columns
