# Client Data Manager Agent Implementation

**Task ID**: TASK-013
**Created**: 2025-10-20
**Assigned To**: AI/ML Engineer / Backend Developer
**Status**: `pending`
**Priority**: `high`
**Estimated Time**: 6 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Implement the Client Data Manager Agent using OpenAI GPT-4/5 to manage client profiles, integrate with Google Sheets MCP for client data retrieval, implement client preference matching, and provide profile caching for optimized performance.

### User Story
**As an** ISO agent
**I want** the system to automatically identify returning clients and retrieve their preferences
**So that** I can provide personalized service without manually searching through spreadsheets

### Business Value
The Client Data Manager Agent enables personalized customer experience by automatically retrieving client preferences (catering, ground transport, aircraft type) from the centralized Google Sheets database. This eliminates manual data entry, reduces errors, and ensures consistent service quality for returning clients. Personalization is a key differentiator in the luxury private aviation market.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL implement Client Data Manager as OpenAI Assistant
- Use OpenAI GPT-4 or GPT-5 with function calling
- Configure system prompt for client data analysis
- Enable tool use for Google Sheets MCP integration
- Implement intelligent profile matching logic

**FR-2**: System SHALL integrate with Google Sheets MCP
- Connect to Google Sheets client database
- Fetch client profiles by email or name
- Handle fuzzy matching for similar names
- Sync data bidirectionally (read and write)

**FR-3**: System SHALL identify returning clients
- Match incoming requests against existing client database
- Use email as primary identifier
- Fall back to name matching with confidence scoring
- Flag new clients for profile creation

**FR-4**: System SHALL manage client preferences
- Retrieve catering preferences (dietary restrictions, favorites)
- Fetch ground transport preferences (car type, service)
- Get aircraft type preferences (jet category, amenities)
- Store special requirements (pets, medical equipment, accessibility)

**FR-5**: System SHALL cache client profiles
- Store profiles in Supabase `clients` table
- Implement cache invalidation on Google Sheets updates
- Set TTL for cached data (24 hours default)
- Prioritize cache over Google Sheets for performance

**FR-6**: System SHALL handle profile updates
- Update client preferences in Google Sheets
- Sync changes to Supabase cache
- Track last booking date and frequency
- Maintain audit trail of preference changes

### Acceptance Criteria

- [ ] **AC-1**: Client Data Manager implemented as OpenAI Assistant
- [ ] **AC-2**: Google Sheets MCP integration works correctly
- [ ] **AC-3**: Identifies returning clients with >95% accuracy
- [ ] **AC-4**: Retrieves all client preferences successfully
- [ ] **AC-5**: Caching reduces Google Sheets API calls by 80%+
- [ ] **AC-6**: Profile updates sync bidirectionally
- [ ] **AC-7**: Handles new clients and creates profiles
- [ ] **AC-8**: Fuzzy name matching works with 90%+ accuracy
- [ ] **AC-9**: Unit tests achieve >75% coverage
- [ ] **AC-10**: Integration tests verify Google Sheets connectivity
- [ ] **AC-11**: Profile retrieval completes in <2 seconds
- [ ] **AC-12**: Code review approved

### Non-Functional Requirements

- **Performance**: Profile retrieval <2s (cached), <5s (Google Sheets)
- **Reliability**: 99% successful profile matches
- **Security**: OAuth 2.0 for Google Sheets access
- **Scalability**: Handle 1000+ client profiles
- **Data Accuracy**: 100% preference preservation

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/unit/agents/client-data-manager.test.ts
__tests__/integration/agents/client-profile-retrieval.test.ts
__tests__/unit/agents/client-matching.test.ts
```

**Example Test (Write This First)**:
```typescript
// __tests__/unit/agents/client-data-manager.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ClientDataManagerAgent } from '@/lib/agents/client-data-manager'
import { createClient } from '@supabase/supabase-js'

