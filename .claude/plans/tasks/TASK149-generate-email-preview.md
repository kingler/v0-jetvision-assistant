# Task ID: TASK149
# Task Name: Generate Email Preview
# Parent User Story: [[US078-preview-email-before-sending|US078 - Email Draft Preview]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Call the prepare_proposal_email agent tool to generate an email draft preview. The draft should include the proposal details, client greeting, and flight details in a professional email format that the user can review before sending.

## Acceptance Criteria
- prepare_proposal_email generates a complete email draft
- Draft includes professional greeting with client name
- Draft includes proposal summary (route, dates, aircraft, pricing)
- Draft includes terms and conditions summary
- Draft subject line is auto-generated based on proposal content
- Draft can be customized with optional user instructions
- Draft is returned in both HTML and plain text formats

## Implementation Details
- **File(s)**: Agent tool execution (JetvisionAgent)
- **Approach**: Implement a prepare_proposal_email tool that takes proposal_id and optional customization instructions. Fetch the proposal data including client, quotes, and flight details. Use the AI model to generate a professional email body. Return the draft with subject, body (HTML), and body (plain text) for preview rendering.

## Dependencies
- Proposal data available (TASK077-TASK079)
- Client data linked to proposal (TASK139)
