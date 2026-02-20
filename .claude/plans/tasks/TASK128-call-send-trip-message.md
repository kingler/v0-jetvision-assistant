# Task ID: TASK128
# Task Name: Call send_trip_message MCP Tool
# Parent User Story: [[US065-send-message-to-operator|US065 - Send Message to Operator]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement the backend logic to call the Avinode send_trip_message MCP tool when a user sends a message to an operator. The agent should route the message through the appropriate MCP server and handle the response.

## Acceptance Criteria
- send_trip_message MCP tool is called with correct parameters (trip_id, operator_id, message_content)
- Successful send returns confirmation with message ID
- Failed send returns meaningful error message
- Sent message is stored in the database with TripChatMine event type
- Message metadata (timestamp, trip context) is preserved
- Rate limiting is respected for the Avinode API

## Implementation Details
- **File(s)**: Agent tool execution (JetvisionAgent)
- **Approach**: When the user sends a message from the operator thread UI, the request flows through the chat API to the JetvisionAgent. The agent invokes the send_trip_message tool on the Avinode MCP server with the trip ID, recipient operator ID, and message body. On success, store the outgoing message in the database. Return the result to the UI for confirmation.

## Dependencies
- Avinode MCP server with send_trip_message tool available
- [[TASK127-send-message-ui|TASK127]] (UI component that triggers the send)
