# Avinode MCP Server Implementation

**Task ID**: TASK-008
**Created**: 2025-10-20
**Assigned To**: Backend Developer / Integration Specialist
**Status**: `pending`
**Priority**: `critical`
**Estimated Time**: 12 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Implement a specialized MCP server that extends the base MCP infrastructure to provide Avinode API integration for flight search, RFP creation, and quote management with mock mode support for development and testing.

### User Story
**As a** Flight Search Agent
**I want** to search available aircraft and create RFPs via a standardized MCP interface
**So that** I can find flight options and request quotes from operators programmatically

### Business Value
The Avinode MCP server is critical for the core flight search and quote management workflow. It abstracts the Avinode API complexity behind a clean MCP tool interface, enabling AI agents to search flights and manage RFPs without dealing with API details. The mock mode ensures development can proceed without waiting for Avinode API approval.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL extend BaseMCPServer with Avinode-specific tools
- Inherit all base functionality (validation, error handling, retry logic)
- Register 4 core tools: search_flights, create_rfp, get_quote_status, get_quotes
- Configure stdio transport for AI agent communication
- Implement proper error mapping from Avinode API to MCP format

**FR-2**: System SHALL implement search_flights tool
- **Input Parameters**:
  - departure_airport (string, ICAO code, required)
  - arrival_airport (string, ICAO code, required)
  - passengers (integer, 1-19, required)
  - departure_date (string, ISO 8601 date, required)
  - aircraft_category (string, enum: light|midsize|heavy|ultra-long-range, optional)
- **Output**: Array of available aircraft with specifications
- **Behavior**: Query Avinode API, filter by criteria, return qualified aircraft
- **Timeout**: 30 seconds

**FR-3**: System SHALL implement create_rfp tool
- **Input Parameters**:
  - flight_details (object with route, passengers, date)
  - operator_ids (array of strings, selected operators)
  - deadline (string, ISO 8601 datetime, optional)
  - special_requirements (string, optional)
- **Output**: RFP ID and creation confirmation
- **Behavior**: Create RFP in Avinode, distribute to operators, track status

**FR-4**: System SHALL implement get_quote_status tool
- **Input Parameters**:
  - rfp_id (string, required)
- **Output**: Status object with response counts and timestamps
- **Behavior**: Poll Avinode for RFP status, return aggregated data

**FR-5**: System SHALL implement get_quotes tool
- **Input Parameters**:
  - rfp_id (string, required)
- **Output**: Array of operator quotes with pricing and aircraft details
- **Behavior**: Fetch all quotes for an RFP, format for consumption

**FR-6**: System SHALL support mock mode for development
- Detect mock mode via environment variable (AVINODE_API_KEY=mock_*)
- Return realistic mock data for all tools
- Simulate API delays (500-2000ms) for realistic testing
- Mock error scenarios (not found, timeout, invalid params)

**FR-7**: System SHALL implement Avinode API client
- RESTful HTTP client with authentication
- Request/response logging
- Rate limiting compliance (respect Avinode limits)
- Error handling with retry for transient failures

### Acceptance Criteria

- [ ] **AC-1**: AvinodeMCPServer extends BaseMCPServer
- [ ] **AC-2**: All 4 tools registered with valid schemas
- [ ] **AC-3**: search_flights returns aircraft matching criteria
- [ ] **AC-4**: create_rfp creates RFP and returns ID
- [ ] **AC-5**: get_quote_status returns accurate status
- [ ] **AC-6**: get_quotes returns all quotes for RFP
- [ ] **AC-7**: Mock mode works without real API credentials
- [ ] **AC-8**: Real API mode integrates with Avinode (when available)
- [ ] **AC-9**: All tools validate input parameters
- [ ] **AC-10**: Errors properly formatted and logged
- [ ] **AC-11**: Unit tests achieve >75% coverage
- [ ] **AC-12**: Integration tests verify tool execution
- [ ] **AC-13**: Code review approved

### Non-Functional Requirements

