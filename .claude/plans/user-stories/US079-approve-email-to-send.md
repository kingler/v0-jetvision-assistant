# User Story ID: US079
# Title: Approve Email to Send
# Parent Epic: [[EPIC019-email-approval-workflow|EPIC019 - Email Approval Workflow]]
# Status: Implemented
# Priority: Critical
# Story Points: 2

## User Story
As an ISO agent, I want to approve an email before it sends, so nothing goes out without my confirmation.

## Acceptance Criteria

### AC1: Approve triggers send and shows confirmation
**Given** I click "Approve & Send"
**When** the email sends
**Then** confirmation shows and status updates

## Tasks
- [[TASK151-handle-approve-action|TASK151 - Handle approve action]]
- [[TASK152-send-on-approval|TASK152 - Send email on approval]]

## Technical Notes
- The approve action triggers the actual email send via Gmail MCP tool
- A confirmation message is displayed in the chat upon successful send
- The email record status is updated from "draft" to "sent" in the database
- If the send fails, an error message is displayed with retry options
