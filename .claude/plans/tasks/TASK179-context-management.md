# Task ID: TASK179
# Task Name: Context Management
# Parent User Story: [[US093-execute-agent-with-context|US093 - Agent Execution with Tool Routing]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Implement the AgentContextManager that maintains session context, conversation history, and shared state across agent executions. The context manager provides a structured way to pass information between execution cycles and across agent handoffs.

## Acceptance Criteria
- AgentContextManager stores session-scoped context (sessionId, userId, requestId)
- Conversation history is maintained with proper message format (role, content, tool_calls)
- Context supports get/set for arbitrary key-value metadata
- History can be trimmed to stay within token limits
- Context can be serialized/deserialized for persistence
- Context can be cloned for handoff to another agent
- Thread-safe for concurrent access patterns

## Implementation Details
- **File(s)**: agents/core/agent-context.ts
- **Approach**: Create AgentContextManager class with properties for sessionId, userId, requestId, a messages array for conversation history, and a Map for metadata. Include methods: addMessage(), getHistory(), trimHistory(maxTokens), toJSON(), fromJSON(), clone(). Use a simple token estimation (4 chars per token) for trimming.

## Dependencies
- Agent type definitions (agents/core/types.ts)
- Message format compatible with OpenAI API
