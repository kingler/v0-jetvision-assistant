# Task ID: TASK151
# Task Name: Handle Approve Action
# Parent User Story: [[US079-approve-email-to-send|US079 - Approve and Send Email]]
# Status: Done
# Priority: Critical
# Estimate: 2h

## Description
Handle the "Approve & Send" action in the EmailApprovalUI component. When the user clicks approve, the system should trigger the send_proposal_email flow to actually send the email with the approved content.

## Acceptance Criteria
- Clicking "Approve & Send" triggers the email send flow
- Button shows loading state during send operation
- Button is disabled after click to prevent double-sends
- Success confirmation is displayed in the chat after send
- Error message is displayed if send fails
- Proposal status is updated to reflect the send action
- Approved email content cannot be modified after approval

## Implementation Details
- **File(s)**: components/mcp-ui/composites/EmailApprovalUI.tsx
- **Approach**: Add an onClick handler to the "Approve & Send" button that calls the approve-email API endpoint. Pass the proposal_id and approved email content (subject, body, to). Show a loading spinner on the button. On success, update the component state to show "Sent" confirmation. On failure, show an error toast and re-enable the button. Emit a chat message confirming the action.

## Dependencies
- [[TASK150-display-email-approval|TASK150]] (EmailApprovalUI renders the button)
- [[TASK152-send-on-approval|TASK152]] (API endpoint handles the actual send)
