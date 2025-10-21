# Google Sheets MCP Server Implementation

**Task ID**: TASK-010
**Created**: 2025-10-20
**Assigned To**: Backend Developer / Integration Specialist
**Status**: `pending`
**Priority**: `high`
**Estimated Time**: 6 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Implement a specialized MCP server that extends the base MCP infrastructure to provide Google Sheets API integration for managing client profile data, enabling retrieval, synchronization, and updates of client preferences from a centralized spreadsheet.

### User Story
**As a** Client Data Manager Agent
**I want** to access and update client profile information stored in Google Sheets via an MCP interface
**So that** I can retrieve client preferences and history to personalize flight proposals

### Business Value
The Google Sheets MCP server enables centralized client data management without requiring a complex CRM system. By abstracting Google Sheets API complexity behind a clean MCP tool interface, AI agents can access client profiles, preferences, and booking history stored in familiar spreadsheet format, enabling personalized service while keeping operational costs low.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL extend BaseMCPServer with Google Sheets-specific tools
- Inherit all base functionality (validation, error handling, retry logic)
- Register 3 core tools: get_client, sync_clients, update_client
- Configure stdio transport for AI agent communication
- Implement OAuth 2.0 authentication with Google Sheets API

**FR-2**: System SHALL implement get_client tool
- **Input Parameters**:
  - identifier (string, email or name, required)
  - search_field (string, enum: email|name, default: email, optional)
- **Output**: Client profile object with preferences
- **Behavior**: Search sheet for client, return profile data
- **Caching**: Cache results in Redis for 5 minutes

**FR-3**: System SHALL implement sync_clients tool
- **Input Parameters**: None
- **Output**: Sync status with count of clients processed
- **Behavior**: Fetch all clients from sheet, cache in Redis, update Supabase
- **Performance**: Process 1000+ clients in <10 seconds

**FR-4**: System SHALL implement update_client tool
- **Input Parameters**:
  - client_id (string, required)
  - updates (object with fields to update, required)
- **Output**: Updated client profile
- **Behavior**: Update client data in Google Sheets and clear cache

**FR-5**: System SHALL support configurable sheet structure
- Detect header row automatically
- Map column names to client fields
- Handle missing or optional fields gracefully
- Support custom field naming conventions

**FR-6**: System SHALL implement data caching
- Cache client profiles in Redis (5-minute TTL)
- Cache full client list (10-minute TTL)
- Invalidate cache on updates
- Support manual cache refresh

**FR-7**: System SHALL validate client data
- Email format validation
- Phone number format (optional)
- Date format for booking history
- Required fields enforcement

### Acceptance Criteria

- [ ] **AC-1**: GoogleSheetsMCPServer extends BaseMCPServer
- [ ] **AC-2**: All 3 tools registered with valid schemas
- [ ] **AC-3**: get_client retrieves client by email or name
- [ ] **AC-4**: sync_clients fetches and caches all clients
- [ ] **AC-5**: update_client modifies sheet data correctly
- [ ] **AC-6**: Client data cached in Redis for performance
- [ ] **AC-7**: Sheet structure auto-detected from headers
- [ ] **AC-8**: OAuth tokens refresh automatically
- [ ] **AC-9**: All tools validate input parameters
- [ ] **AC-10**: Errors properly formatted and logged
- [ ] **AC-11**: Unit tests achieve >75% coverage
- [ ] **AC-12**: Integration tests verify sheet operations
- [ ] **AC-13**: Code review approved

### Non-Functional Requirements

- **Performance**: get_client returns in <500ms (cached) or <2s (uncached)
- **Reliability**: Automatic retry for transient API failures
- **Security**: OAuth credentials never logged or exposed
- **Scalability**: Handle sheets with 10,000+ rows
- **Data Integrity**: Concurrent updates handled safely

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/unit/mcp/google-sheets-server.test.ts
__tests__/unit/mcp/google-sheets-client.test.ts
__tests__/integration/mcp/sheets-tools.test.ts
```

**Example Test (Write This First)**:
```typescript
// __tests__/unit/mcp/google-sheets-server.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { GoogleSheetsMCPServer } from '@/lib/mcp/google-sheets-server'

