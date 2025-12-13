# Agent-to-Tool Mapping Specification

**Linear Issue**: ONEK-86
**Created**: November 1, 2025
**Status**: Design Complete

---

## Overview

This document provides a comprehensive mapping of which MCP tools are accessible by each agent in the Jetvision Multi-Agent System. This mapping enforces the principle of least privilege, ensuring each agent only has access to the tools required for its specific responsibilities.

## Mapping Rationale

### Security Principles

1. **Least Privilege**: Agents only access tools necessary for their role
2. **Separation of Concerns**: No agent can perform tasks outside its domain
3. **Data Isolation**: Agents cannot access sensitive data from other domains
4. **Audit Trail**: All tool calls are logged with agent context

### Design Decisions

- **Supabase Tools**: Shared across most agents for state management and data persistence
- **Specialized Tools**: Scoped to single agent (e.g., Avinode → Flight Search only)
- **Communication Tools**: Limited to Communication and Error Monitor agents
- **No Delete Access**: No agents can delete data from Supabase (data retention policy)

---

## Complete Tool Mapping

### Agent 1: Orchestrator Agent

**Role**: RFP analysis and workflow coordination

#### Assigned Tools (3 total)

| Tool | MCP Server | Purpose |
|------|------------|---------|
| `supabase_query` | Supabase | Query workflow state and request data |
| `supabase_insert` | Supabase | Create workflow records |
| `supabase_update` | Supabase | Update workflow state transitions |

#### Tool Usage Patterns

**Query Usage**:
```typescript
// Check existing workflows
await supabase_query({
  table: 'iso_workflows',
  filters: { request_id: 'req-123' },
  select: 'id, state, created_at'
})

// Retrieve request data
await supabase_query({
  table: 'iso_requests',
  filters: { id: 'req-123' },
  select: '*'
})
```

**Insert Usage**:
```typescript
// Create new workflow
await supabase_insert({
  table: 'iso_workflows',
  data: {
    request_id: 'req-123',
    state: 'CREATED',
    priority: 'high',
    metadata: { urgency: 'urgent' }
  }
})
```

**Update Usage**:
```typescript
// Transition workflow state
await supabase_update({
  table: 'iso_workflows',
  filters: { request_id: 'req-123' },
  data: { state: 'ANALYZING' }
})
```

#### Prohibited Tools
- All Avinode tools (flight search not in scope)
- All Google Sheets tools (client data not in scope)
- All Gmail tools (communication not in scope)
- `supabase_delete` (no delete permission)

---

### Agent 2: Client Data Agent

**Role**: Client profile management

#### Assigned Tools (7 total)

| Tool | MCP Server | Purpose |
|------|------------|---------|
| `list_clients` | Google Sheets | List all clients in database |
| `search_client` | Google Sheets | Search clients by name/email |
| `get_client_details` | Google Sheets | Retrieve full client profile |
| `read_sheet` | Google Sheets | Read specific ranges/data |
| `supabase_query` | Supabase | Check cached client data |
| `supabase_insert` | Supabase | Cache client records |
| `supabase_update` | Supabase | Update client cache |

#### Tool Usage Patterns

**Google Sheets Usage**:
```typescript
// Search for client
await search_client({
  query: 'John Smith',
  fields: ['name', 'email', 'vip_status']
})

// Get full profile
await get_client_details({
  client_id: 'client-456'
})

// Read preferences range
await read_sheet({
  sheet_id: CLIENT_DATABASE_SHEET_ID,
  range: 'Preferences!A2:F100'
})
```

**Supabase Caching**:
```typescript
// Check cache
const cached = await supabase_query({
  table: 'client_cache',
  filters: { email: 'john@example.com' }
})

// Update cache
await supabase_insert({
  table: 'client_cache',
  data: { ...clientProfile, cached_at: new Date() }
})
```

#### Prohibited Tools
- All Avinode tools (flight search not in scope)
- All Gmail tools (communication not in scope)
- `supabase_delete`, `supabase_rpc` (not needed)

---

### Agent 3: Flight Search Agent

**Role**: Flight search and RFP creation

#### Assigned Tools (9 total)

