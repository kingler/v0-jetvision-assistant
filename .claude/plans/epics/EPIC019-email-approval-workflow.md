# Epic ID: EPIC019
# Epic Name: Email Approval Workflow
# Parent Feature: [[F008-email-communication|F008 - Communication & Email]]
# Status: Implemented
# Priority: High

## Description
Implements a review-and-approve workflow for outbound emails to ensure quality and accuracy before delivery. The AI assistant drafts an email, presents it in a rich preview UI for the ISO agent to review, and requires explicit approval before sending. If the agent is unsatisfied, they can reject the draft and request revisions. The workflow also supports checking the inbox for client replies to sent proposals.

## Goals
- Generate polished email drafts for ISO agent review before sending
- Display a rich email preview with recipient, subject, body, and attachment details
- Require explicit approval to prevent accidental or premature email delivery
- Support rejection with feedback to trigger re-drafting of the email content
- Enable inbox monitoring for client replies to sent proposals

## User Stories
- [[US078-preview-email-before-sending|US078 - Preview email before sending: ISO agent reviews a formatted preview of the AI-drafted email including recipient, subject, body, and attachments]]
- [[US079-approve-email-to-send|US079 - Approve email to send: ISO agent clicks an approve button to authorize sending the reviewed email]]
- [[US080-reject-redraft-email|US080 - Reject and re-draft email: ISO agent rejects the draft and provides feedback, prompting the AI to generate a revised version]]
- [[US081-check-inbox-for-replies|US081 - Check inbox for customer replies: ISO agent or AI assistant checks the inbox for replies to previously sent proposal emails]]

## Acceptance Criteria Summary
- Email preview renders the full email content in a visually accurate format
- Approval action triggers immediate email delivery via Gmail MCP
- Rejection action prompts the AI to re-draft based on the agent's feedback
- No email is sent without explicit user approval (no automatic sending)
- Approval and rejection actions are logged for audit purposes
- Inbox check returns relevant client replies matched to the original proposal
- The approval UI is accessible from within the chat interface

## Technical Scope
- `prepare_proposal_email` MCP tool - Generates email draft for review
- `app/api/proposal/approve-email/` - API route for email approval action
- `components/mcp-ui/composites/EmailApprovalUI.tsx` - Email preview and approval UI component
- `app/api/inbox/check-replies/` - API route for checking client replies
- Approval state management (pending, approved, rejected, sent)
- Integration with Gmail MCP send_email for delivery upon approval
