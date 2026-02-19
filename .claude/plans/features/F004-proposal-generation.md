# Feature ID: F004
# Feature Name: Proposal Generation
# Status: Implemented
# Priority: Critical

## Description
Professional proposal generation and delivery system that transforms selected operator quotes into client-ready PDF proposals with customizable margins. The feature includes an email approval workflow where brokers can preview the proposal email, adjust markup or discounts, select the target customer, and approve before sending. It supports both one-way and round-trip proposals with sequential numbering for tracking.

## Business Value
Proposal generation is the revenue-critical step where broker expertise translates into margin. By automating PDF creation from structured quote data while preserving broker control over pricing adjustments and email content, the system dramatically reduces time-to-proposal from hours to minutes. The approval workflow ensures every outgoing proposal meets professional standards while the margin controls protect and optimize broker revenue. Proposal tracking provides pipeline visibility for sales management.

## Key Capabilities
- Generate professional PDF proposals from selected quotes using @react-pdf/renderer
- Margin adjustment with configurable markup and discount percentages
- Email preview before sending with editable subject and body
- Customer selection for targeting the correct client contact
- Multi-step proposal email approval workflow:
  1. Prepare - Select quote and configure pricing
  2. Review - Preview PDF and email content
  3. Approve - Confirm and authorize sending
  4. Send - Deliver via Gmail integration
- Proposal status tracking through lifecycle stages
- Sequential proposal numbering for reference and tracking
- Round-trip proposal support combining outbound and return legs
- Pricing summary with base cost, margin, taxes, and total breakdown

## Related Epics
- [[EPIC009-proposal-generation|EPIC009 - Proposal Generation]]
- [[EPIC010-proposal-delivery|EPIC010 - Proposal Delivery]]

## Dependencies
- [[F003-quote-management|F003 - Quote Management (proposals are generated from selected quotes)]]
- [[F007-crm-client-management|F007 - Gmail Integration (proposals are delivered via email)]]
- [[F008-email-communication|F008 - Customer/CRM Management (customer selection for proposal recipients)]]

## Technical Components
- `app/api/proposal/` - API routes for proposal generation, preview, and delivery
- `components/proposal/` - Proposal preview, margin adjustment, and status UI components
- `lib/services/proposal-service.ts` - Core proposal generation service with PDF creation and email formatting
- `components/mcp-ui/composites/EmailApprovalUI.tsx` - Multi-step email approval workflow component
- `@react-pdf/renderer` - PDF generation library for professional proposal documents
- `lib/types/proposal.ts` - Proposal type definitions and status enums
- `components/chat/` - Chat-embedded proposal cards and approval interactions