describe('GoogleSheetsMCPServer', () => {
  let server: GoogleSheetsMCPServer

  beforeEach(() => {
    server = new GoogleSheetsMCPServer()
  })

  afterEach(async () => {
    await server.stop()
  })

  describe('Tool Registration', () => {
    it('should register all 3 Google Sheets tools', () => {
      const tools = server.getTools()
      expect(tools).toContain('get_client')
      expect(tools).toContain('sync_clients')
      expect(tools).toContain('update_client')
    })
  })

  describe('get_client Tool', () => {
    beforeEach(async () => {
      await server.start()
    })

    it('should retrieve client by email', async () => {
      const result = await server.executeTool('get_client', {
        identifier: 'john.doe@example.com',
        search_field: 'email'
      })

      expect(result).toHaveProperty('client_id')
      expect(result).toHaveProperty('name')
      expect(result).toHaveProperty('email', 'john.doe@example.com')
      expect(result).toHaveProperty('preferences')
    })

    it('should retrieve client by name', async () => {
      const result = await server.executeTool('get_client', {
        identifier: 'John Doe',
        search_field: 'name'
      })

      expect(result).toHaveProperty('name', 'John Doe')
    })

    it('should return cached data on subsequent calls', async () => {
      const start1 = Date.now()
      await server.executeTool('get_client', {
        identifier: 'john.doe@example.com'
      })
      const duration1 = Date.now() - start1

      const start2 = Date.now()
      await server.executeTool('get_client', {
        identifier: 'john.doe@example.com'
      })
      const duration2 = Date.now() - start2

      // Second call should be much faster (cached)
      expect(duration2).toBeLessThan(duration1 / 2)
    })

    it('should throw error for non-existent client', async () => {
      await expect(
        server.executeTool('get_client', {
          identifier: 'nonexistent@example.com'
        })
      ).rejects.toThrow('Client not found')
    })

    it('should validate email format', async () => {
      await expect(
        server.executeTool('get_client', {
          identifier: 'invalid-email',
          search_field: 'email'
        })
      ).rejects.toThrow('Validation failed')
    })
  })

  describe('sync_clients Tool', () => {
    beforeEach(async () => {
      await server.start()
    })

    it('should sync all clients from sheet', async () => {
      const result = await server.executeTool('sync_clients', {})

      expect(result).toHaveProperty('total_clients')
      expect(result).toHaveProperty('synced')
      expect(result).toHaveProperty('failed')
      expect(result).toHaveProperty('duration_ms')
      expect(result.total_clients).toBeGreaterThan(0)
    })

    it('should cache synced clients', async () => {
      await server.executeTool('sync_clients', {})

      // Subsequent get_client should be fast (cached)
      const start = Date.now()
      await server.executeTool('get_client', {
        identifier: 'john.doe@example.com'
      })
      const duration = Date.now() - start

      expect(duration).toBeLessThan(100) // Very fast from cache
    })
  })

  describe('update_client Tool', () => {
    beforeEach(async () => {
      await server.start()
    })

    it('should update client data in sheet', async () => {
      const result = await server.executeTool('update_client', {
        client_id: 'CLIENT-001',
        updates: {
          phone: '+1-555-0123',
          preferences: {
            catering: 'Vegetarian',
            ground_transport: 'Required'
          }
        }
      })

      expect(result).toHaveProperty('client_id', 'CLIENT-001')
      expect(result).toHaveProperty('updated_fields')
      expect(result.updated_fields).toContain('phone')
      expect(result.updated_fields).toContain('preferences')
    })

    it('should invalidate cache after update', async () => {
      // Cache client first
      await server.executeTool('get_client', {
        identifier: 'john.doe@example.com'
      })

      // Update client
      await server.executeTool('update_client', {
        client_id: 'CLIENT-001',
        updates: { phone: '+1-555-9999' }
      })

      // Get client again - should fetch fresh data
      const result = await server.executeTool('get_client', {
        identifier: 'john.doe@example.com'
      })

      expect(result.phone).toBe('+1-555-9999')
    })
  })

  describe('Data Caching', () => {
    beforeEach(async () => {
      await server.start()
    })

    it('should cache client data with TTL', async () => {
      // First call - not cached
      const result1 = await server.executeTool('get_client', {
        identifier: 'john.doe@example.com'
      })

      // Second call - cached
      const result2 = await server.executeTool('get_client', {
        identifier: 'john.doe@example.com'
      })

      expect(result1).toEqual(result2)
    })
  })

  describe('Sheet Structure Detection', () => {
    it('should detect header row automatically', async () => {
      // Implementation test for header detection
    })

    it('should map column names to client fields', async () => {
      // Test field mapping logic
    })

    it('should handle missing optional fields', async () => {
      // Test graceful handling of missing data
    })
  })

  describe('Error Handling', () => {
    it('should not expose OAuth credentials in errors', async () => {
      try {
        await server.executeTool('get_client', {})
      } catch (error: any) {
        const errorString = JSON.stringify(error)
        expect(errorString).not.toContain('client_secret')
        expect(errorString).not.toContain('refresh_token')
      }
    })

    it('should handle sheet API errors gracefully', async () => {
      // Mock API error scenario
      // Verify proper error handling and retry
    })
  })
})
```

**Run Tests** (should FAIL initially):
```bash
npm test -- google-sheets-server
# Expected: Tests fail because implementation doesn't exist
```

### Step 2: Implement Minimal Code (Green Phase)

```typescript
// lib/mcp/google-sheets-server.ts
import { BaseMCPServer } from './base-server'
import { GoogleSheetsClient } from './clients/google-sheets-client'
import { RedisCache } from './utils/redis-cache'

