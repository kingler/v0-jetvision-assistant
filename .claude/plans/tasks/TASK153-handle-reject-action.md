# Task ID: TASK153
# Task Name: Handle Reject Action
# Parent User Story: [[US080-reject-redraft-email|US080 - Reject and Revise Email]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
Handle the "Edit/Reject" action in the EmailApprovalUI component. When the user rejects the email draft, the system should return control to the AI to generate a revised version based on the user's feedback.

## Acceptance Criteria
- Clicking "Edit/Reject" opens a feedback input for revision instructions
- User can provide specific feedback on what to change
- Rejection triggers a new AI-generated draft with the feedback incorporated
- Original draft is preserved for reference
- EmailApprovalUI is replaced with a new draft after revision
- User can reject multiple times until satisfied
- Cancel option closes the feedback input without rejecting

## Implementation Details
- **File(s)**: components/mcp-ui/composites/EmailApprovalUI.tsx
- **Approach**: Add an onClick handler to the "Edit/Reject" button that toggles a textarea for user feedback. On submit, send a message to the chat with the rejection reason and revision instructions. The AI agent processes this as a new request to regenerate the email draft. The component transitions to a "Revising..." state until the new draft arrives.

## Dependencies
- [[TASK150-display-email-approval|TASK150]] (EmailApprovalUI renders the reject button)
- [[TASK154-regenerate-email-draft|TASK154]] (AI generates revised draft)
