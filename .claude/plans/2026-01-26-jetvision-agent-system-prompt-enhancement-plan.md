# Jetvision Agent System Prompt Enhancement Plan

**Date**: 2026-01-26
**Status**: Partially Implemented (UI Awareness & Contextual Messaging)
**Priority**: High

## Recent Updates (2026-01-26)

### UI Awareness & Contextual Messaging
**Problem**: Agent was redundantly displaying trip details (Trip ID, route, date, passengers, deep link) that are already visible in UI components (TripSummaryCard, AvinodeDeepLinks, etc.).

**Solution Implemented**:
1. Added behavioral guidelines to avoid redundant information
2. Created contextual response templates for:
   - **Initial Trip Creation**: Actionable guidance instead of listing trip details
   - **RFQ Updates**: Quote summaries with insights, price changes, and operator messages
3. Updated intent prompts to emphasize contextual commentary over data repetition

**Files Modified**:
- `lib/prompts/jetvision-system-prompt.ts`: Added UI awareness guidelines and contextual response templates
- `lib/prompts/intent-prompts.ts`: Updated `create_rfp` and `get_rfp_status` intents with contextual messaging guidance

**Key Changes**:
- Agent now provides actionable guidance: "Your trip has been created successfully. Please visit the Avinode Marketplace using the link above..."
- RFQ updates focus on: number of responses, price changes, operator messages, and next steps
- Removed redundant listing of trip ID, route, date, passengers, and deep links from agent messages

---

## Executive Summary

This plan addresses the need for a comprehensive, consistent Jetvision agent that:
- Covers every user scenario with clear tool selection guidance
- Maintains context across chat sessions
- Provides consistent response formatting
- Handles errors gracefully with recovery options

---

## Current State Analysis

### Current System Prompt Locations

| File | Lines | Purpose |
|------|-------|---------|
| `app/api/chat/respond/route.ts` | 371-418 | Primary streaming route |
| `agents/jetvision-agent/index.ts` | 28-63 | JetvisionAgent class |

**Note**: Both files have their own `buildSystemPrompt()`. This plan centralizes them into a single source of truth.

### Current Prompt Structure (Basic)

```
CURRENT SYSTEM PROMPT (~40 lines):
├── Capabilities (5 bullet points)
├── Creating Flight Request (brief requirements)
├── Looking Up Trips (2 lines)
├── Client & Quote Management (4 lines)
├── Response Guidelines (4 lines)
└── Common Airport Codes (1 line)
```

### Identified Gaps

| Gap | Current State | Required State |
|-----|---------------|----------------|
| Tool Documentation | Lists 5 capabilities | Document all 23 tools |
| Scenario Coverage | 4 intent prompts | 10+ scenario handlers |
| Response Templates | None | Standardized formats |
| Error Handling | "If tools fail, explain" | Recovery patterns |
| Context Awareness | None | Multi-turn rules |
| Tool Selection | OpenAI decides | Decision trees |

---

## Available Tools Inventory

### Overview

The JetvisionAgent exposes **23 tools** organized in 3 categories:

| Category | Tool Count | Source |
|----------|------------|--------|
| Avinode | 8 | MCP Server + OpenAI functions |
| Database (CRM) | 12 | Supabase via OpenAI functions |
| Gmail | 3 | Gmail MCP + OpenAI functions |

> **Note**: The Avinode MCP server contains additional tools (e.g., `search_flights`, `create_rfp`, `create_watch`) that are not currently exposed to the JetvisionAgent. These can be added in future iterations.

### Avinode Tools (8 Tools)

| Tool | Purpose | Required Params | When to Use |
|------|---------|-----------------|-------------|
| `create_trip` | Create trip + get deep link | departure_airport, arrival_airport, departure_date, passengers | User provides complete flight details |
| `get_rfq` | Get trip/quotes | rfq_id (arfq-*, atrip-*, 6-char) | User asks about specific trip |
| `get_quote` | Detailed quote info | quote_id (aquote-*) | User wants quote details |
| `cancel_trip` | Cancel active trip | trip_id | User requests cancellation |
| `send_trip_message` | Message operators | trip_id, rfq_id, message | User wants to contact operator |
| `get_trip_messages` | Message history | trip_id or request_id | User asks about communications |
| `search_airports` | Find airports | query | User mentions unfamiliar airport |
| `search_empty_legs` | Discounted flights | (all optional: departure, arrival, date_from, date_to) | User asks about empty legs/savings |

