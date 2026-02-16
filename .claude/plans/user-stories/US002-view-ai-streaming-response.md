# User Story ID: US002
# Title: View AI Streaming Response
# Parent Epic: [[EPIC001-chat-interface-core|EPIC001 - Core Chat Experience]]
# Status: Implemented
# Priority: Critical
# Story Points: 5

## User Story
As an ISO agent, I want to see the AI response stream in real-time, so that I don't have to wait for the full response before reading.

## Acceptance Criteria

### AC1: Character-by-character streaming
**Given** I sent a message
**When** the AI starts responding
**Then** text appears character-by-character

### AC2: Tool call indicator
**Given** the AI is streaming
**When** tool calls are detected
**Then** a tool call indicator shows which tool is running

### AC3: Structured UI rendering on completion
**Given** streaming completes
**When** trip/quote data is extracted
**Then** structured UI components render inline

## Tasks
- [[TASK004-implement-sse-streaming-parser|TASK004 - Implement SSE streaming parser]]
- [[TASK005-render-streaming-text|TASK005 - Render streaming text]]
- [[TASK006-extract-display-tool-calls|TASK006 - Extract and display tool calls]]

## Technical Notes
- SSE streaming is handled via the `parseSSEStream` utility in `lib/chat/`
- Tool call indicators show the name of the MCP tool being executed (e.g., `create_trip`, `get_rfq`)
- Structured UI components include TripCreatedUI, RfqResultsUI, and RfqQuoteDetailsCard
- The streaming parser accumulates content chunks and detects tool call boundaries
- React state updates are batched to avoid excessive re-renders during streaming