- **Performance**: search_flights completes in <5 seconds
- **Reliability**: Automatic retry for failed API calls (3 attempts)
- **Security**: API keys never logged or exposed in errors
- **Usability**: Clear error messages for common issues
- **Maintainability**: Mock data easy to update and extend

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/unit/mcp/avinode-server.test.ts
__tests__/unit/mcp/avinode-client.test.ts
__tests__/integration/mcp/avinode-tools.test.ts
```

**Example Test (Write This First)**:
```typescript
// __tests__/unit/mcp/avinode-server.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AvinodeMCPServer } from '@/lib/mcp/avinode-server'

describe('AvinodeMCPServer', () => {
  let server: AvinodeMCPServer

  beforeEach(() => {
    // Set mock mode
    process.env.AVINODE_API_KEY = 'mock_key_for_testing'
    server = new AvinodeMCPServer()
  })

  afterEach(async () => {
    await server.stop()
  })

  describe('Tool Registration', () => {
    it('should register all 4 Avinode tools', () => {
      const tools = server.getTools()
      expect(tools).toContain('search_flights')
      expect(tools).toContain('create_rfp')
      expect(tools).toContain('get_quote_status')
      expect(tools).toContain('get_quotes')
    })
  })

  describe('search_flights Tool', () => {
    beforeEach(async () => {
      await server.start()
    })

    it('should search flights with valid parameters', async () => {
      const result = await server.executeTool('search_flights', {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      })

      expect(result).toHaveProperty('aircraft')
      expect(Array.isArray(result.aircraft)).toBe(true)
      expect(result.aircraft.length).toBeGreaterThan(0)

      // Verify aircraft structure
      const aircraft = result.aircraft[0]
      expect(aircraft).toHaveProperty('id')
      expect(aircraft).toHaveProperty('type')
      expect(aircraft).toHaveProperty('category')
      expect(aircraft).toHaveProperty('capacity')
      expect(aircraft).toHaveProperty('operator')
    })

    it('should filter by aircraft category', async () => {
      const result = await server.executeTool('search_flights', {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15',
        aircraft_category: 'midsize'
      })

      // All returned aircraft should be midsize
      result.aircraft.forEach((aircraft: any) => {
        expect(aircraft.category).toBe('midsize')
      })
    })

    it('should validate required parameters', async () => {
      await expect(
        server.executeTool('search_flights', {
          departure_airport: 'KTEB',
          // Missing arrival_airport, passengers, departure_date
        })
      ).rejects.toThrow('Validation failed')
    })

    it('should validate ICAO airport codes', async () => {
      await expect(
        server.executeTool('search_flights', {
          departure_airport: 'INVALID',
          arrival_airport: 'KVNY',
          passengers: 6,
          departure_date: '2025-11-15'
        })
      ).rejects.toThrow()
    })

    it('should validate passenger count range', async () => {
      await expect(
        server.executeTool('search_flights', {
          departure_airport: 'KTEB',
          arrival_airport: 'KVNY',
          passengers: 50, // Too many
          departure_date: '2025-11-15'
        })
      ).rejects.toThrow('Validation failed')
    })

    it('should validate date format', async () => {
      await expect(
        server.executeTool('search_flights', {
          departure_airport: 'KTEB',
          arrival_airport: 'KVNY',
          passengers: 6,
          departure_date: 'invalid-date'
        })
      ).rejects.toThrow()
    })
  })

  describe('create_rfp Tool', () => {
    beforeEach(async () => {
      await server.start()
    })

    it('should create RFP with valid parameters', async () => {
      const result = await server.executeTool('create_rfp', {
        flight_details: {
          departure_airport: 'KTEB',
          arrival_airport: 'KVNY',
          passengers: 6,
          departure_date: '2025-11-15'
        },
        operator_ids: ['OP-001', 'OP-002', 'OP-003']
      })

      expect(result).toHaveProperty('rfp_id')
      expect(result).toHaveProperty('status', 'created')
      expect(result).toHaveProperty('operators_notified')
      expect(result.operators_notified).toBe(3)
    })

    it('should include optional special requirements', async () => {
      const result = await server.executeTool('create_rfp', {
        flight_details: {
          departure_airport: 'KTEB',
          arrival_airport: 'KVNY',
          passengers: 6,
          departure_date: '2025-11-15'
        },
        operator_ids: ['OP-001'],
        special_requirements: 'Pet-friendly aircraft required'
      })

      expect(result).toHaveProperty('rfp_id')
    })
  })

  describe('get_quote_status Tool', () => {
    beforeEach(async () => {
      await server.start()
    })

    it('should return status for existing RFP', async () => {
      const result = await server.executeTool('get_quote_status', {
        rfp_id: 'RFP-12345'
      })

      expect(result).toHaveProperty('rfp_id', 'RFP-12345')
      expect(result).toHaveProperty('total_operators')
      expect(result).toHaveProperty('responded')
      expect(result).toHaveProperty('pending')
      expect(result).toHaveProperty('created_at')
    })

    it('should throw error for non-existent RFP', async () => {
      await expect(
        server.executeTool('get_quote_status', {
          rfp_id: 'NONEXISTENT'
        })
      ).rejects.toThrow('RFP not found')
    })
  })

  describe('get_quotes Tool', () => {
    beforeEach(async () => {
      await server.start()
    })

    it('should return quotes for RFP', async () => {
      const result = await server.executeTool('get_quotes', {
        rfp_id: 'RFP-12345'
      })

      expect(result).toHaveProperty('rfp_id')
      expect(result).toHaveProperty('quotes')
      expect(Array.isArray(result.quotes)).toBe(true)

      if (result.quotes.length > 0) {
        const quote = result.quotes[0]
        expect(quote).toHaveProperty('quote_id')
        expect(quote).toHaveProperty('operator_id')
        expect(quote).toHaveProperty('operator_name')
        expect(quote).toHaveProperty('aircraft_type')
        expect(quote).toHaveProperty('base_price')
        expect(quote).toHaveProperty('response_time')
      }
    })
  })

  describe('Mock Mode', () => {
    it('should detect mock mode from API key', () => {
      process.env.AVINODE_API_KEY = 'mock_key'
      const mockServer = new AvinodeMCPServer()
      expect(mockServer.isUsingMockMode()).toBe(true)
    })

    it('should detect real mode from real API key', () => {
      process.env.AVINODE_API_KEY = 'real_api_key_xyz'
      const realServer = new AvinodeMCPServer()
      expect(realServer.isUsingMockMode()).toBe(false)
    })

    it('should return realistic mock data', async () => {
      await server.start()
      const result = await server.executeTool('search_flights', {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      })

      // Mock should return 3-5 aircraft
      expect(result.aircraft.length).toBeGreaterThanOrEqual(3)
      expect(result.aircraft.length).toBeLessThanOrEqual(5)
    })
  })

  describe('Error Handling', () => {
    beforeEach(async () => {
      await server.start()
    })

    it('should handle API errors gracefully', async () => {
      // Mock an API error scenario
      // Implementation depends on how we mock errors
    })

    it('should not expose API keys in errors', async () => {
      try {
        await server.executeTool('search_flights', {})
      } catch (error: any) {
        const errorString = JSON.stringify(error)
        expect(errorString).not.toContain(process.env.AVINODE_API_KEY!)
      }
    })
  })
})
```

**Run Tests** (should FAIL initially):
```bash
npm test -- avinode-server
# Expected: Tests fail because implementation doesn't exist
```

### Step 2: Implement Minimal Code (Green Phase)

**Implementation Checklist**:
- [ ] Create AvinodeMCPServer class
- [ ] Implement Avinode API client
- [ ] Implement mock data generator
- [ ] Register all 4 tools
- [ ] Implement tool execution logic
- [ ] Make tests pass

**Example Implementation**:
```typescript
// lib/mcp/avinode-server.ts
import { BaseMCPServer } from './base-server'
import { AvinodeClient } from './clients/avinode-client'
import { MockAvinodeClient } from './clients/mock-avinode-client'

