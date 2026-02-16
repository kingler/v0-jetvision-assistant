# User Story ID: US045
# Title: Preview Proposal Email
# Parent Epic: [[EPIC010-proposal-delivery|EPIC010 - Proposal Delivery]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want to preview the proposal email before it's sent, so that I can verify the messaging.

## Acceptance Criteria

### AC1: Email preview content
**Given** I'm about to send
**When** prepare_proposal_email runs
**Then** I see email subject, body, recipient, and attached PDF preview

### AC2: Approval/rejection actions
**Given** the preview shows
**When** I see the EmailApprovalUI
**Then** I have "Approve & Send" and "Reject" buttons

## Tasks
- [[TASK090-call-prepare-proposal-email|TASK090 - Call prepare_proposal_email MCP tool]]
- [[TASK091-render-email-approval-ui|TASK091 - Render EmailApprovalUI]]

## Technical Notes
- The prepare_proposal_email MCP tool generates the email content (subject, body) based on proposal and customer data
- EmailApprovalUI component renders the full email preview with recipient, subject, body, and PDF attachment indicator
- "Approve & Send" triggers the actual email send flow; "Reject" returns to editing
- Email body is AI-generated and can be reviewed before approval