export class GoogleSheetsMCPServer extends BaseMCPServer {
  private client: GoogleSheetsClient
  private cache: RedisCache

  constructor() {
    super({
      name: 'google-sheets-mcp-server',
      version: '1.0.0',
      transport: 'stdio',
      timeout: 10000
    })

    this.client = new GoogleSheetsClient({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN!,
      spreadsheetId: process.env.GOOGLE_SHEETS_CLIENT_DB_ID!
    })

    this.cache = new RedisCache({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    })

    this.registerTools()
  }

  private registerTools() {
    // get_client tool
    this.registerTool({
      name: 'get_client',
      description: 'Retrieve client profile by email or name',
      inputSchema: {
        type: 'object',
        properties: {
          identifier: {
            type: 'string',
            minLength: 1,
            description: 'Client email or name'
          },
          search_field: {
            type: 'string',
            enum: ['email', 'name'],
            default: 'email',
            description: 'Field to search by'
          }
        },
        required: ['identifier']
      },
      execute: async (params) => {
        const { identifier, search_field = 'email' } = params

        // Check cache first
        const cacheKey = `client:${search_field}:${identifier}`
        const cached = await this.cache.get(cacheKey)
        if (cached) {
          return cached
        }

        // Fetch from sheet
        const client = await this.client.getClient(identifier, search_field)

        // Cache for 5 minutes
        await this.cache.set(cacheKey, client, 300)

        return client
      }
    })

    // sync_clients tool
    this.registerTool({
      name: 'sync_clients',
      description: 'Synchronize all clients from Google Sheets to cache',
      inputSchema: {
        type: 'object',
        properties: {}
      },
      execute: async () => {
        const startTime = Date.now()

        const clients = await this.client.getAllClients()

        let synced = 0
        let failed = 0

        for (const client of clients) {
          try {
            // Cache each client
            await this.cache.set(`client:email:${client.email}`, client, 600)
            await this.cache.set(`client:name:${client.name}`, client, 600)
            synced++
          } catch (error) {
            failed++
          }
        }

        const duration = Date.now() - startTime

        return {
          total_clients: clients.length,
          synced,
          failed,
          duration_ms: duration
        }
      }
    })

    // update_client tool
    this.registerTool({
      name: 'update_client',
      description: 'Update client data in Google Sheets',
      inputSchema: {
        type: 'object',
        properties: {
          client_id: {
            type: 'string',
            description: 'Client identifier'
          },
          updates: {
            type: 'object',
            description: 'Fields to update'
          }
        },
        required: ['client_id', 'updates']
      },
      execute: async (params) => {
        const { client_id, updates } = params

        const result = await this.client.updateClient(client_id, updates)

        // Invalidate cache
        await this.cache.delete(`client:email:${result.email}`)
        await this.cache.delete(`client:name:${result.name}`)

        return {
          client_id,
          updated_fields: Object.keys(updates),
          ...result
        }
      }
    })
  }
}
```

```typescript
// lib/mcp/clients/google-sheets-client.ts
import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

interface SheetsConfig {
  clientId: string
  clientSecret: string
  refreshToken: string
  spreadsheetId: string
}

export class GoogleSheetsClient {
  private oauth2Client: OAuth2Client
  private sheets: any
  private spreadsheetId: string

  constructor(config: SheetsConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret
    )

    this.oauth2Client.setCredentials({
      refresh_token: config.refreshToken
    })

