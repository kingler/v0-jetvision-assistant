# Task ID: TASK030
# Task Name: Implement Proposal Preview Component
# Parent User Story: [[US012-view-proposal-preview|US012 - Preview and send client proposals]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Implement the proposal preview component that displays a formatted flight proposal with flight details, pricing breakdown, terms, and action buttons for sending or downloading.

## Acceptance Criteria
- Proposal header shows client name and request reference
- Flight details section shows route, dates, aircraft, and operator
- Pricing breakdown displays base price, taxes, fees, and total
- Terms and conditions section is collapsible
- "Send to Client" and "Download PDF" action buttons are visible
- Proposal content matches the email template format
- Component supports both one-way and round-trip proposals
- Print-friendly layout when downloaded as PDF

## Implementation Details
- **File(s)**: `components/message-components/proposal-preview.tsx`
- **Approach**: Create a `ProposalPreview` component that receives a `proposal` object with flight details, pricing, client info, and terms. Layout with a professional document-style design using card tokens. Include a header with company branding, flight details table, pricing breakdown table, and terms section. Add "Send to Client" and "Download PDF" buttons in the footer. Use `@react-pdf/renderer` or server-side PDF generation for the download feature.

## Dependencies
- [[TASK022-render-quote-ui|TASK022]] (quote data feeds into proposal generation)
