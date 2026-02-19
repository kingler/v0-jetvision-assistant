# Task ID: TASK031
# Task Name: Wire Send and Download Actions
# Parent User Story: [[US012-view-proposal-preview|US012 - Preview and send client proposals]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement the send and download button handlers in the proposal preview component. "Send to Client" triggers an email via the Gmail MCP, and "Download PDF" generates and downloads a PDF version of the proposal.

## Acceptance Criteria
- "Send to Client" button calls the proposal send API endpoint
- Email is sent via Gmail MCP with the proposal content
- Success confirmation is shown after email is sent
- "Download PDF" button generates a PDF and triggers browser download
- PDF includes all proposal details in a professional layout
- Loading states are shown on buttons while actions are in progress
- Error handling with user-friendly messages for both actions
- Buttons are disabled after successful send to prevent duplicates

## Implementation Details
- **File(s)**: `components/message-components/proposal-preview.tsx`
- **Approach**: For "Send to Client", call `POST /api/proposals/send` with the proposal ID. The API route uses the Gmail MCP to send the email. Show a toast notification on success. For "Download PDF", call `GET /api/proposals/{id}/pdf` which returns a PDF blob. Use `URL.createObjectURL` and a hidden anchor tag to trigger the download. Disable the send button and show "Sent" status after successful email delivery.

## Dependencies
- [[TASK030-implement-proposal-preview|TASK030]] (proposal preview component contains the buttons)
