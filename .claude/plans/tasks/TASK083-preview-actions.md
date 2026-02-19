# Task ID: TASK083
# Task Name: Proposal Preview Action Buttons
# Parent User Story: [[US041-preview-proposal-before-sending|US041 - Preview proposal before sending]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Wire up the action buttons within the proposal preview component: "Send to Client" triggers the email approval flow, "Download PDF" downloads the generated PDF, and "Edit Margin" opens the margin edit modal. Each button should have appropriate loading states and error handling.

## Acceptance Criteria
- "Send to Client" button triggers the email approval UI flow (TASK091)
- "Download PDF" button downloads the PDF from Supabase Storage
- "Edit Margin" button opens the MarginEditModal (TASK080)
- All buttons show loading spinners during async operations
- Disabled states when actions are not available (e.g., no PDF generated yet)
- Error toast notifications on failure
- Buttons use design system Button component with appropriate variants

## Implementation Details
- **File(s)**: components/message-components/proposal-preview.tsx
- **Approach**: Add an action bar at the bottom of the proposal preview card. Each button calls the appropriate handler: sendToClient opens EmailApprovalUI, downloadPDF fetches the file_url and triggers browser download, editMargin sets modal open state. Use the Button component with primary/secondary/outline variants. Wrap async handlers in try/catch with toast notifications.

## Dependencies
- [[TASK082-proposal-preview-component|TASK082]] (Proposal preview component) - parent component
- [[TASK080-margin-edit-modal|TASK080]] (Margin edit modal) - opened by Edit Margin button
- [[TASK091-render-email-approval-ui|TASK091]] (Email approval UI) - triggered by Send button
- [[TASK085-upload-pdf-storage|TASK085]] (Upload PDF) - PDF must be available for download