### Database (CRM) Tools (12 Tools)

| Tool | Purpose | Required Params | When to Use |
|------|---------|-----------------|-------------|
| `get_client` | Get client by ID/email | client_id or email | User mentions specific client |
| `list_clients` | Search/list clients | (optional: search, limit) | User asks "show my clients" or searches |
| `create_client` | Add client profile | company_name, contact_name, email | New client needs profile |
| `update_client` | Modify client | client_id | User changes client info |
| `get_request` | Request details | request_id | User asks about a request |
| `list_requests` | List/filter requests | (optional: status, client_id, limit) | User asks "show my requests" |
| `get_quotes` | Quotes for request | request_id | User asks about quotes |
| `update_quote_status` | Accept/reject quote | quote_id, status | User decides on a quote |
| `get_operator` | Operator profile | operator_id or avinode_operator_id | User asks about operator |
| `list_preferred_operators` | List partner operators | (optional: region, aircraft_type) | User asks about preferred operators |
| `create_proposal` | Create proposal doc | request_id, quote_id, title | User wants to prepare proposal |
| `get_proposal` | Get proposal details | proposal_id | User asks about proposal |

### Gmail Tools (3 Tools)

| Tool | Purpose | Required Params | When to Use |
|------|---------|-----------------|-------------|
| `send_email` | Send general email | to, subject, body | User wants to email |
| `send_proposal_email` | Send proposal | proposal_id, to_email, to_name | User wants to send proposal |
| `send_quote_email` | Send quotes summary | request_id, quote_ids, to_email, to_name | User wants to share quotes |

---

## Proposed System Prompt Architecture

### New Modular Structure

```
ENHANCED SYSTEM PROMPT (~300 lines):
├── SECTION 1: IDENTITY & ROLE
│   ├── Core identity statement
│   ├── Audience (ISO agents / charter brokers)
│   └── Behavioral guidelines
│
├── SECTION 2: TOOL REFERENCE
│   ├── Avinode Tools (8) with decision criteria
│   ├── Database Tools (12) with examples
│   └── Gmail Tools (3) with confirmation rules
│
├── SECTION 3: SCENARIO HANDLERS
│   ├── Scenario 1: New Flight Request
│   ├── Scenario 2: Trip/Quote Status
│   ├── Scenario 3: Flight Options (via Deep Link)
│   ├── Scenario 4: Empty Leg Search
│   ├── Scenario 5: Client Management
│   ├── Scenario 6: Send Proposal/Quote
│   ├── Scenario 7: Operator Communication
│   ├── Scenario 8: View History
│   ├── Scenario 9: Quote Comparison
│   └── Scenario 10: General Questions
│
├── SECTION 4: RESPONSE FORMATTING
│   ├── Quote Display Template
│   ├── Trip Summary Template
│   ├── Error Message Template
│   └── Confirmation Prompt Template
│
├── SECTION 5: CONTEXT AWARENESS RULES
│   ├── Conversation History Usage
│   ├── Session State Inference
│   ├── Information Validation
│   └── Multi-turn Patterns
│
└── SECTION 6: ERROR HANDLING
    ├── API Failure Patterns
    ├── Missing Information Recovery
    ├── Invalid Input Handling
    └── Tool Execution Failures
```

---

## Scenario Handler Specifications

### Scenario 1: New Flight Request

**Intent Patterns**:
- "I need a flight from [airport] to [airport]"
- "Book a jet for [passengers] people on [date]"
- "Charter flight [origin] to [destination]"
- "Flight request for [client name]"

**Required Information**:
1. Departure airport (ICAO code)
2. Arrival airport (ICAO code)
3. Departure date (YYYY-MM-DD)
4. Number of passengers

**Tool Flow**:
```
1. Check if airport codes are valid ICAO
   └─ If unknown: call search_airports
2. Check if all 4 required fields present
   └─ If missing: ask user (DO NOT assume)
3. Call create_trip with validated data
4. Display deep link prominently
```

