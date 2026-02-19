# Feature ID: F008
# Feature Name: Email Communication
# Status: Implemented
# Priority: High

## Description
Email communication system powered by Gmail MCP for sending proposals, quotes, and general correspondence to clients. Features an approval-before-send workflow where the AI drafts emails for human review, ensuring no communication is sent without explicit agent confirmation.

## Business Value
Professional email communication is the primary channel for delivering charter flight proposals to clients. This feature automates the tedious process of composing proposal emails with flight details, pricing, and PDF attachments while maintaining human oversight through the approval workflow. Mock mode enables safe development and testing without sending real emails.

## Key Capabilities
- Send emails via Gmail MCP server using OAuth 2.0 authentication
- Proposal email generation with structured flight details and PDF attachment
- Quote email composition with operator pricing and aircraft specifications
- Email approval workflow: prepare_proposal_email generates draft, agent reviews, send_proposal_email dispatches
- Email preview card showing full content before sending
- Check for customer replies via inbox monitoring endpoint
- Mock mode for development that simulates email sending without Gmail API calls
- Email templates with dynamic content injection (client name, flight details, pricing)

## Related Epics
- [[EPIC018-email-sending|EPIC018 - Email Sending]]
- [[EPIC019-email-approval-workflow|EPIC019 - Email Approval Workflow]]

## Dependencies
- [[F004-proposal-generation|F004 - Proposal Generation (proposals must exist before emailing)]]
- [[F007-crm-client-management|F007 - CRM Client Management (client email addresses and contact details)]]

## Technical Components
- `mcp-servers/gmail/` - Gmail MCP server with OAuth 2.0 token management
- `app/api/email/` - Email API routes for sending and template management
- `components/email/email-preview-card.tsx` - Email preview and approval UI component
- `app/api/inbox/check-replies/` - Endpoint for monitoring client reply status
- Gmail MCP tools: `prepare_proposal_email`, `send_proposal_email`, `send_email`
- OAuth 2.0 credentials stored securely in environment variables
