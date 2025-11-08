# Avinode MCP Server

MCP server for Avinode API integration - flight search and RFP management.

## Overview

This MCP server provides tools for interacting with the Avinode API:
- Search for charter flights
- Search for empty leg flights
- Create and manage RFPs (Requests for Proposal)
- Track quotes from operators
- Monitor flight availability via watches
- Search airport database

## Architecture Diagram

### Master API Integration Flow

```mermaid
flowchart TD
    Agent[AI Agent] -->|callTool| MCP[Avinode MCP Server]

    MCP -->|1. search_flights| Search[POST /api/flights/search]
    MCP -->|2. search_empty_legs| EmptyLegs[POST /api/empty-legs/search]
    MCP -->|3. create_rfp| CreateRFP[POST /api/rfp/create]
    MCP -->|4. get_rfp_status| GetStatus[GET /api/rfp/:id/status]
    MCP -->|5. create_watch| CreateWatch[POST /api/watch/create]
    MCP -->|6. search_airports| SearchAirports[GET /api/airports/search]

    Search --> API[Avinode API]
    EmptyLegs --> API
    CreateRFP --> API
    GetStatus --> API
    CreateWatch --> API
    SearchAirports --> API

    API -->|Response| MCP
    MCP -->|Result| Agent

    Agent -->|Store Data| DB[(Supabase)]
    API -->|Webhooks| Webhook[Webhook Handler]
    Webhook -->|Notify| Agent

    style MCP fill:#4a90e2
    style API fill:#e27a3f
    style Agent fill:#45b7b8
    style DB fill:#df5a49
```

## Tools

1. **search_flights** - Search available charter flights
2. **search_empty_legs** - Find discounted empty leg flights
3. **create_rfp** - Create RFP and send to operators
4. **get_rfp_status** - Check RFP status and retrieve quotes
5. **create_watch** - Monitor RFPs and price changes
6. **search_airports** - Search airports by name/code

## Prerequisites

### Avinode API Access