export class AvinodeMCPServer extends BaseMCPServer {
  private client: AvinodeClient | MockAvinodeClient
  private mockMode: boolean

  constructor() {
    super({
      name: 'avinode-mcp-server',
      version: '1.0.0',
      transport: 'stdio',
      timeout: 30000
    })

    // Detect mock mode
    const apiKey = process.env.AVINODE_API_KEY || ''
    this.mockMode = apiKey.startsWith('mock_') || apiKey === ''

    // Initialize client
    if (this.mockMode) {
      this.client = new MockAvinodeClient()
    } else {
      this.client = new AvinodeClient({
        apiKey,
        baseUrl: process.env.AVINODE_API_URL || 'https://api.avinode.com/v1'
      })
    }

    // Register tools
    this.registerTools()
  }

  isUsingMockMode(): boolean {
    return this.mockMode
  }

  private registerTools() {
    // search_flights tool
    this.registerTool({
      name: 'search_flights',
      description: 'Search for available aircraft matching flight criteria',
      inputSchema: {
        type: 'object',
        properties: {
          departure_airport: {
            type: 'string',
            pattern: '^[A-Z]{4}$',
            description: 'ICAO airport code (e.g., KTEB)'
          },
          arrival_airport: {
            type: 'string',
            pattern: '^[A-Z]{4}$',
            description: 'ICAO airport code (e.g., KVNY)'
          },
          passengers: {
            type: 'integer',
            minimum: 1,
            maximum: 19,
            description: 'Number of passengers'
          },
          departure_date: {
            type: 'string',
            format: 'date',
            description: 'Departure date in ISO 8601 format (YYYY-MM-DD)'
          },
          aircraft_category: {
            type: 'string',
            enum: ['light', 'midsize', 'heavy', 'ultra-long-range'],
            description: 'Optional aircraft category filter'
          }
        },
        required: ['departure_airport', 'arrival_airport', 'passengers', 'departure_date']
      },
      execute: async (params) => {
        return await this.client.searchFlights(params)
      }
    })

    // create_rfp tool
    this.registerTool({
      name: 'create_rfp',
      description: 'Create an RFP and distribute to selected operators',
      inputSchema: {
        type: 'object',
        properties: {
          flight_details: {
            type: 'object',
            properties: {
              departure_airport: { type: 'string' },
              arrival_airport: { type: 'string' },
              passengers: { type: 'integer' },
              departure_date: { type: 'string' }
            },
            required: ['departure_airport', 'arrival_airport', 'passengers', 'departure_date']
          },
          operator_ids: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            description: 'Array of operator IDs to send RFP to'
          },
          deadline: {
            type: 'string',
            format: 'date-time',
            description: 'Optional deadline for quote responses'
          },
          special_requirements: {
            type: 'string',
            description: 'Optional special requirements or notes'
          }
        },
        required: ['flight_details', 'operator_ids']
      },
      execute: async (params) => {
        return await this.client.createRFP(params)
      }
    })

