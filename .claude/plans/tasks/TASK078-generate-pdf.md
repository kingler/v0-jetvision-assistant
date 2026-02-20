# Task ID: TASK078
# Task Name: Generate Proposal PDF
# Parent User Story: [[US039-generate-proposal-from-quote|US039 - Generate proposal from accepted quote]]
# Status: Done
# Priority: Critical
# Estimate: 5h

## Description
Implement PDF generation for charter flight proposals using @react-pdf/renderer. The generated PDF includes flight details (route, dates, aircraft type), pricing breakdown, company branding (logo, colors, contact information), and customer details. The PDF should be professionally formatted and ready for client delivery.

## Acceptance Criteria
- Generates a well-formatted PDF document with @react-pdf/renderer
- Includes flight route (departure/arrival airports), dates, and times
- Includes aircraft type, category, and operator information
- Includes pricing breakdown (base price, taxes, fees, total)
- Includes company branding (Jetvision logo, brand colors, footer)
- Includes customer name and contact details
- PDF renders correctly across PDF viewers (Preview, Adobe, Chrome)
- Returns a Buffer or Uint8Array suitable for storage upload

## Implementation Details
- **File(s)**: lib/services/proposal-service.ts
- **Approach**: Create a generateProposalPDF function that accepts structured proposal data and uses @react-pdf/renderer to build a Document with branded Page components. Define reusable Style objects for consistent formatting. Use Font.register for custom fonts if needed. Render to buffer with renderToBuffer().

## Dependencies
- @react-pdf/renderer package must be installed
- Company branding assets (logo) available in public/ directory
- Quote and request data structures defined in lib/types/
