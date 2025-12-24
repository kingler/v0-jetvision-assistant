# Agent MCP Integration Guide

## Overview

This document explains how agents integrate with MCP (Model Context Protocol) servers to expose tools to LLMs for automatic function calling.

## Architecture

### Before Integration

Agents manually called MCP tools:
```typescript
// Old approach - manual tool calls
const result = await this.mcpServer.executeTool('search_flights', params)
```

### After Integration

Agents expose MCP tools to LLMs, which decide when to call them:
```typescript
// New approach - LLM decides when to call tools
const response = await this.createResponse(
  "Search for flights from KTEB to KVNY for 4 passengers on 2025-01-20"
)
// LLM automatically calls search_flights tool based on the request
```

## How It Works

### 1. BaseAgent MCP Integration

**File**: `agents/core/base-agent.ts`

BaseAgent now provides:

#### MCP Server Connection
```typescript
protected async connectMCPServer(
  serverName: string,
  command: string,
  args: string[],
  config?: { spawnTimeout?: number }
): Promise<void>
```

Connects to an MCP server via MCPServerManager singleton. The server is spawned if not already running.

#### Tool Registration
```typescript
protected async getToolDefinitions(): Promise<OpenAI.Chat.ChatCompletionTool[]>
```

Returns both:
- **Agent tools** - Tools registered directly with the agent
- **MCP tools** - Tools from connected MCP servers

These are automatically exposed to the LLM for function calling.

#### Tool Execution
```typescript
protected async callMCPTool(
  serverName: string,
  toolName: string,
  params: Record<string, unknown>
): Promise<unknown>
```

Executes MCP tools and handles result parsing.

### 2. Agent Implementation Pattern

**Example**: `FlightSearchAgent`

```typescript
export class FlightSearchAgent extends BaseAgent {
  private readonly AVINODE_MCP_SERVER_NAME = 'avinode-mcp'

  async initialize(): Promise<void> {
    await super.initialize()
    
    // Connect to Avinode MCP server
    await this.connectMCPServer(
      this.AVINODE_MCP_SERVER_NAME,
      'node',
      ['mcp-servers/avinode-mcp-server/dist/index.js'],
      { spawnTimeout: 30000 }
    )
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    // Use LLM with MCP tools exposed
    const userRequest = this.buildUserRequest(context)
    const response = await this.createResponse(userRequest, context)
    
    // LLM automatically calls appropriate MCP tools
    // Results are included in the response
    return this.processResponse(response)
  }
}
```

### 3. LLM Function Calling Flow

```
User Request
    ↓
Agent.createResponse(userRequest)
    ↓
BaseAgent.getToolDefinitions() → [agent tools + MCP tools]
    ↓
OpenAI API Call with tools
    ↓
LLM decides to call tool(s) → Returns tool_calls
    ↓
BaseAgent executes tools → [agent.executeTool() OR callMCPTool()]
    ↓
Tool results added to messages
    ↓
Second OpenAI API call with tool results
    ↓
Final response with tool results integrated
```

## Tool Discovery

### Automatic Tool Loading

When an agent connects to an MCP server:

1. **Connection**: `connectMCPServer()` spawns/connects to server
2. **Tool Discovery**: `getToolDefinitions()` calls `client.listTools()`
3. **Tool Registration**: Tools are converted to OpenAI function format
4. **Exposure**: Tools are included in every LLM API call

### Available Avinode MCP Tools

The Avinode MCP server exposes these tools:

| Tool | Description | Parameters |
|------|-------------|------------|
| `search_flights` | Search for available charter flights | departure_airport, arrival_airport, passengers, departure_date, aircraft_category |
| `create_trip` | Create trip container and get deep link | departure_airport, arrival_airport, departure_date, passengers, return_date, etc. |
| `get_rfq` | Get RFQ details with all quotes | rfq_id |
| `get_quote` | Get detailed quote information | quote_id |
| `get_quotes` | Get all quotes for an RFP | rfp_id |
| `cancel_trip` | Cancel an active trip | trip_id, reason |
| `send_trip_message` | Send message to operators | trip_id, message, recipient_type, operator_id |
| `get_trip_messages` | Retrieve message history | trip_id, limit, since |
| `search_airports` | Search airports by code/name | query |
| `search_empty_legs` | Find empty leg flights | departure_airport, arrival_airport, date_range |