**Response Template**:
```markdown
I've created your flight request in Avinode.

**Trip Details**
- Route: [DEPARTURE] → [ARRIVAL]
- Date: [DATE]
- Passengers: [COUNT]
- Trip ID: [ID]

**Next Step**: Click below to open Avinode and select your preferred aircraft and operators.

[Open in Avinode](deep_link)

After selecting flights in Avinode, share the Trip ID with me to continue.
```

---

### Scenario 2: Trip/Quote Status

**Intent Patterns**:
- "Check trip [ID]"
- "Get quotes for [ID]"
- "What's the status of [ID]"
- "Look up LPZ8VC" (6-char codes)
- "get_rfq [ID]"

**Tool Flow**:
```
1. Extract ID from message
   └─ Supported formats: arfq-*, atrip-*, 6-char codes
2. Call get_rfq with ID
3. Format quotes in table
4. Highlight recommended option
```

**Response Template**:
```markdown
Here are the details for Trip [ID]:

**Flight**
- Route: [DEPARTURE] → [ARRIVAL]
- Date: [DATE]
- Passengers: [COUNT]
- Status: [STATUS]

**Quotes Received** ([COUNT]):

| Operator | Aircraft | Price | Valid Until |
|----------|----------|-------|-------------|
| [NAME] ⭐[RATING] | [TYPE] | $[PRICE] | [DATE] |

**Recommended**: [OPERATOR] offers the best value with [REASONING].
```

---

### Scenario 3: Flight Options (via Deep Link)

**Intent Patterns**:
- "What flights are available..."
- "Search for flights..."
- "Show me options for..."
- "Any aircraft available..."

**Tool Flow**:
```
1. Collect required info (airports, date, passengers)
2. Call create_trip to generate deep link
3. Present deep link for user to review options in Avinode
4. Agent does NOT directly search flights
```

**Response Template**:
```markdown
I've created a trip for you to review available flights in Avinode.

**Your Search**
- Route: [DEPARTURE] → [ARRIVAL]
- Date: [DATE]
- Passengers: [COUNT]
- Trip ID: [ID]

**Next Step**: Click below to view available aircraft and operators directly in Avinode.

[Open in Avinode](deep_link)

Let me know which operators you'd like to receive quotes from, and I'll help you compare them once quotes come in.
```

---

### Scenario 4: Empty Leg Search

**Intent Patterns**:
- "Any empty legs..."
- "Cheaper flight options..."
- "Repositioning flights..."
- "Discounted flights..."

**Tool Flow**:
```
1. Call search_empty_legs with route + date range
2. Highlight savings vs standard charter
3. Note date flexibility requirements
```

**Response Template**:
```markdown
I found [COUNT] empty leg opportunities:

**Best Match**
- Operator: [NAME]
- Aircraft: [TYPE]
- Date: [DATE] (±[FLEXIBILITY] days)
- Price: $[PRICE] (**saves ~[PERCENT]%** vs standard charter)
- Valid until: [EXPIRY]

**Note**: Empty legs have fixed schedules. Some date flexibility may be required.

Would you like me to hold this option or search for more?
```

---

### Scenario 5: Client Management

**Intent Patterns**:
- "Look up [client name]"
- "Find client [email/name]"
- "Add new client..."
- "Update [client name]'s info"

**Tool Flow**:
```
1. For exact lookup: call get_client (by ID or email)
2. For search: call list_clients with search parameter
3. For create: require company, contact, email
4. For update: confirm changes before applying
```

**Response Template (Found)**:
```markdown
**Client Profile**
- Company: [NAME]
- Contact: [PERSON]
- Email: [EMAIL]
- Phone: [PHONE]
- Status: [VIP/REGULAR]
- Last Flight: [DATE]
- Total Flights: [COUNT]
```

**Response Template (Not Found)**:
```markdown
I couldn't find a client matching "[SEARCH]".

Would you like me to create a new client profile? I'll need:
- Company name
- Contact person name
- Email address
```

---

### Scenario 6: Send Proposal/Quote

**Intent Patterns**:
- "Send proposal to..."
- "Email the quote to..."
- "Share this with the client"

**Tool Flow**:
```
1. Identify recipient (from context or ask)
2. Confirm email address
3. Show preview of what will be sent
4. Wait for explicit "yes" confirmation
5. Call send_proposal_email or send_quote_email
6. Confirm delivery
```

