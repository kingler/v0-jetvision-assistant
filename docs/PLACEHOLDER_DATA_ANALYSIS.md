# Placeholder Data Analysis - Frontend to Real Data Mapping

**Generated**: October 21, 2025
**Purpose**: Identify all dummy/mock data in the frontend that needs to be replaced with real data from Supabase, OpenAI Agents, and MCP servers.

---

## 📋 Executive Summary

The current frontend uses **3 main sources of mock data**:
1. **Mock Chat Sessions** (`useCaseChats`) - 4 hardcoded chat conversations
2. **Mock Operators** (`mockOperators`) - 7 hardcoded aircraft operators
3. **Mock Routes** (`mockRoutes`) - 4 hardcoded flight routes

All of these need to be replaced with **real-time data** from:
- **Supabase Database** (requests, quotes, client profiles)
- **OpenAI AI Agents** (orchestrator, flight search, proposal analysis, etc.)
- **MCP Servers** (Avinode API, Gmail API, Google Sheets API)

---

## 🔴 Critical Placeholder Data to Replace

### 1. **Chat Sessions** (`app/page.tsx` line 20)

**Current Implementation:**
```typescript
const [chatSessions, setChatSessions] = useState<ChatSession[]>(useCaseChats)
```

**Placeholder Data Source:** `lib/mock-data.ts` lines 215-383
- 4 hardcoded chat sessions with:
  - Static messages
  - Fake timestamps
  - Hardcoded routes (TEB → VNY, MIA → ASE, etc.)
  - Mock statuses (proposal_ready, requesting_quotes, understanding_request)
  - Static pricing data

**❌ Problems:**
- No real user data
- No persistence across sessions
- Can't handle multiple users
- No real-time updates

**✅ Replace With:**
```typescript
// Fetch from Supabase
const { data: requests } = await supabase
  .from('requests')
  .select(`
    *,
    quotes (*),
    client_profiles (*)
  `)
  .eq('iso_agent_id', userId)
  .order('created_at', { ascending: false })
```

**Required Database Tables:** (from IMPLEMENTATION_PLAN.md)
- `requests` - All flight requests with status tracking
- `quotes` - Individual operator quotes
- `client_profiles` - Client information and preferences

---

### 2. **Hardcoded User Name** (`components/landing-page.tsx` line 17-22)

**Current Implementation:**
```typescript
const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

// In app/page.tsx - Hardcoded "Adrian"
<h1>Good afternoon, Adrian</h1>
```

**❌ Problems:**
- Name is hardcoded as "Adrian"
- Not personalized for actual logged-in user

**✅ Replace With:**
```typescript
// Get from Clerk authentication
import { useUser } from '@clerk/nextjs'

const { user } = useUser()
const userName = user?.firstName || 'there'

<h1>{getGreeting()}, {userName}</h1>
```

**Required Integration:**
- Clerk authentication context
- User profile data

---

### 3. **Mock Operators** (`lib/mock-data.ts` lines 26-139)

**Current Implementation:**
```typescript
export const mockOperators: Operator[] = [
  {
    id: "1",
    name: "Executive Jets LLC",
    aircraft: "Gulfstream G200",
    basePrice: 25000,
    availability: "confirmed",
    // ... 6 more hardcoded operators
  }
]
```

**❌ Problems:**
- Only 7 operators (real system needs hundreds)
- Static pricing
- No real availability data
- Missing real operator contacts

**✅ Replace With:**
- **Avinode MCP Server** - Real-time operator data
- **Flight Search Agent** - Queries Avinode API for available aircraft
- **Supabase `quotes` table** - Stores actual quotes received

**Required Components:**
- `mcp-servers/avinode-server/` (needs to be built)
- Flight Search Agent implementation
- Real-time quote tracking in Supabase

---

### 4. **Mock Routes** (`lib/mock-data.ts` lines 141-170)

**Current Implementation:**
```typescript
export const mockRoutes: FlightRoute[] = [
  {
    departure: "Teterboro",
    arrival: "Van Nuys",
    departureCode: "TEB",
    arrivalCode: "VNY",
    distance: 2445,
  },
  // ... 3 more hardcoded routes
]
```

**❌ Problems:**
- Only 4 routes
- No dynamic route calculation
- Missing real airport data

**✅ Replace With:**
```typescript
// Extract from request data
const route = {
  departure: request.departure_airport,
  arrival: request.arrival_airport,
  departureCode: request.departure_code,
  arrivalCode: request.arrival_code,
  distance: calculateDistance(departure, arrival) // Use aviation API
}
```

**Required:**
- Airport database or API integration
- Distance calculation service
- Store in `requests` table

---

### 5. **Static Workflow Steps** (`components/workflow-visualization.tsx`)