## Benefits

### 1. **Intelligent Tool Selection**

The LLM decides which tools to call based on:
- User's natural language request
- Available tool descriptions
- Current context and conversation history

### 2. **Automatic Tool Chaining**

The LLM can chain multiple tools:
```
User: "Find flights from LAX to JFK and create a trip"
→ LLM calls: search_flights
→ LLM calls: create_trip
→ LLM combines results into response
```

### 3. **Error Handling**

LLM handles tool errors intelligently:
- Retries failed tools
- Provides alternative solutions
- Explains errors to users

### 4. **Reduced Code Complexity**

Agents no longer need to:
- Manually parse user requests
- Determine which tool to call
- Handle tool sequencing
- Process tool results

## Migration Guide

### Step 1: Connect to MCP Server

In your agent's `initialize()` method:

```typescript
async initialize(): Promise<void> {
  await super.initialize()
  
  await this.connectMCPServer(
    'avinode-mcp',
    'node',
    ['mcp-servers/avinode-mcp-server/dist/index.js']
  )
}
```

### Step 2: Use LLM Function Calling

Instead of manual tool calls, use `createResponse()`:

```typescript
// Before: Manual tool call
const flights = await this.mcpServer.executeTool('search_flights', params)

// After: LLM decides
const response = await this.createResponse(
  `Search for flights from ${departure} to ${arrival} for ${passengers} passengers on ${date}`
)
// LLM automatically calls search_flights if needed
```

### Step 3: Update System Prompt

Add tool descriptions to system prompt:

```typescript
systemPrompt: `You are a Flight Search Agent.

Available tools:
- search_flights: Search for available charter flights
- create_trip: Create a trip and get deep link for Avinode marketplace
- get_rfq: Retrieve RFQ details with quotes
...

Use these tools to fulfill user requests.`
```

## Example: FlightSearchAgent

### Before (Manual Tool Calls)

```typescript
async execute(context: AgentContext): Promise<AgentResult> {
  const params = this.extractSearchParams(context)
  
  // Manual tool calls
  const flights = await this.mcpServer.executeTool('search_flights', {
    departure_airport: params.departure,
    arrival_airport: params.arrival,
    passengers: params.passengers,
    departure_date: params.departureDate,
  })
  
  const trip = await this.mcpServer.executeTool('create_trip', {
    departure_airport: params.departure,
    arrival_airport: params.arrival,
    departure_date: params.departureDate,
    passengers: params.passengers,
  })
  
  return { success: true, data: { flights, trip } }
}
```

### After (LLM Function Calling)

```typescript
async execute(context: AgentContext): Promise<AgentResult> {
  // Build natural language request
  const userRequest = this.buildNaturalLanguageRequest(context)
  
  // LLM automatically calls tools based on request
  const response = await this.createResponse(userRequest, context)
  
  // Extract results from LLM response (includes tool results)
  return this.extractResults(response)
}

private buildNaturalLanguageRequest(context: AgentContext): string {
  const params = this.extractSearchParams(context)
  return `Search for flights from ${params.departure} to ${params.arrival} ` +
         `for ${params.passengers} passengers on ${params.departureDate}. ` +
         `Then create a trip container to get the deep link for the Avinode marketplace.`
}
```

## Tool Call Handling

BaseAgent automatically handles tool calls from the LLM:

1. **Tool Call Detection**: Checks if LLM response includes `tool_calls`
2. **Tool Execution**: Executes each tool (agent tool or MCP tool)
3. **Result Injection**: Adds tool results to message history
4. **Final Response**: Makes second LLM call with tool results

```typescript
// In BaseAgent.createResponse()
if (message?.tool_calls && message.tool_calls.length > 0) {
  for (const toolCall of message.tool_calls) {
    // Check if agent tool or MCP tool
    const isAgentTool = this.tools.has(toolCall.function.name)
    
    if (isAgentTool) {
      result = await this.executeTool(toolCall.function.name, params)
    } else {
      // Find which MCP server has this tool
      result = await this.callMCPTool(serverName, toolCall.function.name, params)
    }
  }
  
  // Make second call with tool results
  finalResponse = await this.openai.chat.completions.create({
    messages: [...messages, toolResults],
    tools: tools,
  })
}
```

