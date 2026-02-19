# Task ID: TASK006
# Task Name: Extract and Display Tool Calls
# Parent User Story: [[US002-view-ai-streaming-response|US002 - See assistant response stream in real-time]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Extract tool call results from the SSE data stream and display them using the ToolUIRenderer component. Each tool call should be rendered with an appropriate UI component based on the tool name.

## Acceptance Criteria
- Tool call events are detected in the SSE stream
- Tool name is mapped to the correct UI component via the tool-ui-registry
- Tool call results are rendered inline within the message flow
- Loading state is shown while a tool call is in progress
- Error state is shown if a tool call fails
- Multiple tool calls in a single response are rendered sequentially

## Implementation Details
- **File(s)**: `components/mcp-ui/ToolUIRenderer.tsx`
- **Approach**: The ToolUIRenderer receives a `toolName` and `toolResult` and looks up the appropriate component from `lib/mcp-ui/tool-ui-registry.ts`. Render the matched component with the tool result data as props. If no matching component is found, render a generic JSON display. Handle loading and error states with appropriate UI feedback.

## Dependencies
- [[TASK004-implement-sse-streaming-parser|TASK004]] (SSE parser extracts tool call data)