describe('ClientDataManagerAgent', () => {
  let agent: ClientDataManagerAgent
  let supabase: any

  beforeEach(() => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    agent = new ClientDataManagerAgent({
      openaiApiKey: process.env.OPENAI_API_KEY!,
      supabase,
      mcpServerPath: './mcp-servers/google-sheets'
    })
  })

  afterEach(async () => {
    await agent.shutdown()
  })

  describe('Client Identification', () => {
    it('should identify returning client by email', async () => {
      const result = await agent.identifyClient({
        email: 'john.doe@example.com'
      })

      expect(result.is_returning).toBe(true)
      expect(result.client_id).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0.95)
    })

    it('should identify returning client by name', async () => {
      const result = await agent.identifyClient({
        name: 'John Doe'
      })

      expect(result.is_returning).toBe(true)
      expect(result.client_id).toBeDefined()
    })

    it('should handle fuzzy name matching', async () => {
      const result = await agent.identifyClient({
        name: 'Jon Doe' // Misspelled
      })

      expect(result.is_returning).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.8)
      expect(result.matched_name).toBe('John Doe')
    })

    it('should flag new clients', async () => {
      const result = await agent.identifyClient({
        email: 'new.client@example.com'
      })

      expect(result.is_returning).toBe(false)
      expect(result.is_new).toBe(true)
    })

    it('should return confidence scores', async () => {
      const result = await agent.identifyClient({
        name: 'John Doe',
        email: 'john.doe@example.com'
      })

      expect(result.confidence).toBeDefined()
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })
  })

  describe('Profile Retrieval', () => {
    it('should retrieve complete client profile', async () => {
      const profile = await agent.getClientProfile('john.doe@example.com')

      expect(profile).toHaveProperty('name')
      expect(profile).toHaveProperty('email')
      expect(profile).toHaveProperty('phone')
      expect(profile).toHaveProperty('preferences')
    })

    it('should retrieve catering preferences', async () => {
      const profile = await agent.getClientProfile('john.doe@example.com')

      expect(profile.preferences).toHaveProperty('catering')
      expect(profile.preferences.catering).toEqual(
        expect.objectContaining({
          dietary_restrictions: expect.any(Array),
          favorite_meals: expect.any(Array)
        })
      )
    })

    it('should retrieve ground transport preferences', async () => {
      const profile = await agent.getClientProfile('john.doe@example.com')

      expect(profile.preferences).toHaveProperty('ground_transport')
      expect(profile.preferences.ground_transport).toHaveProperty('car_type')
      expect(profile.preferences.ground_transport).toHaveProperty('service')
    })

    it('should retrieve aircraft preferences', async () => {
      const profile = await agent.getClientProfile('john.doe@example.com')

      expect(profile.preferences).toHaveProperty('aircraft')
      expect(profile.preferences.aircraft).toHaveProperty('category')
      expect(profile.preferences.aircraft).toHaveProperty('amenities')
    })

    it('should retrieve special requirements', async () => {
      const profile = await agent.getClientProfile('pet.owner@example.com')

      expect(profile.preferences).toHaveProperty('special_requirements')
      expect(profile.preferences.special_requirements).toContain('pets')
    })

    it('should handle non-existent clients gracefully', async () => {
      const profile = await agent.getClientProfile('nonexistent@example.com')

      expect(profile).toBeNull()
    })
  })

  describe('Caching', () => {
    it('should cache client profiles in Supabase', async () => {
      await agent.getClientProfile('john.doe@example.com')

      // Second call should use cache
      const start = Date.now()
      await agent.getClientProfile('john.doe@example.com')
      const duration = Date.now() - start

      expect(duration).toBeLessThan(100) // Should be very fast
    })

    it('should use cache before Google Sheets', async () => {
      const sheetsSpy = vi.spyOn(agent, 'fetchFromGoogleSheets')

      // First call - fetches from Google Sheets
      await agent.getClientProfile('john.doe@example.com')
      expect(sheetsSpy).toHaveBeenCalledTimes(1)

      // Second call - uses cache
      await agent.getClientProfile('john.doe@example.com')
      expect(sheetsSpy).toHaveBeenCalledTimes(1) // No additional call
    })

    it('should invalidate cache after TTL', async () => {
      const sheetsSpy = vi.spyOn(agent, 'fetchFromGoogleSheets')

      await agent.getClientProfile('john.doe@example.com')

      // Mock cache expiration
      await agent.invalidateCache('john.doe@example.com')

      await agent.getClientProfile('john.doe@example.com')

      expect(sheetsSpy).toHaveBeenCalledTimes(2)
    })

    it('should reduce API calls by 80%+', async () => {
      const sheetsSpy = vi.spyOn(agent, 'fetchFromGoogleSheets')

      // Simulate 10 requests for same client
      for (let i = 0; i < 10; i++) {
        await agent.getClientProfile('john.doe@example.com')
      }

      // Should only call Google Sheets once
      expect(sheetsSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('Profile Updates', () => {
    it('should update client preferences in Google Sheets', async () => {
      await agent.updateClientPreferences('john.doe@example.com', {
        catering: {
          dietary_restrictions: ['gluten-free', 'vegetarian']
        }
      })

      const profile = await agent.getClientProfile('john.doe@example.com')
      expect(profile.preferences.catering.dietary_restrictions).toContain('gluten-free')
    })

    it('should sync updates to Supabase cache', async () => {
      await agent.updateClientPreferences('john.doe@example.com', {
        aircraft: { category: 'heavy' }
      })

      const { data } = await supabase
        .from('clients')
        .select('preferences')
        .eq('email', 'john.doe@example.com')
        .single()

      expect(data.preferences.aircraft.category).toBe('heavy')
    })

    it('should track last booking date', async () => {
      await agent.recordBooking('john.doe@example.com')

      const profile = await agent.getClientProfile('john.doe@example.com')
      expect(profile.last_booking_date).toBeDefined()
    })

    it('should maintain audit trail', async () => {
      await agent.updateClientPreferences('john.doe@example.com', {
        catering: { favorite_meals: ['sushi'] }
      })

      const history = await agent.getPreferenceHistory('john.doe@example.com')
      expect(history.length).toBeGreaterThan(0)
      expect(history[0]).toHaveProperty('changed_at')
      expect(history[0]).toHaveProperty('changed_by')
    })
  })

  describe('Google Sheets Integration', () => {
    it('should fetch data via MCP server', async () => {
      const result = await agent.executeMCPTool('get_client', {
        identifier: 'john.doe@example.com',
        search_field: 'email'
      })

      expect(result).toHaveProperty('email')
      expect(result).toHaveProperty('preferences')
    })

    it('should handle Google Sheets API errors', async () => {
      vi.spyOn(agent, 'executeMCPTool').mockRejectedValue(
        new Error('Sheets API error')
      )

      await expect(
        agent.getClientProfile('john.doe@example.com')
      ).rejects.toThrow('Sheets API error')
    })

    it('should sync new clients to Google Sheets', async () => {
      await agent.createClientProfile({
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        phone: '+1-555-0123',
        preferences: {}
      })

      // Verify in Google Sheets
      const result = await agent.getClientProfile('jane.smith@example.com')
      expect(result).toBeTruthy()
      expect(result.name).toBe('Jane Smith')
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      vi.spyOn(agent, 'executeMCPTool').mockRejectedValue(
        new Error('Network error')
      )

      await expect(
        agent.getClientProfile('john.doe@example.com')
      ).rejects.toThrow()
    })

    it('should retry on transient failures', async () => {
      let attempts = 0
      vi.spyOn(agent, 'executeMCPTool').mockImplementation(async () => {
        attempts++
        if (attempts < 3) {
          throw new Error('Transient error')
        }
        return { email: 'john.doe@example.com' }
      })

      await agent.getClientProfile('john.doe@example.com')
      expect(attempts).toBe(3)
    })

    it('should log errors to Sentry', async () => {
      const sentrySpy = vi.spyOn(console, 'error')

      vi.spyOn(agent, 'executeMCPTool').mockRejectedValue(
        new Error('Critical error')
      )

      await expect(
        agent.getClientProfile('john.doe@example.com')
      ).rejects.toThrow()

      expect(sentrySpy).toHaveBeenCalled()
    })
  })

  describe('Performance', () => {
    it('should retrieve profile in under 2 seconds (cached)', async () => {
      // Prime cache
      await agent.getClientProfile('john.doe@example.com')

      const start = Date.now()
      await agent.getClientProfile('john.doe@example.com')
      const duration = Date.now() - start

      expect(duration).toBeLessThan(2000)
    })

    it('should retrieve profile in under 5 seconds (Google Sheets)', async () => {
      await agent.invalidateCache('john.doe@example.com')

      const start = Date.now()
      await agent.getClientProfile('john.doe@example.com')
      const duration = Date.now() - start

      expect(duration).toBeLessThan(5000)
    })
  })
})
```

**Run Tests** (should FAIL initially):
```bash
npm test -- client-data-manager
# Expected: Tests fail because implementation doesn't exist
```

### Step 2: Implement Minimal Code (Green Phase)

```typescript
// lib/agents/client-data-manager.ts
import OpenAI from 'openai'
import { SupabaseClient } from '@supabase/supabase-js'
import { MCPClient } from '@/lib/mcp/client'

interface ClientDataManagerConfig {
  openaiApiKey: string
  supabase: SupabaseClient
  mcpServerPath: string
}

interface ClientProfile {
  id?: string
  name: string
  email: string
  phone?: string
  preferences: {
    catering?: {
      dietary_restrictions: string[]
      favorite_meals: string[]
    }
    ground_transport?: {
      car_type: string
      service: string
    }
    aircraft?: {
      category: string
      amenities: string[]
    }
    special_requirements?: string[]
  }
  is_returning?: boolean
  last_booking_date?: string
}

export class ClientDataManagerAgent {
  private openai: OpenAI
  private supabase: SupabaseClient
  private mcpClient: MCPClient
  private cacheTTL: number = 86400000 // 24 hours

  constructor(config: ClientDataManagerConfig) {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey })
    this.supabase = config.supabase
    this.mcpClient = new MCPClient({
      serverPath: config.mcpServerPath,
      serverName: 'google-sheets'
    })
  }

  /**
   * Identify client and determine if returning customer
   */
  async identifyClient(params: { email?: string; name?: string }): Promise<{
    is_returning: boolean
    is_new: boolean
    client_id?: string
    confidence: number
    matched_name?: string
  }> {
    // Try email match first (most accurate)
    if (params.email) {
      const profile = await this.getClientProfile(params.email)
      if (profile) {
        return {
          is_returning: true,
          is_new: false,
          client_id: profile.id,
          confidence: 1.0
        }
      }
    }

    // Fall back to name matching
    if (params.name) {
      const match = await this.fuzzyNameMatch(params.name)
      if (match) {
        return {
          is_returning: true,
          is_new: false,
          client_id: match.id,
          confidence: match.confidence,
          matched_name: match.name
        }
      }
    }

    // New client
    return {
      is_returning: false,
      is_new: true,
      confidence: 1.0
    }
  }

  /**
   * Get client profile (cache-first strategy)
   */
  async getClientProfile(email: string): Promise<ClientProfile | null> {
    // Try cache first
    const cached = await this.getFromCache(email)
    if (cached && !this.isCacheExpired(cached)) {
      return cached
    }

    // Fetch from Google Sheets
    const profile = await this.fetchFromGoogleSheets(email)
    if (profile) {
      await this.cacheProfile(profile)
      return profile
    }

    return null
  }

  /**
   * Fetch client from Google Sheets via MCP
   */
  async fetchFromGoogleSheets(email: string): Promise<ClientProfile | null> {
    try {
      const result = await this.executeMCPTool('get_client', {
        identifier: email,
        search_field: 'email'
      })

      return result as ClientProfile
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return null
      }
      throw error
    }
  }

  /**
   * Fuzzy name matching using OpenAI
   */
  async fuzzyNameMatch(name: string): Promise<{
    id: string
    name: string
    confidence: number
  } | null> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a name matching expert. Compare names and return confidence score (0-1).'
        },
        {
          role: 'user',
          content: `Match this name: "${name}" against client database.`
        }
      ],
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(completion.choices[0].message.content!)
    return result.match || null
  }

  /**
   * Update client preferences
   */
  async updateClientPreferences(
    email: string,
    preferences: Partial<ClientProfile['preferences']>
  ): Promise<void> {
    // Update in Google Sheets
    await this.executeMCPTool('update_client', {
      identifier: email,
      preferences
    })

    // Update cache
    await this.supabase
      .from('clients')
      .update({ preferences, updated_at: new Date().toISOString() })
      .eq('email', email)
  }

  /**
   * Create new client profile
   */
  async createClientProfile(profile: ClientProfile): Promise<void> {
    // Add to Google Sheets
    await this.executeMCPTool('add_client', profile)

    // Add to cache
    await this.cacheProfile(profile)
  }

  /**
   * Record booking activity
   */
  async recordBooking(email: string): Promise<void> {
    const now = new Date().toISOString()

    await this.supabase
      .from('clients')
      .update({ last_booking_date: now })
      .eq('email', email)
  }

  /**
   * Get preference change history
   */
  async getPreferenceHistory(email: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('client_preference_history')
      .select('*')
      .eq('client_email', email)
      .order('changed_at', { ascending: false })

    return data || []
  }

  /**
   * Cache profile in Supabase
   */
  private async cacheProfile(profile: ClientProfile): Promise<void> {
    await this.supabase
      .from('clients')
      .upsert({
        email: profile.email,
        name: profile.name,
        phone: profile.phone,
        preferences: profile.preferences,
        cached_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
  }

  /**
   * Get from cache
   */
  private async getFromCache(email: string): Promise<ClientProfile | null> {
    const { data } = await this.supabase
      .from('clients')
      .select('*')
      .eq('email', email)
      .single()

    return data || null
  }

  /**
   * Check if cache is expired
   */
  private isCacheExpired(profile: any): boolean {
    if (!profile.cached_at) return true

    const cachedAt = new Date(profile.cached_at).getTime()
    const now = Date.now()

    return (now - cachedAt) > this.cacheTTL
  }

  /**
   * Invalidate cache
   */
  async invalidateCache(email: string): Promise<void> {
    await this.supabase
      .from('clients')
      .update({ cached_at: null })
      .eq('email', email)
  }

  /**
   * Execute MCP tool
   */
  async executeMCPTool(toolName: string, params: any): Promise<any> {
    return await this.mcpClient.executeTool(toolName, params)
  }

  /**
   * Shutdown agent
   */
  async shutdown(): Promise<void> {
    await this.mcpClient.close()
  }
}
```

**Run Tests Again**:
```bash
npm test -- client-data-manager
# Expected: Tests now pass ✓
```

### Step 3: Refactor (Blue Phase)

**Refactoring Checklist**:
- [ ] Extract cache logic to separate CacheManager class
- [ ] Improve type definitions for preferences
- [ ] Add JSDoc comments for public methods
- [ ] Optimize database queries with indexes
- [ ] Add comprehensive error messages

**Run Tests After Refactoring**:
```bash
npm test -- client-data-manager
# Expected: All tests still pass ✓
```

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

- [ ] Review PRD.md section on Client Profile Management (FR-4)
- [ ] Review IMPLEMENTATION_PLAN.md for client data specifications
- [ ] TASK-010 (Google Sheets MCP) completed
- [ ] TASK-012 (Agent Tools) completed
- [ ] TASK-002 (Database) has `clients` table
- [ ] OpenAI API key configured

### Step-by-Step Implementation

**Step 1**: Install Dependencies
```bash
npm install openai @supabase/supabase-js
```

**Step 2**: Create Agent Structure
File: `lib/agents/client-data-manager.ts`
- Implement ClientDataManagerAgent class
- Add client identification logic
- Implement profile retrieval methods

**Step 3**: Integrate Google Sheets MCP
- Initialize MCP client connection
- Implement tool execution wrapper
- Add error handling for API failures

**Step 4**: Implement Caching Strategy
- Create cache read/write methods
- Add TTL-based cache invalidation
- Optimize for cache-first retrieval

**Step 5**: Add Profile Management
- Implement preference updates
- Add booking activity tracking
- Create audit trail logging

**Step 6**: Write Comprehensive Tests
File: `__tests__/unit/agents/client-data-manager.test.ts`
- Test all identification scenarios
- Test caching behavior
- Test Google Sheets integration
- Test error handling

**Step 7**: Create API Endpoint
File: `app/api/agents/client-data/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { ClientDataManagerAgent } from '@/lib/agents/client-data-manager'

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email, name } = await request.json()

  const supabase = createClient()
  const agent = new ClientDataManagerAgent({
    openaiApiKey: process.env.OPENAI_API_KEY!,
    supabase,
    mcpServerPath: './mcp-servers/google-sheets'
  })

  try {
    const identification = await agent.identifyClient({ email, name })

    if (identification.is_returning) {
      const profile = await agent.getClientProfile(email || identification.client_id!)
      return NextResponse.json({ identification, profile })
    }

    return NextResponse.json({ identification })
  } catch (error: any) {
    console.error('Client data manager error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  } finally {
    await agent.shutdown()
  }
}
```

### Implementation Validation

After each step, validate:
- [ ] Code compiles without errors
- [ ] Tests pass
- [ ] Linting passes
- [ ] TypeScript has no errors

---

## 5. GIT WORKFLOW

### Branch Creation

```bash
git checkout main
git pull origin main
git checkout -b feature/client-data-manager-agent
```

### Commit Guidelines

```bash
# Implement agent core
git add lib/agents/client-data-manager.ts
git commit -m "feat(agents): implement Client Data Manager agent core"

