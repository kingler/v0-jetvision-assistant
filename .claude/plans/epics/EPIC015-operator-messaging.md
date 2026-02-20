# Epic ID: EPIC015
# Epic Name: Operator Messaging
# Parent Feature: [[F006-avinode-marketplace-integration|F006 - Avinode Integration]]
# Status: Implemented
# Priority: High

## Description
Enables three-party messaging between ISO agents, the AI assistant, and aircraft operators through the Avinode platform. Messages are sent and received via MCP tools, displayed in threaded conversations grouped by operator and quote, and tracked for unread status. This communication channel is essential for negotiation, clarification, and coordination during the RFP process.

## Goals
- Enable bidirectional operator communication via the Avinode messaging system
- Display message threads organized per operator and per quote for easy navigation
- Track and display unread message counts to keep ISO agents informed
- Support AI-assisted message drafting for common operator interactions

## User Stories
- [[US064-view-operator-message-thread|US064 - View operator message thread: ISO agent views a chronological thread of messages exchanged with a specific operator for a given trip]]
- [[US065-send-message-to-operator|US065 - Send message to operator: ISO agent or AI assistant sends a message to an operator through the Avinode trip messaging system]]
- [[US066-receive-operator-message-notification|US066 - Receive operator message notification: ISO agent receives a real-time notification when an operator sends a new message]]
- [[US067-view-unread-message-count|US067 - View unread message count: ISO agent sees a badge indicating the number of unread operator messages across all active trips]]

## Acceptance Criteria Summary
- Message threads display all messages in chronological order with sender attribution
- Messages sent via the UI are delivered through the send_trip_message MCP tool
- Incoming operator messages (via webhook) appear in the thread within seconds via SSE
- Unread message count badge updates in real-time as new messages arrive
- Messages are persisted in the database and survive page refreshes
- Message threads are grouped by operator and associated quote/trip

## Technical Scope
- `components/avinode/operator-message-thread.tsx` - Threaded message display component
- `components/avinode/avinode-message-card.tsx` - Individual message card component
- `send_trip_message` MCP tool - Send messages to operators via Avinode
- `get_trip_messages` MCP tool - Retrieve message history for a trip
- TripChatSeller webhook event processing for incoming messages
- SSE real-time push for new message notifications
- Unread message tracking in Supabase
