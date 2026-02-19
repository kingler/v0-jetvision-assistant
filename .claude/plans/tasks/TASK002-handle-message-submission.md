# Task ID: TASK002
# Task Name: Handle Message Submission
# Parent User Story: [[US001-send-message-to-ai|US001 - Send a message and receive a response]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Implement the message submission logic that POSTs user messages to the `/api/chat-sessions/messages` endpoint with sessionId, content, and userId. Handle the response stream and error cases.

## Acceptance Criteria
- POST request is sent to `/api/chat-sessions/messages` with correct payload shape `{ sessionId, content, userId }`
- Request includes proper headers (Content-Type, Authorization)
- Loading state is set before request and cleared after completion
- Network errors are caught and surfaced to the UI
- Duplicate submissions are prevented while a request is in-flight
- Session ID is resolved from current chat session context

## Implementation Details
- **File(s)**: `lib/chat/api/`
- **Approach**: Create a `sendMessage` function in the chat API layer that constructs the POST request with fetch. The function should return a ReadableStream for SSE consumption. Integrate with the `useStreamingChat` hook to manage loading and error states. Include request abort controller for cleanup on unmount.

## Dependencies
- [[TASK001-implement-chat-input|TASK001]] (ChatInput provides the user content)
