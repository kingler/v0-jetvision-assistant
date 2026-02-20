# Task ID: TASK150
# Task Name: Display Email Approval UI
# Parent User Story: [[US078-preview-email-before-sending|US078 - Email Draft Preview]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Render the EmailApprovalUI component in the chat interface to display the email draft for user review. The component should show the email subject, body preview, recipient, and provide approve/reject action buttons.

## Acceptance Criteria
- EmailApprovalUI renders within the chat message flow
- Displays email subject line prominently
- Displays recipient email address
- Shows email body in a preview panel with proper formatting
- Includes "Approve & Send" and "Edit/Reject" action buttons
- Preview panel is scrollable for long emails
- Component matches the design system styling
- Loading state shown while draft is being generated

## Implementation Details
- **File(s)**: components/mcp-ui/composites/EmailApprovalUI.tsx
- **Approach**: Build a composite UI component that receives the email draft data (subject, to, body HTML). Render a card with the email details in a preview layout. Include action buttons at the bottom. Use an iframe or dangerouslySetInnerHTML (sanitized) for the HTML body preview. Register the component in the tool-ui-registry for automatic rendering.

## Dependencies
- [[TASK149-generate-email-preview|TASK149]] (email draft generation provides the data)
- Tool UI registry (lib/mcp-ui/tool-ui-registry.ts)