    // get_quote_status tool
    this.registerTool({
      name: 'get_quote_status',
      description: 'Get the current status of an RFP',
      inputSchema: {
        type: 'object',
        properties: {
          rfp_id: {
            type: 'string',
            description: 'RFP identifier'
          }
        },
        required: ['rfp_id']
      },
      execute: async (params) => {
        return await this.client.getQuoteStatus(params.rfp_id)
      }
    })

    // get_quotes tool
    this.registerTool({
      name: 'get_quotes',
      description: 'Retrieve all quotes for an RFP',
      inputSchema: {
        type: 'object',
        properties: {
          rfp_id: {
            type: 'string',
            description: 'RFP identifier'
          }
        },
        required: ['rfp_id']
      },
      execute: async (params) => {
        return await this.client.getQuotes(params.rfp_id)
      }
    })
  }
}
```

```typescript
// lib/mcp/clients/mock-avinode-client.ts
export class MockAvinodeClient {
  async searchFlights(params: any) {
    // Simulate API delay
    await this.delay(500, 2000)

    const { departure_airport, arrival_airport, passengers, aircraft_category } = params

    // Generate mock aircraft
    const allAircraft = this.generateMockAircraft()

    // Filter by category if specified
    let filtered = aircraft_category
      ? allAircraft.filter(a => a.category === aircraft_category)
      : allAircraft

    // Filter by capacity
    filtered = filtered.filter(a => a.capacity >= passengers)

    // Return 3-5 random aircraft
    const count = Math.floor(Math.random() * 3) + 3
    const shuffled = filtered.sort(() => Math.random() - 0.5)

    return {
      aircraft: shuffled.slice(0, count),
      total: count,
      query: { departure_airport, arrival_airport, passengers }
    }
  }

