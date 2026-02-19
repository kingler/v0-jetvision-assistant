# Task ID: TASK154
# Task Name: Regenerate Email Draft
# Parent User Story: [[US080-reject-redraft-email|US080 - Reject and Revise Email]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Enable the AI agent to generate a revised email draft when the user rejects the initial version. The agent should incorporate the user's feedback and produce an updated email while maintaining the proposal's core content.

## Acceptance Criteria
- Agent receives the rejection feedback and revision instructions
- Revised draft incorporates the user's specific feedback
- Core proposal details (route, pricing, aircraft) remain accurate
- Revised draft maintains professional tone and formatting
- New draft is presented in the same EmailApprovalUI component
- Conversation history provides context for the revision
- Multiple revision rounds are supported without data loss

## Implementation Details
- **File(s)**: Agent response (JetvisionAgent conversation handling)
- **Approach**: When the user rejects a draft with feedback, the message is sent to the agent as a regular chat message. The agent's system prompt and conversation history provide context about the original draft and the proposal. The agent calls prepare_proposal_email again with the additional instruction context. The new draft is returned and rendered via the EmailApprovalUI component.

## Dependencies
- [[TASK153-handle-reject-action|TASK153]] (rejection triggers the revision request)
- [[TASK149-generate-email-preview|TASK149]] (prepare_proposal_email tool generates the new draft)
