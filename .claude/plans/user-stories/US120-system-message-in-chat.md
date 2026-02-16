# User Story ID: US120
# Title: System Messages in Chat for Events
# Parent Epic: [[EPIC029-notification-display|EPIC029 - Agent Notification & Chat Integration]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want system messages in chat for events, so I have a log of what happened.

## Acceptance Criteria

### AC1: Single Quote System Message
**Given** a quote arrives from an operator
**When** the agent notification formats the message
**Then** a system message appears in chat: "New quote received from [operator]."

### AC2: Batched Quote System Message
**Given** multiple quotes arrive in quick succession
**When** the batch formatter processes them
**Then** a single message displays: "3 new quotes received from [op1], [op2], and [op3]."

## Tasks
- [[TASK225-format-agent-notifications|TASK225 - Format agent notification messages for single and batch quote events]]
- [[TASK226-persist-system-messages|TASK226 - Persist system messages to the chat session in the database]]

## Technical Notes
- Agent notifications formatted in `lib/chat/agent-notifications.ts`
- Messages persisted via `lib/conversation/message-persistence.ts`
- System messages have role: 'system' and display with distinct styling
- Batch window: events within 5 seconds are grouped together
- Messages include metadata (quoteIds, operator names) for linking to details