# Add tests
git add __tests__/unit/agents/client-data-manager.test.ts
git commit -m "test(agents): add comprehensive tests for Client Data Manager"

# Add API endpoint
git add app/api/agents/client-data/route.ts
git commit -m "feat(api): add Client Data Manager API endpoint"

# Push to remote
git push origin feature/client-data-manager-agent
```

### Pull Request Process

```bash
gh pr create --title "Feature: Client Data Manager Agent Implementation" \
  --body "Implements Client Data Manager agent with Google Sheets integration and caching. Closes #TASK-013"
```

---

## 6. CODE REVIEW CHECKLIST

### Reviewer Checklist

**Functionality**:
- [ ] Correctly identifies returning vs new clients
- [ ] Retrieves all preference categories
- [ ] Caching reduces API calls by 80%+
- [ ] Profile updates sync bidirectionally

**Code Quality**:
- [ ] Follows project coding standards
- [ ] No code duplication
- [ ] Clear function and variable names
- [ ] Comprehensive error handling

**Testing**:
- [ ] >75% test coverage
- [ ] Tests cover edge cases
- [ ] Integration tests verify MCP connectivity
- [ ] Performance tests validate speed requirements

**Security**:
- [ ] OAuth properly configured
- [ ] No credentials in code
- [ ] Input validation present
- [ ] PII handled securely

---

## 7. TESTING REQUIREMENTS

### Unit Tests

**Coverage Target**: 75%+

**Test Scenarios**:
- Client identification (email, name, fuzzy match)
- Profile retrieval (cache hit, cache miss)
- Preference management (read, update, audit)
- Cache behavior (TTL, invalidation)
- Error handling (network, API errors)

### Integration Tests

```typescript
// __tests__/integration/agents/client-profile-retrieval.test.ts
describe('Client Profile Retrieval Integration', () => {
  it('should retrieve profile from Google Sheets end-to-end', async () => {
    const agent = new ClientDataManagerAgent(config)
    const profile = await agent.getClientProfile('real.client@example.com')

    expect(profile).toBeTruthy()
    expect(profile.preferences).toBeDefined()
  })
})
```

### Running Tests

```bash
npm test -- client-data-manager
npm run test:coverage -- client-data-manager
```

---

## 8. DEFINITION OF DONE

- [ ] All acceptance criteria met
- [ ] Code compiles without errors
- [ ] No TypeScript errors
- [ ] Linting passes
- [ ] Unit tests >75% coverage
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Code review approved
- [ ] PR merged to main
- [ ] Documentation updated

---

## 9. RESOURCES & REFERENCES

### Documentation
- [PRD - Client Profile Management](../docs/PRD.md#fr-4-client-profile-management)
- [System Architecture](../docs/SYSTEM_ARCHITECTURE.md)
- [Google Sheets MCP Server](../mcp-servers/google-sheets/README.md)

### External Documentation
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Google Sheets API](https://developers.google.com/sheets/api)

### Related Tasks
- TASK-010: Google Sheets MCP Server Implementation
- TASK-012: Agent Tools & Helper Functions
- TASK-011: RFP Orchestrator Agent (consumer)

---

## 10. NOTES & QUESTIONS

### Implementation Notes
- Use cache-first strategy to minimize Google Sheets API calls
- Implement exponential backoff for retries
- Consider adding Redis caching layer for ultra-fast lookups

### Open Questions
- [ ] Should we support multiple emails per client?
- [ ] How to handle conflicting preference updates?
- [ ] What's the acceptable cache staleness threshold?

### Assumptions
- Google Sheets is source of truth for client data
- Email is unique identifier
- Preferences schema is stable

### Risks/Blockers
- **Risk**: Google Sheets API rate limits (100 requests/100 seconds)
  - **Mitigation**: Aggressive caching, batch operations
- **Blocker**: Waiting for Google Sheets MCP (TASK-010)

---

## 11. COMPLETION SUMMARY

### What Was Accomplished
[Fill out after task completion]

### Changes Made
[List all files created/modified]

### Test Results
```
[Test output after completion]
```

### Known Issues/Future Work
[Document any issues or enhancements]

### Time Tracking
- **Estimated**: 6 hours
- **Actual**: [Fill in]
- **Variance**: [Calculate]

### Lessons Learned
[Document insights gained]

---

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
**Reviewed By**: -
**Review Date**: -