## Debugging

### Enable Logging

BaseAgent logs all MCP operations:

```
[FlightSearchAgent] Connected to MCP server: avinode-mcp
[FlightSearchAgent] Loaded 8 tools from MCP server: avinode-mcp
[FlightSearchAgent] Calling MCP tool: avinode-mcp.search_flights
```

### Check Tool Availability

```typescript
// In agent code
const tools = await this.getToolDefinitions()
console.log('Available tools:', tools.map(t => t.function.name))
```

### Verify MCP Connection

```typescript
// Check if connected
const isConnected = this.mcpClients.has('avinode-mcp')
console.log('MCP server connected:', isConnected)
```

## Best Practices

1. **Always Connect in initialize()**: MCP servers should be connected during agent initialization

2. **Use Descriptive System Prompts**: Explain available tools and when to use them

3. **Handle Tool Errors**: LLM will handle errors, but you can add custom error handling

4. **Cache Connections**: Use the `MCPServerManager` singleton pattern to obtain and reuse MCP server connections. The manager caches client instances centrally, so always retrieve connections via `MCPServerManager.getInstance().getClient(serverId)` rather than creating new connections. The singleton ensures that:
   - Client instances are cached in `metadata.client` (see `lib/services/mcp-server-manager.ts:263-264`)
   - Existing clients are returned if available, preventing duplicate connections
   - All agents share the same connection pool for each MCP server

   Example:
   ```typescript
   // In BaseAgent.connectMCPServer() or agent code
   const manager = MCPServerManager.getInstance()
   const client = await manager.getClient('avinode-mcp')
   // Client is cached and reused across all agent instances
   ```

5. **Monitor Tool Usage**: Track comprehensive metrics for MCP tool operations to identify performance bottlenecks and usage patterns. Emit the following metrics:
   - **Latency (p95)**: Tool execution time histograms with labels `tool_name` and `server_id`
   - **Error Rate**: Counter for failed tool calls with `tool_name`, `server_id`, and `error_type` labels
   - **Tool Call Frequency**: Counter tracking total invocations per tool with `tool_name` and `server_id` labels
   - **Success Rate**: Counter for successful executions with `tool_name` and `server_id` labels
   - **Concurrent Connections**: Gauge tracking active MCP server connections per `server_id`

   Implementation pattern:
   ```typescript
   // Use project telemetry/metrics client (or Prometheus client)
   // Record latency histogram
   metrics.histogram('mcp.tool.latency', duration, {
     tool_name: 'search_flights',
     server_id: 'avinode-mcp'
   })
   
   // Record error counter
   metrics.counter('mcp.tool.errors', 1, {
     tool_name: 'search_flights',
     server_id: 'avinode-mcp',
     error_type: 'timeout'
   })
   
   // Record call frequency
   metrics.counter('mcp.tool.calls', 1, {
     tool_name: 'search_flights',
     server_id: 'avinode-mcp'
   })
   
   // Record success
   metrics.counter('mcp.tool.success', 1, {
     tool_name: 'search_flights',
     server_id: 'avinode-mcp'
   })
   
   // Track concurrent connections
   metrics.gauge('mcp.connections.active', connectionCount, {
     server_id: 'avinode-mcp'
   })
   ```

   Export metrics to your existing monitoring backend (e.g., via `/api/analytics` endpoint) or scrape Prometheus-compatible metrics from a `/metrics` endpoint for integration with Grafana, Datadog, or similar observability platforms.

## Related Files

- `agents/core/base-agent.ts` - BaseAgent with MCP support
- `agents/implementations/flight-search-agent.ts` - Example implementation
- `lib/services/mcp-server-manager.ts` - MCP server lifecycle management
- `lib/mcp/avinode-server.ts` - Avinode MCP server wrapper
- `mcp-servers/avinode-mcp-server/` - Avinode MCP server implementation

