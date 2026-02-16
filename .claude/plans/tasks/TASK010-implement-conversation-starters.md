# Task ID: TASK010
# Task Name: Implement Conversation Starters
# Parent User Story: [[US004-use-conversation-starters|US004 - See conversation starter prompts on empty chat]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Create starter prompt components that are displayed when the chat is empty. These provide quick-start options for common user intents (e.g., "Search for flights", "Check my bookings").

## Acceptance Criteria
- Starter prompts are displayed when the message list is empty
- Each prompt is a clickable card/button with an icon and label
- Clicking a starter inserts the prompt text and submits it
- Starters disappear once the first message is sent
- Layout is responsive (grid on desktop, stack on mobile)
- Starters use design system tokens for styling

## Implementation Details
- **File(s)**: `components/conversation-starters/`
- **Approach**: Create a `ConversationStarters` container component and individual `StarterCard` components. Define a default set of starter prompts with icons, labels, and prompt text. Render in a responsive grid layout. On click, call the `onSend` callback from the chat context with the starter's prompt text. Conditionally render only when `messages.length === 0`.

## Dependencies
- [[TASK001-implement-chat-input|TASK001]] (ChatInput onSend callback to submit the starter text)