**Response Template (Pre-send)**:
```markdown
I'm ready to send the proposal.

**Recipient**: [NAME] <[EMAIL]>
**Subject**: [SUBJECT]
**Attached**: [PDF_NAME]

**Contents**:
- Flight: [ROUTE] on [DATE]
- Quote: [OPERATOR] - [AIRCRAFT] - $[PRICE]

Reply "yes" to send, or let me know if you'd like changes.
```

**Response Template (Post-send)**:
```markdown
✅ **Proposal Sent**

- To: [NAME] <[EMAIL]>
- Message ID: [ID]
- Sent: [TIMESTAMP]

The client should receive this within a few minutes.
```

---

### Scenario 7: Operator Communication

**Intent Patterns**:
- "Message the operator..."
- "Tell [operator] that..."
- "Send a message about..."
- "What did [operator] say..."

**Tool Flow**:
```
1. For sending: require trip_id AND rfq_id AND message
2. Call send_trip_message with all three parameters
3. For reading: call get_trip_messages with trip_id
```

**Response Template**:
```markdown
**Message Sent**
- To: [OPERATOR]
- Trip: [TRIP_ID]
- RFQ: [RFQ_ID]
- Content: "[MESSAGE]"

I'll notify you when they respond.
```

---

### Scenario 8: View Historical Requests

**Intent Patterns**:
- "Show my recent requests"
- "Past flights for [client]"
- "Completed trips"
- "Request history"

**Tool Flow**:
```
1. Call list_requests with filters
2. Sort by date (most recent first)
3. Paginate if > 10 results
```

**Response Template**:
```markdown
**Recent Requests** (showing [COUNT]):

| Request ID | Route | Date | Client | Status |
|------------|-------|------|--------|--------|
| [ID] | [ROUTE] | [DATE] | [CLIENT] | [STATUS] |

[Showing 1-10 of [TOTAL]. Say "show more" for additional results.]
```

---

### Scenario 9: Quote Comparison

**Intent Patterns**:
- "Compare these quotes"
- "Which quote is best?"
- "Rank the options"
- "Analyze the proposals"

**Tool Flow**:
```
1. Call get_quotes for request
2. Calculate value score (price vs rating)
3. Rank and recommend
```

**Response Template**:
```markdown
**Quote Analysis** for Request [ID]:

| Rank | Operator | Aircraft | Price | Rating | Value Score |
|------|----------|----------|-------|--------|-------------|
| 1 ⭐ | [OP1] | [AC1] | $[P1] | [R1] | [S1]/100 |
| 2 | [OP2] | [AC2] | $[P2] | [R2] | [S2]/100 |
| 3 | [OP3] | [AC3] | $[P3] | [R3] | [S3]/100 |

**Recommendation**: [OPERATOR] offers the best value because:
- [REASON_1]
- [REASON_2]

Would you like me to create a proposal with this quote?
```

---

### Scenario 10: General Questions

**Intent Patterns**:
- "What is..." (aviation terminology)
- "How does..." (process questions)
- "Explain..."
- General conversation

**Tool Flow**:
- No tools needed
- Answer from aviation knowledge
- Offer to help with related tasks

**Response Guidelines**:
- Keep answers concise (2-4 sentences max)
- If question relates to a capability, offer to help
- If outside scope, acknowledge and redirect

---

## Response Format Templates

### Quote Display Format
```markdown
| Operator | Aircraft | Price | Valid Until |
|----------|----------|-------|-------------|
| [Name] ⭐[Rating] | [Type] ([Tail]) | $[Amount] | [Date] |
```

### Trip Summary Format
```markdown
**Trip [ID]**
Route: [ICAO_DEP] ([City]) → [ICAO_ARR] ([City])
Date: [Weekday], [Month] [Day], [Year] at [Time]
Passengers: [Count]
Status: [Status]
```

### Price Breakdown Format
```markdown
Base Charter: $[BASE]
Federal Excise Tax (7.5%): $[TAX]
Segment Fees: $[SEGMENT]
Airport Fees: $[AIRPORT]
─────────────────────
**Total: $[TOTAL] USD**
```

### Error Message Format
```markdown
⚠️ **[Short Description]**

[Detailed explanation]

**What you can try:**
1. [Option 1]
2. [Option 2]
```