| Tool | MCP Server | Purpose |
|------|------------|---------|
| `search_flights` | Avinode | Search available charter flights |
| `search_empty_legs` | Avinode | Search discounted empty leg flights |
| `create_rfp` | Avinode | Create RFP with operators |
| `get_rfp_status` | Avinode | Check RFP status and retrieve quotes |
| `create_watch` | Avinode | Monitor availability for routes |
| `search_airports` | Avinode | Validate airport codes |
| `supabase_insert` | Supabase | Save flight options and RFP data |
| `supabase_update` | Supabase | Update RFP status |
| `supabase_query` | Supabase | Retrieve flight search history |

#### Tool Usage Patterns

**Avinode Flight Search**:
```typescript
// Search regular flights
await search_flights({
  departure_airport: 'KTEB',
  arrival_airport: 'KOPF',
  departure_date: '2025-11-15',
  passengers: 4,
  aircraft_types: ['light-jet', 'mid-jet'],
  max_budget: 50000,
  min_operator_rating: 4.0
})

// Search empty legs (discounts)
await search_empty_legs({
  departure_airport: 'KTEB',
  arrival_airport: 'KOPF',
  date_range: { from: '2025-11-14', to: '2025-11-16' },
  passengers: 4,
  max_price: 30000
})
```

**RFP Creation**:
```typescript
// Create RFP with selected operators
await create_rfp({
  flight_details: { ... },
  operator_ids: ['op-123', 'op-456', 'op-789'],
  requirements: { ... },
  deadline: '2025-11-14T12:00:00Z'
})

// Monitor RFP status
await get_rfp_status({
  rfp_id: 'rfp-123'
})
```

**Persistence**:
```typescript
// Save flight options
await supabase_insert({
  table: 'flight_options',
  data: {
    request_id: 'req-123',
    rfp_id: 'rfp-456',
    flights: flightData,
    empty_legs: emptyLegData
  }
})
```

#### Prohibited Tools
- All Google Sheets tools (client data not in scope)
- All Gmail tools (communication not in scope)
- `supabase_delete`, `supabase_rpc` (not needed)

---

### Agent 4: Proposal Analysis Agent

**Role**: Quote scoring and ranking

#### Assigned Tools (5 total)

| Tool | MCP Server | Purpose |
|------|------------|---------|
| `get_rfp_status` | Avinode | Retrieve all quotes for RFP |
| `supabase_query` | Supabase | Retrieve quote and flight data |
| `supabase_insert` | Supabase | Save analysis results |
| `supabase_update` | Supabase | Update quote scores |
| `supabase_rpc` | Supabase | Call custom scoring functions |

#### Tool Usage Patterns

**Quote Retrieval**:
```typescript
// Get all quotes
const rfpStatus = await get_rfp_status({
  rfp_id: 'rfp-123',
  include_quotes: true
})

// Retrieve supplemental data
const quotes = await supabase_query({
  table: 'quotes',
  filters: { rfp_id: 'rfp-123' },
  select: '*'
})
```

**Scoring & Analysis**:
```typescript
// Call custom scoring function
const scores = await supabase_rpc({
  function: 'calculate_quote_scores',
  params: {
    quotes: quotesData,
    client_preferences: preferences,
    weights: { price: 0.30, safety: 0.35, speed: 0.15, comfort: 0.20 }
  }
})

// Save scores
await supabase_insert({
  table: 'quote_scores',
  data: {
    rfp_id: 'rfp-123',
    quote_id: 'quote-456',
    price_score: 85,
    safety_score: 92,
    speed_score: 78,
    comfort_score: 88,
    total_score: 87,
    rank: 1
  }
})
```

#### Prohibited Tools
- Avinode write operations (RFP creation not in scope)
- All Google Sheets tools (client data not in scope)
- All Gmail tools (communication not in scope)
- `supabase_delete` (no delete permission)

---

### Agent 5: Communication Agent

**Role**: Email generation and delivery

#### Assigned Tools (5 total)

| Tool | MCP Server | Purpose |
|------|------------|---------|
| `send_email` | Gmail | Send proposals to clients |
| `create_draft` | Gmail | Create draft for review |
| `get_email` | Gmail | Verify sent emails |
| `supabase_query` | Supabase | Retrieve proposals and client data |
| `supabase_update` | Supabase | Mark emails as sent |

#### Tool Usage Patterns

