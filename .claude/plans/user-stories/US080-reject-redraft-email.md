# User Story ID: US080
# Title: Reject and Re-draft Email
# Parent Epic: [[EPIC019-email-approval-workflow|EPIC019 - Email Approval Workflow]]
# Status: Implemented
# Priority: Medium
# Story Points: 2

## User Story
As an ISO agent, I want to reject and re-draft an email, so I can improve the messaging.

## Acceptance Criteria

### AC1: Rejection triggers revised draft
**Given** I reject an email
**When** the AI receives rejection
**Then** it generates a revised draft

## Tasks
- [[TASK153-handle-reject-action|TASK153 - Handle reject action]]
- [[TASK154-regenerate-email-draft|TASK154 - Re-generate email draft]]

## Technical Notes
- The reject action sends the rejection context back to the AI agent for re-drafting
- The agent can optionally accept feedback text explaining what to change
- A new draft is generated and presented via the `EmailApprovalUI` preview again
- The reject/re-draft cycle can repeat until the agent approves the email
