# Task ID: TASK178
# Task Name: Implement Agent Execution
# Parent User Story: [[US093-execute-agent-with-context|US093 - Agent Execution with Tool Routing]]
# Status: Done
# Priority: Critical
# Estimate: 5h

## Description
Implement the BaseAgent.execute() method that performs OpenAI API calls with function calling and routes tool invocations to the appropriate MCP servers. This is the core execution loop for all agents.

## Acceptance Criteria
- execute(context) sends messages to OpenAI API with registered tools
- Tool calls from OpenAI response are routed to correct MCP server tools
- Tool results are fed back into the conversation for follow-up responses
- Execution loop continues until OpenAI returns a final text response (no tool calls)
- Maximum iteration limit prevents infinite loops (default 10 iterations)
- Execution timeout prevents hung calls (default 120 seconds)
- Errors in tool execution are captured and reported back to OpenAI
- Metrics are updated on each execution (success, failure, latency, tokens)

## Implementation Details
- **File(s)**: agents/core/base-agent.ts
- **Approach**: Implement execute() as an async method that builds the message array from context, calls OpenAI chat completions with tools, checks for tool_calls in the response, executes each tool call via the registered tool executor, appends tool results to messages, and loops until a final response. Include try/catch for error handling and metrics tracking.

## Dependencies
- OpenAI API client configuration
- Tool registration mechanism
- MCP server connections
- AgentContext (agents/core/agent-context.ts)