1. Sign up at [Avinode Developer Portal](https://developer.avinodegroup.com/)
2. Create an API key from the dashboard
3. Note your API key and base URL

### Environment Variables

Add to `.env.local`:

```env
# Avinode MCP Server
AVINODE_API_KEY=your-api-key-here
```

## Installation

```bash
cd mcp-servers/avinode-mcp-server
pnpm install
```

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## API Operation Diagrams

### 1. search_flights Tool - Sequence Diagram

```mermaid
sequenceDiagram
    participant Agent as FlightSearchAgent
    participant MCP as MCP Server
    participant Auth as Auth Module
    participant API as Avinode API

    Agent->>MCP: callTool('search_flights', params)
    activate MCP

    MCP->>MCP: Validate Parameters
    Note right of MCP: Check required fields:<br/>- departure_airport<br/>- arrival_airport<br/>- passengers<br/>- departure_date

    alt Invalid Parameters
        MCP-->>Agent: Error: Missing required fields
    end

    MCP->>Auth: getAuthHeaders()
    activate Auth
    Auth->>Auth: Load API Token
    Auth->>Auth: Load Bearer Token
    Auth->>Auth: Generate Timestamp
    Auth-->>MCP: Headers Object
    deactivate Auth

    MCP->>API: POST /api/flights/search
    Note right of MCP: Headers:<br/>X-Avinode-ApiToken<br/>Authorization: Bearer<br/>X-Avinode-SentTimestamp<br/>X-Avinode-ApiVersion<br/>X-Avinode-Product

    activate API

    alt Rate Limited
        API-->>MCP: 429 Too Many Requests
        MCP->>MCP: Calculate Backoff (2^attempt * 1000ms)
        MCP->>MCP: Wait
        MCP->>API: Retry POST
    end

    alt Authentication Failed
        API-->>MCP: 401 Unauthorized
        MCP-->>Agent: Error: Invalid credentials
    end

    API->>API: Query Operator Database
    API->>API: Filter by Criteria
    API->>API: Sort by Relevance

    API-->>MCP: 200 OK + Search Results
    deactivate API

    MCP->>MCP: Parse Response
    MCP->>MCP: Transform to Standard Format

    MCP-->>Agent: Success + Results Array
    deactivate MCP
```

### 2. create_rfp Tool - Sequence Diagram

```mermaid
sequenceDiagram
    participant Agent as FlightSearchAgent
    participant MCP as MCP Server
    participant Validator as Input Validator
    participant API as Avinode API
    participant DB as Database

    Agent->>MCP: callTool('create_rfp', rfpData)
    activate MCP

    MCP->>Validator: validateRFPData(rfpData)
    activate Validator
    Validator->>Validator: Check Flight Details
    Validator->>Validator: Validate Operator IDs
    Validator->>Validator: Check Date Formats (ISO 8601)
    Validator->>Validator: Validate Currency (ISO 4217)

    alt Validation Failed
        Validator-->>MCP: Validation Errors Array
        MCP-->>Agent: Error: Invalid RFP data
    end

    Validator-->>MCP: Validation Passed
    deactivate Validator

    MCP->>MCP: Build Request Body
    MCP->>API: POST /api/rfp/create

    activate API

    alt Rate Limited
        API-->>MCP: 429 + X-Rate-Limit-Reset
        MCP->>MCP: Extract Reset Time
        MCP->>MCP: Wait (reset seconds)
        MCP->>API: Retry POST
    end

    alt Validation Error
        API-->>MCP: 422 Unprocessable Entity
        API-->>MCP: Error Details
        MCP-->>Agent: Error: API validation failed
    end

    API->>API: Create RFP Record
    API->>API: Generate RFP ID
    API->>API: Notify Operators

    API->>DB: Store RFP
    DB-->>API: Stored

    API-->>MCP: 201 Created + RFP Object
    deactivate API

    MCP->>MCP: Extract RFP ID
    MCP->>MCP: Format Response

    MCP-->>Agent: Success + rfp_id
    deactivate MCP
```

### 3. get_rfp_status Tool - Sequence Diagram

```mermaid
sequenceDiagram
    participant Agent as ProposalAnalysisAgent
    participant MCP as MCP Server
    participant Cache as Redis Cache
    participant API as Avinode API

    Agent->>MCP: callTool('get_rfp_status', rfpId)
    activate MCP

    MCP->>Cache: get(`rfp:${rfpId}:status`)
    activate Cache

    alt Cache Hit
        Cache-->>MCP: Cached Status Data
        MCP-->>Agent: Success + Cached Status
        Note right of Agent: Skip API call<br/>Reduce rate limit usage
    end

    Cache-->>MCP: Cache Miss
    deactivate Cache

    MCP->>API: GET /api/rfp/{rfp_id}/status
    activate API

    alt RFP Not Found
        API-->>MCP: 404 Not Found
        MCP-->>Agent: Error: RFP does not exist
    end

    alt Rate Limited
        API-->>MCP: 429 Too Many Requests
        MCP->>MCP: Exponential Backoff
        MCP->>API: Retry GET
    end

    API->>API: Fetch RFP Record
    API->>API: Count Received Quotes
    API->>API: Calculate Progress

    API-->>MCP: 200 OK + Status Object
    deactivate API

    MCP->>MCP: Parse Response
    MCP->>Cache: set(`rfp:${rfpId}:status`, data, TTL: 30s)
    activate Cache
    Cache-->>MCP: Cached
    deactivate Cache

    MCP-->>Agent: Success + Status
    deactivate MCP
```

### 4. create_watch Tool - Sequence Diagram

```mermaid
sequenceDiagram
    participant Agent as FlightSearchAgent
    participant MCP as MCP Server
    participant API as Avinode API
    participant Webhook as Webhook Service

    Agent->>MCP: callTool('create_watch', watchConfig)
    activate MCP

    MCP->>MCP: Validate Watch Config
    Note right of MCP: Check:<br/>- type (rfp/flight)<br/>- rfp_id/flight_id<br/>- webhook_url<br/>- notifications config

    alt Invalid Webhook URL
        MCP-->>Agent: Error: Invalid webhook URL
    end

    MCP->>API: POST /api/watch/create
    activate API

    alt Rate Limited
        API-->>MCP: 429 Too Many Requests
        MCP->>MCP: Exponential Backoff
        MCP->>API: Retry POST
    end

    API->>API: Create Watch Record
    API->>API: Generate Watch ID
    API->>API: Register Webhook URL

    API-->>MCP: 201 Created + Watch Object
    deactivate API

    MCP->>MCP: Extract Watch ID
    MCP-->>Agent: Success + watch_id
    deactivate MCP

    Note over API,Webhook: Later: Event Occurs (Quote Received)

    API->>Webhook: POST /api/webhooks/avinode
    activate Webhook

    Webhook->>Webhook: Validate Signature
    Webhook->>Webhook: Verify Watch ID

    alt Invalid Signature
        Webhook-->>API: 401 Unauthorized
    end

    Webhook->>Webhook: Parse Payload
    Webhook->>Agent: Trigger Event Handler
    activate Agent
    Agent->>Agent: Process Quote Update
    Agent-->>Webhook: ACK
    deactivate Agent

    Webhook-->>API: 200 OK
    deactivate Webhook
```

### 5. search_airports Tool - Sequence Diagram

```mermaid
sequenceDiagram
    participant UI as User Interface
    participant API Route as Next.js API
    participant MCP as MCP Server
    participant Cache as Redis Cache
    participant Avinode as Avinode API

    UI->>API Route: GET /api/airports?q=Teterboro
    activate API Route

    API Route->>Cache: get(`airports:Teterboro`)
    activate Cache

    alt Cache Hit
        Cache-->>API Route: Cached Airport List
        API Route-->>UI: 200 OK + Airports
    end

    Cache-->>API Route: Cache Miss
    deactivate Cache

    API Route->>MCP: callTool('search_airports', {query: 'Teterboro'})
    activate MCP

    MCP->>Avinode: GET /api/airports/search?q=Teterboro
    activate Avinode

    alt Rate Limited
        Avinode-->>MCP: 429 Too Many Requests
        MCP->>MCP: Wait and Retry
    end

    Avinode->>Avinode: Query Airport Database
    Avinode->>Avinode: Filter by Name/Code
    Avinode->>Avinode: Sort by Relevance

    Avinode-->>MCP: 200 OK + Airports Array
    deactivate Avinode

    MCP->>MCP: Parse Results
    MCP->>MCP: Transform Format

    MCP-->>API Route: Success + Airports
    deactivate MCP

    API Route->>Cache: set(`airports:Teterboro`, data, TTL: 1h)
    activate Cache
    Cache-->>API Route: Cached
    deactivate Cache

    API Route-->>UI: 200 OK + Airports
    deactivate API Route

    UI->>UI: Display Airport Dropdown
```

### 6. Authentication Flow Diagram

```mermaid
flowchart TD
    Start([MCP Server Initialize]) --> LoadEnv[Load .env Variables]

    LoadEnv --> CheckAPI{AVINODE_API_KEY<br/>exists?}
    CheckAPI -->|No| ErrorAPI[Throw: Missing API Key]
    CheckAPI -->|Yes| StoreAPI[Store API Key]

    StoreAPI --> CheckBearer{AVINODE_BEARER_TOKEN<br/>exists?}
    CheckBearer -->|No| ErrorBearer[Throw: Missing Bearer Token]
    CheckBearer -->|Yes| StoreBearer[Store Bearer Token]

    StoreBearer --> Ready([Server Ready])

    Ready --> Request[API Request Received]
    Request --> BuildHeaders[Build HTTP Headers]

    BuildHeaders --> AddContentType[Content-Type: application/json]
    AddContentType --> AddAPIToken[X-Avinode-ApiToken: ***]
    AddAPIToken --> AddBearer[Authorization: Bearer ***]
    AddBearer --> AddTimestamp[X-Avinode-SentTimestamp: ISO-8601]

    AddTimestamp --> ValidateTime{Timestamp<br/>within 5 min?}
    ValidateTime -->|No| TimeError[Error: Clock skew detected]
    ValidateTime -->|Yes| AddVersion[X-Avinode-ApiVersion: v1.0]

    AddVersion --> AddProduct[X-Avinode-Product: Jetvision/1.0.0]
    AddProduct --> AddEncoding[Accept-Encoding: gzip]

    AddEncoding --> SendRequest[Send HTTP Request]
    SendRequest --> CheckResponse{HTTP<br/>Status?}

    CheckResponse -->|401| Auth401[Unauthorized]
    CheckResponse -->|403| Auth403[Forbidden]
    CheckResponse -->|200/201| Success([Success])

    Auth401 --> LogAuth1[Log: Invalid API token]
    Auth403 --> LogAuth2[Log: Insufficient permissions]

    LogAuth1 --> ReturnError[Return Error to Agent]
    LogAuth2 --> ReturnError

    Success --> ParseJSON[Parse JSON Response]
    ParseJSON --> ReturnData[Return Data to Agent]

    ErrorAPI --> End([Server Fails to Start])
    ErrorBearer --> End
    TimeError --> ReturnError
    ReturnError --> Request
    ReturnData --> Request

    style Start fill:#e1f5e1
    style Success fill:#e1f5e1
    style Ready fill:#e1f5e1
    style ErrorAPI fill:#ffe1e1
    style ErrorBearer fill:#ffe1e1
    style Auth401 fill:#ffe1e1
    style Auth403 fill:#ffe1e1
    style TimeError fill:#ffe1e1
```

### 7. Error Handling Flow

```mermaid
flowchart TD
    Request([API Request]) --> Execute[Execute HTTP Request]
    Execute --> CheckStatus{HTTP<br/>Status Code?}

    CheckStatus -->|200| Success[Parse Response]
    CheckStatus -->|201| Success
    Success --> Return([Return Data])

    CheckStatus -->|429| RateLimit[Rate Limited]
    RateLimit --> GetHeaders[Read Rate Limit Headers]
    GetHeaders --> ExtractReset[Extract X-Rate-Limit-Reset]
    ExtractReset --> CalcDelay[Calculate Delay]

    CalcDelay --> CheckAttempt1{Attempts<br/>< 3?}
    CheckAttempt1 -->|Yes| Wait1[Wait delay * 2^attempt]
    Wait1 --> Increment1[Increment Attempt Count]
    Increment1 --> Execute

    CheckAttempt1 -->|No| MaxRetries1[Max Retries Exceeded]
    MaxRetries1 --> LogRetries[Log: Rate limit exhausted]
    LogRetries --> ReturnError([Return Error])

    CheckStatus -->|401| Unauth[Unauthorized]
    Unauth --> LogUnauth[Log: Invalid credentials]
    LogUnauth --> ReturnError

    CheckStatus -->|403| Forbidden[Forbidden]
    Forbidden --> LogForbidden[Log: Insufficient permissions]
    LogForbidden --> ReturnError

    CheckStatus -->|404| NotFound[Not Found]
    NotFound --> LogNotFound[Log: Resource not found]
    LogNotFound --> ReturnError

    CheckStatus -->|422| Validation[Validation Error]
    Validation --> ParseValidation[Parse Error Details]
    ParseValidation --> LogValidation[Log: Validation failed]
    LogValidation --> ReturnError

    CheckStatus -->|503| ServiceDown[Service Unavailable]
    ServiceDown --> CheckAttempt2{Attempts<br/>< 3?}
    CheckAttempt2 -->|Yes| Wait2[Wait 5 seconds]
    Wait2 --> Increment2[Increment Attempt Count]
    Increment2 --> Execute

    CheckAttempt2 -->|No| MaxRetries2[Max Retries Exceeded]
    MaxRetries2 --> LogService[Log: Service unavailable]
    LogService --> ReturnError

    CheckStatus -->|Other| Unknown[Unknown Error]
    Unknown --> LogUnknown[Log: Unexpected status]
    LogUnknown --> ReturnError

    style Success fill:#e1f5e1
    style Return fill:#e1f5e1
    style MaxRetries1 fill:#ffe1e1
    style MaxRetries2 fill:#ffe1e1
    style ReturnError fill:#ffe1e1
```

## Usage Examples

### Search Flights

```typescript
{
  tool: 'search_flights',
  arguments: {
    departure_airport: 'KTEB',  // Teterboro, NJ
    departure_date: '2025-11-01',
    departure_time: '14:00',
    arrival_airport: 'KMIA',    // Miami
    passengers: 6,
    aircraft_types: ['light_jet', 'midsize_jet'],
    max_budget: 50000,
    min_operator_rating: 4.5
  }
}
```

### Search Empty Legs

```typescript
{
  tool: 'search_empty_legs',
  arguments: {
    departure_airport: 'KTEB',
    arrival_airport: 'KMIA',
    date_range: {
      from: '2025-11-01',
      to: '2025-11-05'
    },
    passengers: 4,
    max_price: 25000
  }
}
```

### Create RFP

```typescript
{
  tool: 'create_rfp',
  arguments: {
    flight_details: {
      departure_airport: 'KTEB',
      departure_date: '2025-11-10',
      departure_time: '14:00',
      arrival_airport: 'KMIA',
      passengers: 4
    },
    operator_ids: ['op_123', 'op_456', 'op_789'],
    message: 'VIP client, please provide best rates',
    quote_deadline: '2025-11-08T18:00:00Z',
    client_reference: 'REQ-2025-1234'
  }
}
```

### Get RFP Status

```typescript
{
  tool: 'get_rfp_status',
  arguments: {
    rfp_id: 'rfp_abc123'
  }
}
```

**Response:**
```json
{
  "rfp_id": "rfp_abc123",
  "status": "in_progress",
  "quotes_received": 2,
  "quotes": [
    {
      "quote_id": "quote_xyz789",
      "operator": {
        "id": "op_123",
        "name": "Elite Air Charter",
        "rating": 4.8
      },
      "aircraft": {
        "type": "light_jet",
        "model": "Citation CJ3",
        "registration": "N123AB"
      },
      "pricing": {
        "total": 28500,
        "currency": "USD"
      },
      "valid_until": "2025-11-05T23:59:59Z"
    }
  ]
}
```

### Create Watch

```typescript
{
  tool: 'create_watch',
  arguments: {
    type: 'rfp',
    rfp_id: 'rfp_abc123',
    notifications: {
      on_new_quote: true,
      on_price_change: true,
      on_deadline_approaching: true
    },
    webhook_url: 'https://your-domain.com/api/webhooks/avinode'
  }
}
```

### Search Airports

```typescript
{
  tool: 'search_airports',
  arguments: {
    query: 'Teterboro',
    country: 'US'
  }
}
```

**Response:**
```json
{
  "airports": [
    {
      "icao": "KTEB",
      "iata": "TEB",
      "name": "Teterboro Airport",
      "city": "Teterboro",
      "state": "New Jersey",
      "country": "United States"
    }
  ]
}
```

## Agent Integration

### Flight Search Agent

```typescript
import { MCPClient } from '@/lib/mcp/client'

const mcpClient = new MCPClient()

// Search for flights
const results = await mcpClient.callTool('avinode', {
  tool: 'search_flights',
  arguments: {
    departure_airport: 'KTEB',
    departure_date: '2025-11-01',
    arrival_airport: 'KMIA',
    passengers: 6
  }
})

// Create RFP with top operators
const rfp = await mcpClient.callTool('avinode', {
  tool: 'create_rfp',
  arguments: {
    flight_details: searchCriteria,
    operator_ids: selectedOperatorIds,
    message: 'VIP client request'
  }
})
```

## API Rate Limits

Avinode enforces rate limits based on your plan:
- **Basic**: 100 requests/hour
- **Pro**: 1000 requests/hour
- **Enterprise**: Custom limits

The client automatically retries on 429 (Rate Limit) errors with exponential backoff.

## Error Handling

The server returns structured error responses:

```json
{
  "content": [{
    "type": "text",
    "text": "Error executing tool: Avinode API error (404): Flight not found"
  }],
  "isError": true
}
```

## Testing

```bash
# Test connection
npx tsx src/index.ts

# Expected output:
# Avinode MCP server running on stdio
```

## Troubleshooting

### Error: Missing AVINODE_API_KEY

Add your API key to `.env.local`:
```env
AVINODE_API_KEY=your-key-here
```

### Error: No response from Avinode API

Check your network connection and verify the API endpoint is accessible.

### Error: Rate limit exceeded

Wait for the rate limit window to reset or upgrade your Avinode plan.

## Security Notes

- **Never commit** API keys to git
- Store credentials in `.env.local` (gitignored)
- Use environment variables only
- Rotate API keys regularly
- Monitor API usage in Avinode dashboard

## Related Documentation

- [Flight Search Agent](../../docs/subagents/agents/flight-search/README.md)
- [Avinode API Documentation](../../docs/subagents/technology-stack/avinode/README.md)
- [Official Avinode API](https://developer.avinodegroup.com/)
- [MCP Server Template](../TEMPLATE.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Jan 2025 | Initial implementation |
