# Task ID: TASK014
# Task Name: Display Error with Retry Button
# Parent User Story: [[US005-handle-chat-errors|US005 - See graceful error handling when things go wrong]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
Show a user-friendly error message with a retry button when a message fails to send or the streaming response encounters an error.

## Acceptance Criteria
- Error message is displayed inline in the message list
- Error includes a human-readable description (not raw error codes)
- "Retry" button is visible and triggers re-submission of the failed message
- Error styling is visually distinct (warning/error color tokens)
- Error can be dismissed by the user
- Multiple consecutive errors stack correctly in the message list

## Implementation Details
- **File(s)**: `components/chat-interface/components/ErrorDisplay.tsx`
- **Approach**: Create an `ErrorDisplay` component that receives `error` and `onRetry` props. Display the error message with an alert/warning icon. Render a "Retry" button that calls `onRetry`. Use design system error color tokens (destructive palette). Include an optional "Dismiss" action. Integrate into the message list so errors appear in the conversation flow at the point of failure.

## Dependencies
- [[TASK013-handle-streaming-errors|TASK013]] (streaming errors provide the error data)
- [[TASK008-render-message-list-scroll|TASK008]] (message list renders the error display)