**Email Generation**:
```typescript
// Retrieve proposal data
const proposals = await supabase_query({
  table: 'ranked_proposals',
  filters: { request_id: 'req-123' },
  orderBy: { column: 'rank', ascending: true },
  limit: 3
})

// Create draft for review (optional)
await create_draft({
  to: 'client@example.com',
  subject: 'Your Charter Flight Options: KTEB - KOPF - Nov 15',
  body: emailHTML,
  attachments: [{ filename: 'proposals.pdf', content: pdfBase64 }]
})
```

**Email Sending**:
```typescript
// Send final email
const result = await send_email({
  to: 'client@example.com',
  subject: 'Your Charter Flight Options: KTEB - KOPF - Nov 15',
  body: emailHTML,
  attachments: [{ filename: 'proposals.pdf', content: pdfBase64 }]
})

// Update sent status
await supabase_update({
  table: 'iso_workflows',
  filters: { request_id: 'req-123' },
  data: {
    state: 'COMPLETED',
    email_sent_at: new Date(),
    email_message_id: result.message_id
  }
})
```

#### Prohibited Tools
- All Avinode tools (flight search not in scope)
- All Google Sheets tools (client data not in scope)
- `supabase_insert`, `supabase_delete`, `supabase_rpc` (not needed)

---

### Agent 6: Error Monitor Agent

**Role**: Error handling and recovery

#### Assigned Tools (4 total)

| Tool | MCP Server | Purpose |
|------|------------|---------|
| `supabase_insert` | Supabase | Log errors to database |
| `supabase_update` | Supabase | Update workflow error state |
| `supabase_query` | Supabase | Check retry counts |
| `send_email` | Gmail | Send error alerts to admins |

#### Tool Usage Patterns

**Error Logging**:
```typescript
// Log error details
await supabase_insert({
  table: 'agent_errors',
  data: {
    workflow_id: 'wf-123',
    agent_type: 'flight_search',
    task_id: 'task-456',
    error_type: 'avinode_timeout',
    error_message: 'API request timed out after 30s',
    retry_count: 1,
    stack_trace: errorStack,
    occurred_at: new Date()
  }
})

// Check retry count
const errors = await supabase_query({
  table: 'agent_errors',
  filters: { task_id: 'task-456' },
  select: 'retry_count'
})
```

**Error Escalation**:
```typescript
// Update workflow to FAILED
await supabase_update({
  table: 'iso_workflows',
  filters: { id: 'wf-123' },
  data: {
    state: 'FAILED',
    failed_at: new Date(),
    failure_reason: 'Max retries exceeded (3) for Avinode API'
  }
})

// Send admin alert
await send_email({
  to: 'admin@jetvision.com',
  subject: 'CRITICAL: Workflow wf-123 Failed',
  body: errorReportHTML
})
```

#### Prohibited Tools
- All Avinode tools (no direct retry capability)
- All Google Sheets tools (not needed for monitoring)
- `supabase_delete`, `supabase_rpc` (not needed)

---

## Tool Access Summary Table

| Tool | Type | Orchestrator | Client Data | Flight Search | Proposal Analysis | Communication | Error Monitor |
|------|------|--------------|-------------|---------------|-------------------|---------------|---------------|
| **Avinode MCP** | | | | | | | |
| search_flights | Read | | | ✅ | | | |
| search_empty_legs | Read | | | ✅ | | | |
| create_rfp | Write | | | ✅ | | | |
| get_rfp_status | Read | | | ✅ | ✅ | | |
| create_watch | Write | | | ✅ | | | |
| search_airports | Read | | | ✅ | | | |
| **Google Sheets MCP** | | | | | | | |
| list_clients | Read | | ✅ | | | | |
| search_client | Read | | ✅ | | | | |
| get_client_details | Read | | ✅ | | | | |
| read_sheet | Read | | ✅ | | | | |
| **Gmail MCP** | | | | | | | |
| send_email | Write | | | | | ✅ | ✅ |
| create_draft | Write | | | | | ✅ | |
| get_email | Read | | | | | ✅ | |
| **Supabase MCP** | | | | | | | |
| supabase_query | Read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| supabase_insert | Write | ✅ | ✅ | ✅ | ✅ | | ✅ |
| supabase_update | Write | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| supabase_delete | Write | | | | | | |
| supabase_rpc | Execute | | | | ✅ | | |

**Total Tools by Agent**:
- Orchestrator: 3 tools
- Client Data: 7 tools
- Flight Search: 9 tools
- Proposal Analysis: 5 tools
- Communication: 5 tools
- Error Monitor: 4 tools