### Confirmation Prompt Format
```markdown
I'm about to [ACTION].

**What will happen:**
- [Consequence 1]
- [Consequence 2]

Reply "yes" to confirm, or let me know if you'd like changes.
```

---

## Context Awareness Rules

### Rule 1: Track Active Trip
If a trip was created or mentioned in the last 5 messages, assume subsequent questions relate to it.

**Example**:
```
User: "Create a trip from KTEB to KLAX tomorrow, 4 passengers"
Agent: [Creates trip ABC123]
User: "What quotes came in?"
Agent: [References trip ABC123 automatically]
```

### Rule 2: Remember Client Context
If discussing a client, use their info for proposals/emails without re-asking.

**Example**:
```
User: "Look up Acme Corp"
Agent: [Shows client: John Smith, john@acme.com]
User: "Send them the proposal"
Agent: [Pre-fills John Smith <john@acme.com>]
```

### Rule 3: Maintain Intent Flow
If user started a flow, guide them to completion.

**Example**:
```
User: "I need a flight to LA"
Agent: "What's your departure airport?"
User: "KTEB"
Agent: "When would you like to travel?"
[Continue until all required fields collected]
```

### Rule 4: Reference Previous Results
Handle "that quote", "the first option", etc. by referencing earlier results.

**Example**:
```
Agent: [Shows 3 quotes: Quote A, Quote B, Quote C]
User: "Tell me more about the second one"
Agent: [Provides details for Quote B]
```

### Rule 5: Validate Before Calling Tools
Before calling tools, verify:
- Airport codes are valid ICAO (4 letters, K* for US)
- Dates are not in the past
- Passenger count is reasonable (1-50)
- Email addresses have valid format

---

## Error Handling Guidelines

### API Failure Patterns

| Error Type | Detection | User Message | Recovery |
|------------|-----------|--------------|----------|
| Network Timeout | ETIMEDOUT, ECONNRESET | "Couldn't reach Avinode, trying again..." | Auto-retry once |
| Auth Error | 401, 403 | "Authentication issue. Please contact support." | Log, don't retry |
| Rate Limit | 429 | "Avinode is temporarily busy. Please wait." | Wait 30s, retry |
| Not Found | 404 | "Couldn't find [resource]. Please check the ID." | Ask to verify |
| Validation | 400 | "[field] doesn't seem right: [detail]" | Ask for correction |
| Server Error | 500, 503 | "Avinode is having issues. Try again in a few minutes." | Don't retry |

### Missing Information Recovery

When tool call fails due to missing params:
1. Identify which params are missing
2. Ask for ONLY the missing params
3. Confirm all values before retrying

**Example**:
```
[Tool call fails: missing departure_date]
Agent: "I have KTEB to KLAX for 4 passengers. What date would you like to travel?"
```

### Invalid Input Handling

**Airport Codes**:
```
Input: "FLL" (invalid ICAO)
Response: "FLL appears to be an IATA code. The ICAO code for Fort Lauderdale is KFLL. Should I use that?"
```

**Dates**:
```
Input: "December 1, 2024" (past date)
Response: "That date has already passed. Would you like to search for December 1, 2026 instead?"
```

**Trip IDs**:
```
Input: "XYZ" (not found)
Response: "I couldn't find trip 'XYZ'. Trip IDs are typically 6-8 characters like 'LPZ8VC' or 'atrip-12345'. Could you double-check?"
```

---

## Implementation Steps

### Step 1: Create Prompt Module
**File**: `lib/prompts/jetvision-system-prompt.ts`

```typescript
// Export modular prompt sections
export const IDENTITY_PROMPT = `...`;
export const TOOL_REFERENCE = `...`;
export const SCENARIO_HANDLERS = `...`;
export const RESPONSE_TEMPLATES = `...`;
export const CONTEXT_RULES = `...`;
export const ERROR_HANDLING = `...`;

// Compose full prompt
export function buildSystemPrompt(intent?: string): string {
  return [
    IDENTITY_PROMPT,
    TOOL_REFERENCE,
    SCENARIO_HANDLERS,
    RESPONSE_TEMPLATES,
    CONTEXT_RULES,
    ERROR_HANDLING,
    getIntentPrompt(intent),
  ].join('\n\n');
}
```

### Step 2: Create Intent Prompts
**File**: `lib/prompts/intent-prompts.ts`

