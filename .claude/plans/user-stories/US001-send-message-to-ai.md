# User Story ID: US001
# Title: Send Message to AI Assistant
# Parent Epic: [[EPIC001-chat-interface-core|EPIC001 - Core Chat Experience]]
# Status: Implemented
# Priority: Critical
# Story Points: 3

## User Story
As an ISO agent, I want to send a natural language message to the AI assistant, so that I can request flights, ask questions, and manage my workflow.

## Acceptance Criteria

### AC1: Send message via input
**Given** I am on the chat page
**When** I type a message and press Enter/send
**Then** the message appears in the chat as a user bubble

### AC2: Typing/streaming indicator
**Given** I send a message
**When** the AI processes it
**Then** I see a typing/streaming indicator

### AC3: Contextual conversation starters
**Given** the chat is empty
**When** I view conversation starters
**Then** I see contextual prompt suggestions (flight request, active requests, hot opportunities, deals)

## Tasks
- [[TASK001-implement-chat-input|TASK001 - Implement ChatInput component]]
- [[TASK002-handle-message-submission|TASK002 - Handle message submission to API]]
- [[TASK003-display-user-message-bubble|TASK003 - Display user message bubble]]

## Technical Notes
- ChatInput component lives in `components/chat-interface.tsx`
- Message submission calls the `/api/chat-sessions/messages` route
- User bubbles are rendered using the design system's message bubble component
- Conversation starters are driven by the `useSmartStarters` hook
- The chat input supports both Enter key and send button for submission
