# User Story ID: US065
# Title: Send Message to Operator
# Parent Epic: [[EPIC015-operator-messaging|EPIC015 - Operator Messaging]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want to send a message to an operator, so I can negotiate or ask questions.

## Acceptance Criteria

### AC1: Message sends via MCP tool
**Given** I'm in an operator thread
**When** I type and send a message
**Then** it's sent via send_trip_message MCP tool

### AC2: Sent message appears in thread
**Given** the message sends
**When** confirmed
**Then** it appears in the thread as my message

## Tasks
- [[TASK127-send-message-ui|TASK127 - Implement send message UI]]
- [[TASK128-call-send-trip-message|TASK128 - Call send_trip_message MCP]]

## Technical Notes
- The send message UI provides a text input and send button within the operator thread view
- Messages are sent via the `send_trip_message` MCP tool with trip_id and message content
- A `TripChatMine` webhook confirmation event is expected after successful send
- The message is optimistically added to the thread UI before webhook confirmation arrives