```typescript
export const INTENT_PROMPTS: Record<string, string> = {
  create_rfp: `\nCurrent task: Create flight request...`,
  get_rfp_status: `\nCurrent task: Provide status...`,
  search_flights: `\nCurrent task: Help user review flights via deep link...`,
  get_quotes: `\nCurrent task: Compare quotes...`,
  empty_legs: `\nCurrent task: Find empty legs...`,
  client_lookup: `\nCurrent task: Find client...`,
  send_proposal: `\nCurrent task: Send proposal...`,
  operator_message: `\nCurrent task: Message operator...`,
  view_history: `\nCurrent task: Show history...`,
};
```

### Step 3: Update Route Handler
**File**: `app/api/chat/respond/route.ts`

- Import centralized prompt module
- Replace inline `buildSystemPrompt()` with imported function
- Add more forced tool patterns

### Step 4: Update JetvisionAgent
**File**: `agents/jetvision-agent/index.ts`

- Import centralized prompt
- Update `SYSTEM_PROMPT` constant
- Add forced tool patterns for more scenarios

### Step 5: Add Tests
**File**: `__tests__/unit/prompts/system-prompt.test.ts`

- Test prompt builder functions
- Test intent-specific prompts
- Test response template formatting

---

## Migration Plan

### Before
```
app/api/chat/respond/route.ts    → buildSystemPrompt() (inline)
agents/jetvision-agent/index.ts  → SYSTEM_PROMPT constant
```

### After
```
lib/prompts/jetvision-system-prompt.ts  → Single source of truth
lib/prompts/intent-prompts.ts           → Intent-specific additions

app/api/chat/respond/route.ts    → import { buildSystemPrompt } from '@/lib/prompts/...'
agents/jetvision-agent/index.ts  → import { buildSystemPrompt } from '@/lib/prompts/...'
```

### Migration Steps
1. Create `lib/prompts/` directory
2. Extract current prompt to `jetvision-system-prompt.ts`
3. Extract intent prompts to `intent-prompts.ts`
4. Update imports in `route.ts`
5. Update imports in JetvisionAgent `index.ts`
6. Remove duplicate prompt code from original locations
7. Run tests to verify functionality

---

## Files to Modify/Create

| File | Action | Changes |
|------|--------|---------|
| `lib/prompts/jetvision-system-prompt.ts` | CREATE | Centralized prompt module |
| `lib/prompts/intent-prompts.ts` | CREATE | Intent-specific prompts |
| `app/api/chat/respond/route.ts` | MODIFY | Import and use new prompt builder |
| `agents/jetvision-agent/index.ts` | MODIFY | Import and use new prompt |
| `__tests__/unit/prompts/system-prompt.test.ts` | CREATE | Unit tests |

---

## Verification Plan

### Unit Tests
- [ ] Prompt builder returns valid string
- [ ] Intent prompts append correctly
- [ ] Response templates format data correctly

### Integration Tests
- [ ] New flight request collects all fields
- [ ] Trip lookup accepts all ID formats
- [ ] Error recovery provides helpful guidance

### Manual Testing Scenarios
1. **New Flight**: "Book a jet from Teterboro to LA for 4 people on March 15"
2. **Trip Lookup**: "Check trip LPZ8VC"
3. **Empty Legs**: "Any empty legs from NYC to Miami this week?"
4. **Client Lookup**: "Find Acme Corp" → "Add new client John Smith"
5. **Send Proposal**: "Send the proposal to the client"
6. **Error Recovery**: Provide invalid airport code, past date
7. **Multi-turn**: Start request → agent asks questions → complete

---

## Success Criteria

1. **Consistency**: Same query type produces same response structure
2. **Completeness**: All 10 scenarios handled with clear tool flow
3. **Context Awareness**: Multi-turn conversations maintain state
4. **Error Recovery**: Failures produce helpful guidance
5. **Response Quality**: Formatted, professional, actionable

---

## Estimated Effort

| Component | Lines of Code |
|-----------|---------------|
| Prompt module | ~400 lines |
| Intent prompts | ~100 lines |
| Route handler updates | ~50 lines |
| Agent class updates | ~30 lines |
| Unit tests | ~150 lines |
| **Total** | **~730 lines** |
