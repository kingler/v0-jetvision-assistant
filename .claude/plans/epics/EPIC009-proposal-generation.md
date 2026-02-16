# Epic ID: EPIC009
# Epic Name: Proposal Generation
# Parent Feature: [[F004-proposal-generation|F004 - Proposal & Email Workflow]]
# Status: Implemented
# Priority: Critical

## Description
Professional PDF proposal generation from selected operator quotes with branding, margin adjustment, and preview capabilities. This epic covers the end-to-end proposal document creation pipeline including flight detail formatting, pricing with configurable broker margins, company branding, round-trip support, PDF rendering via React PDF, and the ability to preview and regenerate proposals before delivery.

## Goals
- Generate professional PDF proposals from selected quotes with flight details and pricing
- Support configurable broker margin adjustment with real-time price recalculation
- Include company branding (logo, colors, contact information) in generated proposals
- Handle round-trip proposals with multiple flight legs displayed correctly
- Provide proposal preview and regeneration capabilities before final delivery

## User Stories
- [[US039-generate-proposal-from-quote|US039 - Generate proposal from quote]]
- [[US040-adjust-proposal-margin|US040 - Adjust proposal margin]]
- [[US041-preview-proposal-before-sending|US041 - Preview proposal before sending]]
- [[US042-regenerate-proposal|US042 - Regenerate proposal]]
- [[US043-upload-proposal-pdf|US043 - Upload proposal PDF]]

## Acceptance Criteria Summary
- PDF proposal includes all flight details (route, date, time, aircraft, operator)
- Pricing section shows client-facing price with broker margin applied (not visible to client)
- Margin adjustment recalculates total price and regenerates the PDF
- Company branding (logo, header, footer, colors) renders correctly in the PDF
- Round-trip proposals show both outbound and return legs with combined pricing
- Preview renders the proposal inline in the chat before committing to send
- Regeneration creates a new version while preserving the generation history
- Generated PDF is uploaded and stored for attachment to proposal emails

## Technical Scope
- app/api/proposal/generate/ - Proposal PDF generation endpoint
- app/api/proposal/[id]/margin/ - Margin adjustment endpoint
- lib/services/proposal-service.ts - Core proposal generation business logic
- @react-pdf/renderer - PDF rendering library for document generation
- Supabase proposals table - Proposal metadata and version tracking
- File storage for generated PDF documents