  async createRFP(params: any) {
    await this.delay(800, 1500)

    const rfpId = `RFP-${Date.now()}`

    return {
      rfp_id: rfpId,
      status: 'created',
      operators_notified: params.operator_ids.length,
      created_at: new Date().toISOString()
    }
  }

  async getQuoteStatus(rfpId: string) {
    await this.delay(300, 800)

    if (!rfpId.startsWith('RFP-')) {
      throw new Error('RFP not found')
    }

    const totalOperators = 5
    const responded = Math.floor(Math.random() * totalOperators)

    return {
      rfp_id: rfpId,
      total_operators: totalOperators,
      responded,
      pending: totalOperators - responded,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      deadline: new Date(Date.now() + 86400000).toISOString()
    }
  }

  async getQuotes(rfpId: string) {
    await this.delay(500, 1200)

    if (!rfpId.startsWith('RFP-')) {
      throw new Error('RFP not found')
    }

    const quotes = this.generateMockQuotes(rfpId)

    return {
      rfp_id: rfpId,
      quotes,
      total: quotes.length
    }
  }

  private generateMockAircraft() {
    return [
      {
        id: 'AC-001',
        type: 'Citation X',
        category: 'midsize',
        capacity: 8,
        range: 3242,
        speed: 604,
        operator: {
          id: 'OP-001',
          name: 'Executive Jet Management',
          rating: 4.8
        }
      },
      {
        id: 'AC-002',
        type: 'Gulfstream G550',
        category: 'heavy',
        capacity: 14,
        range: 6750,
        speed: 562,
        operator: {
          id: 'OP-002',
          name: 'NetJets',
          rating: 4.9
        }
      },
      {
        id: 'AC-003',
        type: 'Challenger 350',
        category: 'midsize',
        capacity: 9,
        range: 3200,
        speed: 541,
        operator: {
          id: 'OP-003',
          name: 'VistaJet',
          rating: 4.7
        }
      },
      {
        id: 'AC-004',
        type: 'Phenom 300',
        category: 'light',
        capacity: 7,
        range: 1971,
        speed: 464,
        operator: {
          id: 'OP-004',
          name: 'Flexjet',
          rating: 4.6
        }
      },
      {
        id: 'AC-005',
        type: 'Global 7500',
        category: 'ultra-long-range',
        capacity: 17,
        range: 7700,
        speed: 590,
        operator: {
          id: 'OP-005',
          name: 'Bombardier Business Aircraft',
          rating: 4.8
        }
      }
    ]
  }

  private generateMockQuotes(rfpId: string) {
    const count = Math.floor(Math.random() * 3) + 2 // 2-4 quotes

    return Array.from({ length: count }, (_, i) => ({
      quote_id: `QT-${Date.now()}-${i}`,
      rfp_id: rfpId,
      operator_id: `OP-00${i + 1}`,
      operator_name: ['Executive Jet Management', 'NetJets', 'VistaJet', 'Flexjet'][i],
      aircraft_type: ['Citation X', 'Gulfstream G550', 'Challenger 350', 'Phenom 300'][i],
      base_price: Math.floor(Math.random() * 50000) + 30000,
      response_time: Math.floor(Math.random() * 120) + 10, // 10-130 minutes
      created_at: new Date(Date.now() - Math.random() * 3600000).toISOString()
    }))
  }

