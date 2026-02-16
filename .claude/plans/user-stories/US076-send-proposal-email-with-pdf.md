# User Story ID: US076
# Title: Send Proposal Email with PDF
# Parent Epic: [[EPIC018-email-sending|EPIC018 - Email Communication]]
# Status: Implemented
# Priority: Critical
# Story Points: 3

## User Story
As an ISO agent, I want to send a proposal email with PDF attachment, so my client receives a professional offer.

## Acceptance Criteria

### AC1: Email includes PDF attachment
**Given** a proposal exists
**When** I send the email
**Then** it includes the PDF as an attachment

### AC2: Proposal status updates on send
**Given** sending succeeds
**When** confirmed
**Then** the proposal status updates to "sent"

## Tasks
- [[TASK146-send-email-attachment|TASK146 - Send email with attachment]]
- [[TASK147-update-proposal-sent|TASK147 - Update proposal status]]

## Technical Notes
- The proposal PDF is generated from quote data and client information
- Email is sent via Gmail MCP tool with the PDF attached as a base64-encoded attachment
- Upon successful send confirmation, the proposal record status is updated to "sent" in Supabase
- The Communication Manager Agent orchestrates the PDF generation and email sending workflow
