# User Story ID: US039
# Title: Generate Proposal from Quote
# Parent Epic: [[EPIC009-proposal-generation|EPIC009 - Proposal Generation]]
# Status: Implemented
# Priority: Critical
# Story Points: 5

## User Story
As an ISO agent, I want to generate a PDF proposal from a selected quote, so that I can present a professional offer to my client.

## Acceptance Criteria

### AC1: PDF generation with complete details
**Given** a quote is selected
**When** I request proposal generation
**Then** a PDF is generated with flight details, aircraft info, pricing, and branding

### AC2: Proposal record creation
**Given** the proposal generates
**When** it completes
**Then** a proposal record is created with unique proposal_number, linked to quote and request

### AC3: Proposal preview in chat
**Given** the PDF is ready
**When** it renders in chat
**Then** I see a ProposalPreview component with key details

## Tasks
- [[TASK077-proposal-generation-api|TASK077 - Implement proposal generation API]]
- [[TASK078-generate-pdf|TASK078 - Generate PDF with @react-pdf/renderer]]
- [[TASK079-create-proposal-record|TASK079 - Create proposal record in database]]

## Technical Notes
- Uses @react-pdf/renderer for PDF generation
- Proposal record includes unique proposal_number, linked to both the originating quote and flight request
- ProposalPreview component renders inline in the chat interface with key flight and pricing details
- PDF includes company branding, flight route, aircraft specifications, and itemized pricing