**Current Implementation:**
```typescript
const route = mockRoutes[0] // Hardcoded NYC to LA route (line 135)
const proposal = generateProposal(selectedOperator, mockRoutes[0], 4, "Tuesday, Sept 24, 2025")
```

**❌ Problems:**
- Uses first mock route always
- Hardcoded passenger count
- Static date
- No connection to real request

**✅ Replace With:**
```typescript
// Use actual request data
const { data: request } = await supabase
  .from('requests')
  .select('*')
  .eq('id', requestId)
  .single()

const route = {
  departure: request.departure_airport,
  arrival: request.arrival_airport,
  // ... from request data
}
```

---

### 6. **Hardcoded Customer Preferences** (`lib/mock-data.ts` lines 339-346)

**Current Implementation:**
```typescript
customer: {
  name: "Kham L.",
  isReturning: true,
  preferences: {
    catering: "Taco Bell",
    groundTransport: "Stretch Limo pickup",
  },
}
```

**❌ Problems:**
- Only 1 mock customer
- Hardcoded preferences
- No real client database

**✅ Replace With:**
- **Google Sheets MCP Server** - Sync client database
- **Client Data Manager Agent** - Fetch and manage client profiles
- **Supabase `client_profiles` table** - Store preferences

```typescript
// Fetch from Supabase
const { data: client } = await supabase
  .from('client_profiles')
  .select('*')
  .eq('email', clientEmail)
  .single()

// Or fetch from Google Sheets via MCP
const clientData = await mcpClient.tools.fetch_client_data({
  email: clientEmail
})
```

---

### 7. **Static Quote Pricing** (Throughout mock-data.ts)

**Current Implementation:**
```typescript
basePrice: 25000,
totalPrice: 32500,
margin: 7500,
```

**❌ Problems:**
- Hardcoded prices
- No dynamic margin calculation
- Missing real quote data

**✅ Replace With:**
```typescript
// From Supabase quotes table
const { data: quotes } = await supabase
  .from('quotes')
  .select('*')
  .eq('request_id', requestId)

// Calculate margins with Proposal Analysis Agent
const rankedQuotes = await proposalAnalysisAgent.analyze({
  quotes,
  marginType: isoAgent.margin_type,
  marginValue: isoAgent.margin_value
})
```

**Required:**
- Real-time quote tracking in Supabase
- Proposal Analysis Agent implementation
- Margin configuration per ISO agent

---

### 8. **Hardcoded Messages** (`lib/mock-data.ts` lines 229-381)

**Current Implementation:**
```typescript
messages: [
  {
    id: "1",
    type: "user",
    content: "I need a flight from Teterboro to Van Nuys...",
    timestamp: new Date("2025-10-10T10:00:00"),
  },
  {
    id: "2",
    type: "agent",
    content: "Great news! I've completed your flight search...",
    timestamp: new Date("2025-10-10T10:30:00"),
  }
]
```

**❌ Problems:**
- Static messages
- Fake timestamps
- No real conversation flow
- No AI-generated responses

**✅ Replace With:**
- **RFP Orchestrator Agent** - AI-powered conversation
- **Communication Manager Agent** - Generate responses
- **Supabase messages tracking** (consider adding messages table)

```typescript
// Generate responses with OpenAI
const response = await orchestratorAgent.processUserMessage({
  message: userInput,
  context: requestContext
})

// Store in database
await supabase.from('messages').insert({
  request_id: requestId,
  type: 'agent',
  content: response.content,
  timestamp: new Date()
})
```

---

## 📊 Data Flow Mapping

### Current (Mock) Flow:
```
User Input → useState(useCaseChats) → Display Mock Data
```

### Target (Real) Flow:
```
User Input
  → RFP Orchestrator Agent (OpenAI)
  → Multi-Agent System:
      - Client Data Manager Agent → Google Sheets MCP
      - Flight Search Agent → Avinode MCP
      - Proposal Analysis Agent → Analyze & Rank
      - Communication Manager Agent → Gmail MCP
  → Store in Supabase (requests, quotes, client_profiles)
  → Real-time updates via Supabase Realtime
  → Display to user
```

---

## 🗂️ Files Requiring Changes

### 1. **app/page.tsx**
**Line 20:** Replace `useCaseChats` with Supabase query
```typescript
// BEFORE
const [chatSessions, setChatSessions] = useState<ChatSession[]>(useCaseChats)

// AFTER
const [chatSessions, setChatSessions] = useState<ChatSession[]>([])

useEffect(() => {
  async function loadRequests() {
    const { data } = await supabase
      .from('requests')
      .select('*, quotes(*), client_profiles(*)')
      .eq('iso_agent_id', user.id)

    setChatSessions(transformToSessions(data))
  }
  loadRequests()
}, [user.id])
```

