# Epic ID: EPIC018
# Epic Name: Email Sending via Gmail MCP
# Parent Feature: [[F008-email-communication|F008 - Communication & Email]]
# Status: Implemented
# Priority: High

## Description
Provides email sending capabilities through the Gmail MCP integration using OAuth 2.0 authentication. The system supports sending general emails, proposal emails with PDF attachments, and quote summary emails to clients. All emails are sent through the ISO agent's authenticated Gmail account, maintaining a professional and personal communication channel.

## Goals
- Send professional emails to clients including proposals, quote summaries, and general correspondence
- Support PDF attachment delivery for formal proposal documents
- Authenticate via OAuth 2.0 to send emails from the ISO agent's own Gmail account
- Provide specialized email templates for different communication types (proposals, quotes, general)

## User Stories
- [[US075-send-general-email|US075 - Send general email: ISO agent sends a general-purpose email to a client through the AI assistant]]
- [[US076-send-proposal-email-with-pdf|US076 - Send proposal email with PDF: ISO agent sends a formal proposal email with an attached PDF document containing flight options and pricing]]
- [[US077-send-quote-summary-email|US077 - Send quote summary email: ISO agent sends a formatted summary of selected quotes to a client for review]]

## Acceptance Criteria Summary
- Emails are sent successfully through the authenticated Gmail account via OAuth 2.0
- Proposal emails include properly formatted PDF attachments
- Quote summary emails contain structured pricing and flight option details
- Email sending failures are handled gracefully with retry logic and user notification
- Sent emails are logged in the system for audit trail purposes
- Email templates produce professional, branded output appropriate for charter aviation

## Technical Scope
- Gmail MCP tools: send_email, send_proposal_email, send_quote_email
- `app/api/email/` - Email API routes for orchestration
- OAuth 2.0 authentication flow for Gmail access
- PDF generation for proposal attachments
- Email template formatting and content generation
- Error handling and retry logic for transient Gmail API failures
