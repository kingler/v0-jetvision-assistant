# Epic ID: EPIC010
# Epic Name: Proposal Delivery
# Parent Feature: [[F004-proposal-generation|F004 - Proposal & Email Workflow]]
# Status: Implemented
# Priority: Critical

## Description
Proposal delivery to clients via email with a human-in-the-loop approval workflow. This epic covers customer selection from the CRM, AI-generated email composition with proposal summary, email preview and approval before sending, PDF attachment handling, delivery status tracking, and monitoring for customer replies.

## Goals
- Generate personalized proposal emails with AI-composed content for review
- Enable customer selection from the CRM database for accurate recipient details
- Provide full email preview with subject, body, and attachment before sending
- Require explicit user approval before dispatching the proposal email
- Track delivery status and monitor for customer reply emails

## User Stories
- [[US044-select-customer-for-proposal|US044 - Select customer for proposal]]
- [[US045-preview-proposal-email|US045 - Preview proposal email]]
- [[US046-approve-send-proposal-email|US046 - Approve and send proposal email]]
- [[US047-track-proposal-sent-status|US047 - Track proposal sent status]]
- [[US048-check-customer-reply|US048 - Check for customer reply]]

## Acceptance Criteria Summary
- Customer selector searches CRM and displays matching contacts with email addresses
- AI-generated email includes personalized greeting, flight summary, and professional closing
- Email preview card shows subject line, recipient, body text, and attached PDF filename
- Approve action sends the email via Gmail MCP with the proposal PDF attached
- Sent confirmation card displays timestamp, recipient, and delivery status
- Proposal status updates to "sent" in the database after successful delivery
- Reply check queries Gmail for responses from the customer email address
- Rejection of the email draft allows editing and regeneration without sending

## Technical Scope
- app/api/proposal/send/ - Email sending endpoint via Gmail MCP
- app/api/proposal/approve-email/ - Email approval workflow endpoint
- components/email/email-preview-card.tsx - Email preview and approval UI
- components/mcp-ui/composites/EmailApprovalUI.tsx - Composite email approval flow
- Gmail MCP server - Email composition and sending
- Supabase customers table - CRM customer lookup
- Supabase proposals table - Delivery status tracking