  private delay(min: number, max: number): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

**Run Tests Again**:
```bash
npm test -- avinode-server
# Expected: Tests now pass ✓
```

### Step 3: Refactor (Blue Phase)

**Refactoring Checklist**:
- [ ] Extract common validation logic
- [ ] Improve error messages
- [ ] Add JSDoc comments
- [ ] Optimize mock data generation

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

- [ ] TASK-007 (MCP Base Server) completed
- [ ] TASK-003 (Environment) configured
- [ ] Avinode API documentation reviewed
- [ ] Mock data requirements understood

### Step-by-Step Implementation

**Step 1**: Create Directory Structure

```bash
mkdir -p lib/mcp/clients
mkdir -p lib/mcp/mocks
```

**Step 2**: Implement Mock Client (for development)

File: `lib/mcp/clients/mock-avinode-client.ts` (see above)

**Step 3**: Implement Real Avinode Client

```typescript
// lib/mcp/clients/avinode-client.ts
import axios, { AxiosInstance } from 'axios'

interface AvinodeConfig {
  apiKey: string
  baseUrl: string
}

export class AvinodeClient {
  private client: AxiosInstance

  constructor(config: AvinodeConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    })
  }

  async searchFlights(params: any) {
    const response = await this.client.post('/flights/search', params)
    return response.data
  }

  async createRFP(params: any) {
    const response = await this.client.post('/rfqs', params)
    return response.data
  }

  async getQuoteStatus(rfpId: string) {
    const response = await this.client.get(`/rfqs/${rfpId}/status`)
    return response.data
  }

  async getQuotes(rfpId: string) {
    const response = await this.client.get(`/rfqs/${rfpId}/quotes`)
    return response.data
  }
}
```

**Step 4**: Implement Avinode MCP Server

File: `lib/mcp/avinode-server.ts` (see above)

**Step 5**: Create Server Entry Point

```typescript
// mcp-servers/avinode/index.ts
import { AvinodeMCPServer } from '@/lib/mcp/avinode-server'

const server = new AvinodeMCPServer()

server.start().then(() => {
  console.log('Avinode MCP Server started in', server.isUsingMockMode() ? 'MOCK' : 'REAL', 'mode')
})

// Graceful shutdown
process.on('SIGINT', async () => {
  await server.stop()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await server.stop()
  process.exit(0)
})
```

**Step 6**: Add npm Scripts

```json
// package.json
{
  "scripts": {
    "mcp:avinode": "tsx mcp-servers/avinode/index.ts",
    "mcp:avinode:dev": "tsx watch mcp-servers/avinode/index.ts"
  }
}
```

**Step 7**: Write Comprehensive Tests

Create test files mentioned in TDD section.

**Step 8**: Create Usage Documentation

```markdown
// mcp-servers/avinode/README.md
# Avinode MCP Server

## Overview
MCP server for Avinode flight search and RFP management.

## Tools

### search_flights
Search for available aircraft.

**Parameters:**
- `departure_airport` (string, ICAO code)
- `arrival_airport` (string, ICAO code)
- `passengers` (integer, 1-19)
- `departure_date` (string, ISO 8601 date)
- `aircraft_category` (optional, light|midsize|heavy|ultra-long-range)

**Example:**
\`\`\`json
{
  "departure_airport": "KTEB",
  "arrival_airport": "KVNY",
  "passengers": 6,
  "departure_date": "2025-11-15",
  "aircraft_category": "midsize"
}
\`\`\`

### create_rfp
Create an RFP and send to operators.

### get_quote_status
Check RFP status.

### get_quotes
Retrieve all quotes for an RFP.

## Mock Mode

Set `AVINODE_API_KEY=mock_key` to use mock mode.

## Usage

\`\`\`bash
npm run mcp:avinode
\`\`\`
```

### Implementation Validation

- [ ] Server starts without errors
- [ ] All 4 tools registered
- [ ] Mock mode returns data
- [ ] Tests pass

---

## 5. GIT WORKFLOW

### Branch Creation

```bash
git checkout main
git pull origin main
git checkout -b feature/avinode-mcp-server
```

### Commit Guidelines

```bash
git add lib/mcp/avinode-server.ts lib/mcp/clients/
git commit -m "feat(mcp): implement Avinode MCP server with 4 tools"

git add __tests__/unit/mcp/avinode*
git commit -m "test(mcp): add comprehensive Avinode MCP tests"

git add mcp-servers/avinode/
git commit -m "feat(mcp): add Avinode server entry point and documentation"

git push origin feature/avinode-mcp-server
```

### Pull Request Process

```bash
gh pr create --title "Feature: Avinode MCP Server Implementation" \
  --body "Implements Avinode MCP server with flight search and RFP management.

## Tools Implemented
- search_flights: Search available aircraft
- create_rfp: Create and distribute RFPs
- get_quote_status: Check RFP status
- get_quotes: Retrieve operator quotes

## Features
- Mock mode for development
- Real Avinode API integration
- Comprehensive error handling
- Full test coverage

## Dependencies
- TASK-007: MCP Base Server (prerequisite)

Closes #TASK-008"
```

---

## 6. CODE REVIEW CHECKLIST

### Reviewer Checklist

**Functionality**:
- [ ] All 4 tools implemented correctly
- [ ] Mock mode works without API key
- [ ] Real mode integrates with Avinode API
- [ ] Input validation comprehensive

**Testing**:
- [ ] Unit tests cover all tools
- [ ] Integration tests verify workflows
- [ ] Mock and real modes both tested
- [ ] Coverage >75%

**Documentation**:
- [ ] Tool schemas well-documented
- [ ] Usage examples provided
- [ ] Mock mode explained

---

## 7. TESTING REQUIREMENTS

### Unit Tests

Coverage: 75%+

Test files:
- `__tests__/unit/mcp/avinode-server.test.ts`
- `__tests__/unit/mcp/avinode-client.test.ts`
- `__tests__/unit/mcp/mock-avinode-client.test.ts`

### Integration Tests

Test complete workflows:
- Search → Create RFP → Check Status → Get Quotes

---

## 8. DEFINITION OF DONE

- [ ] All 4 tools implemented and tested
- [ ] Mock mode functional
- [ ] Real API mode ready (when credentials available)
- [ ] Tests passing with >75% coverage
- [ ] Documentation complete
- [ ] Code reviewed and approved
- [ ] Merged to main

---

## 9. RESOURCES & REFERENCES

### Documentation
- [Avinode API Documentation](https://docs.avinode.com)
- TASK-007: MCP Base Server
- PRD.md Section 6 (MCP Servers)

### Related Tasks
- TASK-007: MCP Base Server (prerequisite)
- TASK-011: RFP Orchestrator Agent (uses this server)
- TASK-014: Flight Search Agent (uses this server)

---

## 10. NOTES & QUESTIONS

### Implementation Notes
- Mock mode automatically detected via API key prefix
- Mock data includes realistic delays and variability
- Real API client ready for when credentials available

### Open Questions
- [ ] What Avinode API rate limits should we respect?
- [ ] Should we cache search results?

### Assumptions
- Avinode API follows RESTful conventions
- Mock mode sufficient for most development
- Real API access will be granted within 2 weeks

---

## 11. COMPLETION SUMMARY

### What Was Accomplished
*[Fill out after completion]*

### Changes Made
- Created: `lib/mcp/avinode-server.ts`
- Created: `lib/mcp/clients/avinode-client.ts`
- Created: `lib/mcp/clients/mock-avinode-client.ts`
- Created: `mcp-servers/avinode/index.ts`
- Created: `__tests__/unit/mcp/avinode-server.test.ts`

### Test Results
```
*[Paste results]*
```

### Time Tracking
- **Estimated**: 12 hours
- **Actual**: - hours
- **Variance**: - hours

---

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
**Reviewed By**: -
**Review Date**: -
