# Task ID: TASK146
# Task Name: Send Email with PDF Attachment
# Parent User Story: [[US076-send-proposal-email-with-pdf|US076 - Send Proposal Email with Attachment]]
# Status: Done
# Priority: Critical
# Estimate: 3h

## Description
Implement the ability to send emails with a PDF proposal attached. The Gmail MCP tool should support attaching a generated PDF file to the outgoing email, enabling the broker to send professional proposals to clients.

## Acceptance Criteria
- send_email MCP tool supports an optional attachment parameter
- PDF file is correctly encoded (base64) and attached to the email
- Attachment appears with correct filename (e.g., "Proposal-XXXX.pdf")
- Email body and attachment are both present in the sent message
- Large attachments (up to 25MB Gmail limit) are handled
- Error handling for missing/invalid attachment files
- Attachment MIME type is set correctly (application/pdf)

## Implementation Details
- **File(s)**: Gmail MCP server (send_email tool with attachment support)
- **Approach**: Extend the send_email tool to accept an optional attachments array. Each attachment includes filename, mimeType, and base64-encoded content. Construct a multipart MIME message with the body as one part and attachments as additional parts. Use proper Content-Disposition headers for attachments. Encode the complete message as base64url for the Gmail API.

## Dependencies
- [[TASK145-send-email-mcp|TASK145]] (base send_email functionality)
- [[TASK078-generate-pdf|TASK078]] (PDF generation provides the attachment)