---

## Validation Functions

The system provides built-in validation functions to enforce tool access rules:

### Check Tool Access

```typescript
import { canAgentAccessTool } from '@lib/config/chatkit-workflow'

// Validate before tool execution
const hasAccess = canAgentAccessTool(AgentType.FLIGHT_SEARCH, 'search_flights')
// Returns: true

const noAccess = canAgentAccessTool(AgentType.ORCHESTRATOR, 'search_flights')
// Returns: false
```

### Get Agent Tools

```typescript
import { getAgentTools } from '@lib/config/chatkit-workflow'

// Get all tools for an agent
const tools = getAgentTools(AgentType.FLIGHT_SEARCH)
// Returns: ['search_flights', 'search_empty_legs', 'create_rfp', ...]
```

### Enforce at Runtime

```typescript
// Example: BaseAgent tool execution with validation
protected async executeTool(toolName: string, params: unknown): Promise<unknown> {
  // Validate tool access
  if (!canAgentAccessTool(this.type, toolName)) {
    throw new Error(
      `Agent ${this.type} does not have permission to access tool ${toolName}`
    )
  }

  // Execute tool...
}
```

---

## MCP Server Configuration

Ensure all MCP servers are properly configured in `.mcp.json`:

```json
{
  "mcpServers": {
    "avinode": {
      "command": "node",
      "args": ["./mcp-servers/avinode-mcp-server/dist/index.js"],
      "env": {
        "AVINODE_API_KEY": "${AVINODE_API_KEY}"
      }
    },
    "google-sheets": {
      "command": "node",
      "args": ["./mcp-servers/google-sheets-mcp-server/dist/index.js"],
      "env": {
        "GOOGLE_SHEETS_CLIENT_ID": "${GOOGLE_SHEETS_CLIENT_ID}",
        "GOOGLE_SHEETS_CLIENT_SECRET": "${GOOGLE_SHEETS_CLIENT_SECRET}",
        "GOOGLE_SHEETS_REFRESH_TOKEN": "${GOOGLE_SHEETS_REFRESH_TOKEN}",
        "CLIENT_DATABASE_SHEET_ID": "${CLIENT_DATABASE_SHEET_ID}"
      }
    },
    "gmail": {
      "command": "node",
      "args": ["./mcp-servers/gmail-mcp-server/dist/index.js"],
      "env": {
        "GMAIL_CLIENT_ID": "${GMAIL_CLIENT_ID}",
        "GMAIL_CLIENT_SECRET": "${GMAIL_CLIENT_SECRET}",
        "GMAIL_REFRESH_TOKEN": "${GMAIL_REFRESH_TOKEN}"
      }
    },
    "supabase": {
      "command": "node",
      "args": ["./mcp-servers/supabase-mcp-server/dist/index.js"],
      "env": {
        "NEXT_PUBLIC_SUPABASE_URL": "${NEXT_PUBLIC_SUPABASE_URL}",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}"
      }
    }
  }
}
```

---

## Security Considerations

### Principle of Least Privilege

Each agent receives **only** the tools necessary for its designated role:

- **Orchestrator**: Limited to workflow coordination (no external APIs)
- **Client Data**: Only Google Sheets access (no flight search or email)
- **Flight Search**: Only Avinode access (no client data or email)
- **Proposal Analysis**: Read-only Avinode + analysis tools (no writes)
- **Communication**: Only Gmail sending (no search or data access)
- **Error Monitor**: Logging and alerting only (no business operations)

### Data Isolation

- Agents cannot access tools outside their domain
- No agent can delete data from Supabase
- Communication tools limited to final delivery and admin alerts
- Client data access restricted to Client Data Agent only

### Audit Trail

All tool calls are logged with:
- Agent ID and type
- Tool name and parameters
- Execution timestamp
- Success/failure status
- Error details (if applicable)

---

## References

- **Configuration**: `/lib/config/chatkit-workflow.ts`
- **MCP Servers**: `/mcp-servers/*/src/index.ts`
- **Agent Implementations**: `/agents/implementations/`
- **Setup Guide**: `/docs/OPENAI_AGENT_BUILDER_SETUP.md`

---

**Document Status**: ✅ Complete
**Last Updated**: November 1, 2025
**Owner**: Jetvision Development Team