    this.sheets = google.sheets({ version: 'v4', auth: this.oauth2Client })
    this.spreadsheetId = config.spreadsheetId
  }

  async getClient(identifier: string, searchField: string): Promise<any> {
    const allClients = await this.getAllClients()

    const client = allClients.find((c: any) =>
      searchField === 'email'
        ? c.email.toLowerCase() === identifier.toLowerCase()
        : c.name.toLowerCase() === identifier.toLowerCase()
    )

    if (!client) {
      throw new Error('Client not found')
    }

    return client
  }

  async getAllClients(): Promise<any[]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'Clients!A:Z' // Adjust range as needed
    })

    const rows = response.data.values
    if (!rows || rows.length === 0) {
      return []
    }

    // First row is headers
    const headers = rows[0]
    const clients = []

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const client: any = {}

      headers.forEach((header: string, index: number) => {
        const value = row[index] || ''
        const key = this.normalizeHeaderName(header)

        // Parse JSON fields (preferences, etc.)
        if (key === 'preferences' && value) {
          try {
            client[key] = JSON.parse(value)
          } catch {
            client[key] = {}
          }
        } else {
          client[key] = value
        }
      })

      clients.push(client)
    }

    return clients
  }

  async updateClient(clientId: string, updates: any): Promise<any> {
    // Find row by client_id
    const allClients = await this.getAllClients()
    const clientIndex = allClients.findIndex((c: any) => c.client_id === clientId)

    if (clientIndex === -1) {
      throw new Error('Client not found')
    }

    const rowNumber = clientIndex + 2 // +1 for header, +1 for 1-based indexing

    // Get headers to map update fields to columns
    const headers = await this.getHeaders()

    // Build update values
    const values = []
    for (const [key, value] of Object.entries(updates)) {
      const columnIndex = headers.indexOf(key)
      if (columnIndex !== -1) {
        const column = this.numberToColumn(columnIndex)
        const range = `Clients!${column}${rowNumber}`

        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range,
          valueInputOption: 'RAW',
          requestBody: {
            values: [[typeof value === 'object' ? JSON.stringify(value) : value]]
          }
        })
      }
    }

    return {
      ...allClients[clientIndex],
      ...updates
    }
  }

  private async getHeaders(): Promise<string[]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'Clients!A1:Z1'
    })

    return response.data.values[0].map((h: string) => this.normalizeHeaderName(h))
  }

  private normalizeHeaderName(header: string): string {
    return header.toLowerCase().replace(/\s+/g, '_')
  }

  private numberToColumn(num: number): string {
    let column = ''
    while (num >= 0) {
      column = String.fromCharCode((num % 26) + 65) + column
      num = Math.floor(num / 26) - 1
    }
    return column
  }
}
```

```typescript
// lib/mcp/utils/redis-cache.ts
import { Redis } from 'ioredis'

export class RedisCache {
  private client: Redis

  constructor(config: { url: string }) {
    this.client = new Redis(config.url)
  }

  async get(key: string): Promise<any> {
    const value = await this.client.get(key)
    return value ? JSON.parse(value) : null
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value)
    if (ttl) {
      await this.client.setex(key, ttl, serialized)
    } else {
      await this.client.set(key, serialized)
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key)
  }

  async clear(): Promise<void> {
    await this.client.flushdb()
  }
}
```

---

## 4. IMPLEMENTATION STEPS

**Step 1**: Install Dependencies
```bash
npm install googleapis google-auth-library ioredis
```

**Step 2**: Configure Google Sheets
- Create spreadsheet with client data
- Set up OAuth credentials
- Get spreadsheet ID

**Step 3**: Implement Clients and Server
(See code above)

**Step 4**: Create Server Entry Point
```typescript
// mcp-servers/google-sheets/index.ts
import { GoogleSheetsMCPServer } from '@/lib/mcp/google-sheets-server'

const server = new GoogleSheetsMCPServer()
server.start().then(() => console.log('Google Sheets MCP Server started'))
```

---

## 5. GIT WORKFLOW

```bash
git checkout -b feature/google-sheets-mcp-server
git add lib/mcp/google-sheets-server.ts lib/mcp/clients/google-sheets-client.ts
git commit -m "feat(mcp): implement Google Sheets MCP server"
git push origin feature/google-sheets-mcp-server
```

---

## 6-11. STANDARD SECTIONS

(Following same structure as previous tasks)

- Code Review Checklist
- Testing Requirements (>75% coverage)
- Definition of Done
- Resources & References
- Notes & Questions
- Completion Summary

---

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
