# Task ID: TASK091
# Task Name: Render Email Approval UI Component
# Parent User Story: [[US045-preview-proposal-email|US045 - Review email before sending proposal]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Create the EmailApprovalUI composite component that renders the prepared email for user review before sending. The component displays the email subject, body preview, recipient information, and attached PDF reference. It provides Approve (Send), Edit, and Cancel actions.

## Acceptance Criteria
- Renders email subject line in an editable field
- Displays email body as formatted HTML preview
- Shows recipient email address with option to modify
- Shows PDF attachment indicator with filename and size
- "Send" button triggers the actual email sending (TASK092)
- "Edit" button enables inline editing of subject and body
- "Cancel" button discards the email draft
- Loading state while sending
- Success/error feedback after send attempt
- Responsive layout within chat interface

## Implementation Details
- **File(s)**: components/mcp-ui/composites/EmailApprovalUI.tsx
- **Approach**: Build as a composite MCP UI component following the existing pattern in components/mcp-ui/. Accept email data (subject, body_html, recipient, attachment_url) as props. Use controlled inputs for editable fields. Render HTML body safely using a sanitized preview. Wire the Send button to call the send_proposal_email flow (TASK092). Register in the tool-ui-registry for automatic rendering.

## Dependencies
- [[TASK090-call-prepare-proposal-email|TASK090]] (Prepare proposal email) - provides email data
- [[TASK092-send-proposal-email|TASK092]] (Send proposal email) - triggered by Send button
- MCP UI registry in lib/mcp-ui/tool-ui-registry.ts