### 2. **components/workflow-visualization.tsx**
**Line 135:** Replace `mockRoutes[0]` with actual request data
**Line 194:** Use real proposal generation with actual operator data

### 3. **components/landing-page.tsx**
**Add:** User name from Clerk authentication

### 4. **lib/mock-data.ts**
**Action:** Delete this entire file once all integrations are complete
**Timeline:** Week 4-5 of implementation plan

---

## 🔄 Migration Strategy

### Phase 1: Database Setup (Week 1)
- ✅ Create Supabase tables (requests, quotes, client_profiles, iso_agents)
- ✅ Set up Row Level Security policies
- ✅ Deploy schema from IMPLEMENTATION_PLAN.md

### Phase 2: Authentication Integration (Week 1)
- ✅ Replace hardcoded "Adrian" with Clerk user data
- ✅ Sync Clerk users with Supabase iso_agents table

### Phase 3: MCP Server Implementation (Week 2)
- 🔨 Build Avinode MCP Server
- 🔨 Build Google Sheets MCP Server
- 🔨 Build Gmail MCP Server

### Phase 4: AI Agent Implementation (Week 3)
- 🔨 Implement RFP Orchestrator Agent
- 🔨 Implement Client Data Manager Agent
- 🔨 Implement Flight Search Agent
- 🔨 Implement Proposal Analysis Agent
- 🔨 Implement Communication Manager Agent

### Phase 5: Frontend Integration (Week 4)
- 🔨 Replace `useCaseChats` with Supabase queries
- 🔨 Add real-time subscriptions for quote updates
- 🔨 Integrate AI agent responses into chat interface
- 🔨 Remove all references to mock-data.ts

### Phase 6: Testing & Cleanup (Week 5-6)
- 🔨 End-to-end testing with real data
- 🔨 Delete lib/mock-data.ts
- 🔨 Remove all mock data imports
- 🔨 Verify all workflows use real data

---

## ⚠️ Critical Dependencies

Before removing mock data, ensure these are implemented:

### Database (Supabase)
- [ ] `requests` table with RLS policies
- [ ] `quotes` table with RLS policies
- [ ] `client_profiles` table with RLS policies
- [ ] `iso_agents` table with RLS policies
- [ ] Real-time subscriptions configured

### Authentication (Clerk)
- [ ] Clerk integrated and working
- [ ] User sync to Supabase
- [ ] JWT validation in API routes

### MCP Servers
- [ ] Avinode MCP Server operational
- [ ] Google Sheets MCP Server operational
- [ ] Gmail MCP Server operational

### AI Agents (OpenAI)
- [ ] RFP Orchestrator Agent created
- [ ] Client Data Manager Agent created
- [ ] Flight Search Agent created
- [ ] Proposal Analysis Agent created
- [ ] Communication Manager Agent created
- [ ] Error Monitor Agent created

### API Routes
- [ ] `/api/requests` - CRUD operations
- [ ] `/api/quotes` - Quote management
- [ ] `/api/webhooks/avinode` - Quote reception
- [ ] `/api/agents/orchestrate` - Agent trigger

---

## 📝 Summary of Changes Needed

| Component | Current (Mock) | Replace With | Priority |
|-----------|---------------|--------------|----------|
| Chat Sessions | `useCaseChats` array | Supabase `requests` query | 🔴 Critical |
| User Name | "Adrian" hardcoded | Clerk `user.firstName` | 🟡 High |
| Operators | `mockOperators` array | Avinode MCP + Supabase | 🔴 Critical |
| Routes | `mockRoutes` array | Request data + distance calc | 🟡 High |
| Customer Data | Hardcoded "Kham L." | Google Sheets MCP + Supabase | 🔴 Critical |
| Pricing | Static numbers | Real quotes + margin calc | 🔴 Critical |
| Messages | Hardcoded conversation | AI-generated + Supabase | 🔴 Critical |
| Workflow Steps | Static mockRoutes[0] | Actual request context | 🟡 High |

---

## 🎯 Next Steps

1. **Week 1-2**: Follow IMPLEMENTATION_PLAN.md to set up database and MCP servers
2. **Week 3**: Implement AI agents with OpenAI Assistants API
3. **Week 4**: Integrate real data into frontend components
4. **Week 5**: End-to-end testing
5. **Week 6**: Delete `lib/mock-data.ts` and celebrate! 🎉

---

**Related Documentation:**
- `docs/IMPLEMENTATION_PLAN.md` - Full 6-week implementation guide
- `docs/SYSTEM_ARCHITECTURE.md` - System architecture diagrams
- `docs/PREREQUISITES_CHECKLIST.md` - Required setup before development

**Last Updated**: October 21, 2025
