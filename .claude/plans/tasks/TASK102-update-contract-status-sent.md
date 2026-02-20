# Task ID: TASK102
# Task Name: Update Contract Status to Sent
# Parent User Story: [[US050-send-contract-to-customer|US050 - Send contract to client for signing]]
# Status: Done
# Priority: High
# Estimate: 1h

## Description
After successfully sending the contract email, update the contract status from "draft" to "sent" and record the sent timestamp. This marks the contract as delivered and awaiting client action.

## Acceptance Criteria
- Updates contract status to "sent" in the contracts table
- Sets sent_at timestamp to current time
- Stores email message_id for tracking
- Only transitions from "draft" status
- Returns the updated contract record
- Handles concurrent update conflicts

## Implementation Details
- **File(s)**: app/api/contract/send/route.ts
- **Approach**: After successful email delivery in the send endpoint, update the contract record using Supabase. Use a conditional update (WHERE status = 'draft') to prevent race conditions. Set status = 'sent', sent_at = now(), and email_message_id from the Gmail API response.

## Dependencies
- [[TASK101-send-contract-email|TASK101]] (Send contract email) - triggers this update
- Contracts table must have status, sent_at, email_message_id columns
