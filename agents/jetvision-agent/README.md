# JetvisionAgent - Single Agent Architecture

A simplified, unified agent that replaces the previous multi-agent architecture.

## Overview

The JetvisionAgent consolidates all charter flight operations into a single agent with access to three tool categories:

| Category | Tools | Purpose |
|----------|-------|---------|
| **Avinode** | 8 tools | Flight search, trips, quotes, messaging |
| **Database** | 12 tools | CRM operations (clients, requests, quotes, operators) |
| **Gmail** | 3 tools | Email sending (proposals, quotes) |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    JetvisionAgent                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              OpenAI Function Calling                 │   │
│  │  • Conversation handling (via system prompt)        │   │
│  │  • Tool selection & response generation             │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Tool Executor                        │   │
│  │  Routes to MCP servers in mcp-servers/              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────┐   │   │
│  │  │ Avinode MCP │  │ Supabase MCP │  │ Gmail MCP │   │   │
│  │  │ (flights)   │  │ (CRM tables) │  │ (email)   │   │   │
│  │  └─────────────┘  └─────────────┘  └───────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## MCP Server Integration

The JetvisionAgent uses three MCP servers from `mcp-servers/`:

### Avinode MCP (`lib/mcp/avinode-server.ts`)
- Connects to Avinode API for flight operations
- Tools: create_trip, get_rfq, search_flights, send_trip_message, etc.
- Used via `callTool(name, params)` interface

### Supabase MCP (`mcp-servers/supabase-mcp-server/`)
- Uses helpers from `lib/supabase/mcp-helpers.ts`
- Tools: queryTable, insertRow, updateRow, countRows
- Tables: client_profiles, requests, quotes, proposals, iso_agents

### Gmail MCP (`mcp-servers/gmail-mcp-server/`)
- Google Gmail API integration
- Tools: send_email, search_emails, get_email

## Files

```
agents/jetvision-agent/
├── index.ts          # Main agent class + exports
├── types.ts          # TypeScript types for all tools
├── tools.ts          # OpenAI function definitions
├── tool-executor.ts  # Unified tool execution layer
├── streaming.ts      # SSE streaming support
└── README.md         # This file
```

## Usage

### Basic Usage

```typescript
import { createJetvisionAgent } from '@/agents/jetvision-agent';

const agent = createJetvisionAgent({
  sessionId: 'session-123',
  userId: 'user-456',
  isoAgentId: 'agent-789',
});

// Connect MCP servers
agent.setAvinodeMCP(avinodeMCPServer);
agent.setGmailMCP(gmailMCPServer);

// Execute
const result = await agent.execute('I need a flight from KTEB to KLAX for 4 passengers on 2026-02-15');

console.log(result.message);
// "Trip Created! Trip ID: LPZ8VC. [Open in Avinode](https://...)"
```

### Streaming Usage

```typescript
import { createStreamingAgent, createAgentSSEStream } from '@/agents/jetvision-agent/streaming';

const agent = createStreamingAgent({
  sessionId: 'session-123',
  userId: 'user-456',
  isoAgentId: 'agent-789',
});

agent.setAvinodeMCP(avinodeMCPServer);

// Create SSE stream for API response
const stream = createAgentSSEStream(agent, userMessage);

return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  },
});
```

### Chat API Integration

```typescript
// In app/api/chat/route.ts

import { createStreamingAgent, createAgentSSEStream } from '@/agents/jetvision-agent/streaming';

export async function POST(req: NextRequest) {
  const { message, sessionId } = await req.json();
  const { userId } = await auth();

  // Get ISO agent ID
  const isoAgentId = await getIsoAgentIdFromClerkUserId(userId);

  // Create agent
  const agent = createStreamingAgent({
    sessionId,
    userId,
    isoAgentId,
  });

  // Connect Avinode MCP
  agent.setAvinodeMCP(getAvinodeMCPServer());

  // Return streaming response
  return new Response(
    createAgentSSEStream(agent, message),
    { headers: SSE_HEADERS }
  );
}
```

## Tools Reference

### Avinode Tools

| Tool | Description |
|------|-------------|
| `create_trip` | Create a trip and get deep link for operator selection |
| `get_rfq` | Get RFQ details and quotes (accepts trip ID or RFQ ID) |
| `get_quote` | Get detailed quote information |
| `cancel_trip` | Cancel an active trip |
| `send_trip_message` | Send message to operators |
| `get_trip_messages` | Get message history |
| `search_airports` | Search airports by code/name |
| `search_empty_legs` | Find available empty leg flights |

### Database (CRM) Tools

| Tool | Description |
|------|-------------|
| `get_client` | Look up client by ID or email |
| `list_clients` | List clients with optional search |
| `create_client` | Create new client profile |
| `update_client` | Update client information |
| `get_request` | Get flight request details |
| `list_requests` | List requests with filters |
| `get_quotes` | Get quotes for a request |
| `update_quote_status` | Accept/reject quotes |
| `get_operator` | Get operator profile |
| `list_preferred_operators` | List preferred partners |
| `create_proposal` | Create proposal from quote |
| `get_proposal` | Get proposal details |

### Gmail Tools

| Tool | Description |
|------|-------------|
| `send_email` | Send general email |
| `send_proposal_email` | Send proposal to client |
| `send_quote_email` | Send quotes summary to client |

## Why Single Agent?

The previous multi-agent architecture had:
- 6 specialized agents (only 1 actually used)
- Complex coordination layer (message bus, handoffs, task queue)
- ~70% unused infrastructure

The new single-agent design:
- One agent with all capabilities
- Direct tool execution (no coordination overhead)
- Simpler debugging and maintenance
- Same functionality, less complexity

## Migration from Multi-Agent

Replace:
```typescript
import { OrchestratorAgent } from '@/agents/implementations/orchestrator-agent';
```

With:
```typescript
import { createJetvisionAgent } from '@/agents/jetvision-agent';
```

The tool interfaces remain the same - OpenAI function calling handles tool selection automatically.
