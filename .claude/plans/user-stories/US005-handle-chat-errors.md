# User Story ID: US005
# Title: Handle Chat Errors Gracefully
# Parent Epic: [[EPIC001-chat-interface-core|EPIC001 - Core Chat Experience]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want errors to be handled gracefully in chat, so that I can recover without losing my work.

## Acceptance Criteria

### AC1: API error with retry
**Given** an API error occurs
**When** the chat fails
**Then** an error message displays with a retry button

### AC2: Streaming error preserves partial response
**Given** a streaming error
**When** the connection drops
**Then** the partial response is preserved and error shown

### AC3: Error boundary for component crashes
**Given** a component error
**When** a child component crashes
**Then** the error boundary catches it and shows fallback UI

## Tasks
- [[TASK012-implement-error-boundary|TASK012 - Implement error boundary]]
- [[TASK013-handle-streaming-errors|TASK013 - Handle streaming errors]]
- [[TASK014-display-error-retry|TASK014 - Display error with retry]]

## Technical Notes
- Error boundaries wrap the chat interface and individual message components
- Streaming errors are caught by the SSE parser and trigger graceful degradation
- Partial content accumulated before an error is preserved in the message state
- Retry logic re-submits the last user message to the API
- Error messages use the design system's error notification pattern
- Network errors vs. server errors are distinguished for appropriate user messaging
