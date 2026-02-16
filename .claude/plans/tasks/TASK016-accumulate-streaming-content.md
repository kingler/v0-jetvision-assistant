# Task ID: TASK016
# Task Name: Accumulate Streaming Content
# Parent User Story: [[US006-see-ai-typing-realtime|US006 - Parse and accumulate streaming response data]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Accumulate content chunks incrementally via the `onContent` handler in the `useStreamingChat` hook. Manage the growing content string and trigger re-renders efficiently.

## Acceptance Criteria
- Content chunks are appended to the accumulated string as they arrive
- State updates trigger re-renders of the streaming message component
- Accumulated content is available for persistence after stream completion
- Content accumulation is resilient to out-of-order or duplicate chunks
- Memory is managed efficiently for long responses
- Hook exposes `streamingContent`, `isStreaming`, and `streamError` states

## Implementation Details
- **File(s)**: `lib/chat/hooks/use-streaming-chat.ts`
- **Approach**: In the `useStreamingChat` hook, maintain a `streamingContent` state via `useState`. Pass an `onContent` callback to the SSE parser that appends each chunk: `setStreamingContent(prev => prev + chunk)`. Use `useRef` for the accumulator to avoid stale closure issues in rapid updates. Batch state updates using `React.startTransition` if needed for performance. Reset the accumulator when a new message is sent.

## Dependencies
- [[TASK015-implement-sse-parser|TASK015]] (SSE parser calls the onContent callback)
