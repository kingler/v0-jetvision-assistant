# User Story ID: US078
# Title: Preview Email Before Sending
# Parent Epic: [[EPIC019-email-approval-workflow|EPIC019 - Email Approval Workflow]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want to preview an email before it's sent, so I can catch errors.

## Acceptance Criteria

### AC1: Preview shows email details
**Given** an email is being prepared
**When** the preview shows
**Then** I see subject, body, recipient, and any attachments

### AC2: Preview allows approve or reject
**Given** the preview renders
**When** I review it
**Then** I can approve or reject

## Tasks
- [[TASK149-generate-email-preview|TASK149 - Generate email preview]]
- [[TASK150-display-email-approval|TASK150 - Display EmailApprovalUI]]

## Technical Notes
- The `EmailApprovalUI` component renders the email preview with subject, body, recipient, and attachment list
- Preview is triggered automatically before any email send action as part of the human-in-the-loop workflow
- The component provides "Approve & Send" and "Reject & Re-draft" action buttons
- Email body is rendered as formatted HTML within the preview card
