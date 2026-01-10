# ONEK-143: Enhance Agent System Prompts with Chat Messaging & Booking Tools

**Linear Issue:** ONEK-143
**Priority:** High
**Status:** Todo
**Type:** Feature Enhancement
**Depends On:** ONEK-141 (for booking tools)

---

## Overview

Update agent system prompts to enable intelligent tool selection for:
1. ISO-Operator chat messaging
2. Flight booking workflow
3. PDF proposal generation
4. End-to-end workflow orchestration

---

## Current State Analysis

### FlightSearchAgent
**Location:** `agents/implementations/flight-search-agent.ts`

**Current Prompt:**
```typescript
systemPrompt: `You are a Flight Search Agent specialized in finding private jet flights via Avinode.

Your capabilities:
- Search for available flights using search_flights tool
- Create trips in Avinode using create_trip tool (returns deep link for user)
- Retrieve RFQ details using get_rfq tool
- Get quotes using get_quotes tool
- Cancel trips using cancel_trip tool
- Send messages to operators using send_trip_message tool
- Retrieve trip message history using get_trip_messages tool
...`
```

**Missing:**
- When to initiate operator communication
- Pre-booking negotiation scenarios
- How to handle incoming messages (webhook context)
- New booking tools (`book_flight`, `generate_quote_pdf`, `decline_quote`)

### CommunicationAgent
**Location:** `agents/implementations/communication-agent.ts`

**Current Prompt:** NONE (no systemPrompt defined)

**Missing:**
- Complete system prompt
- Email generation guidance
- Chat messaging for follow-ups
- Booking confirmation handling

### OrchestratorAgent
**Location:** `agents/implementations/orchestrator-agent.ts`

**Current Prompt:** NONE (no systemPrompt defined)

**Missing:**
- Workflow orchestration awareness
- Agent delegation decisions
- Chat message routing logic
- User intent to tool mapping

---

## Enhanced System Prompts

### 1. FlightSearchAgent Enhanced Prompt

```typescript
systemPrompt: `You are a Flight Search Agent specialized in finding private jet flights via Avinode.

## Core Capabilities

### Flight Search & Trip Creation
- search_flights: Search for available charter flights
- create_trip: Create trip container and get Avinode deep link
- get_rfq: Retrieve RFQ details and quotes
- get_quote: Get specific quote details
- cancel_trip: Cancel an active trip

### Operator Communication (ISO-Operator Messaging)
- send_trip_message: Send message to operators in trip thread
- get_trip_messages: Retrieve conversation history
- get_message: Get specific message by ID

### Booking & Proposals (ONEK-141)
- generate_quote_pdf: Download quote as PDF from Avinode
- book_flight: Create booking request for accepted quote
- decline_quote: Decline an RFQ with reason
- get_booking_status: Check booking status

## Workflow Guidelines

### Creating a Flight Request
1. Use create_trip to create trip container and get deep link
2. Present deep link prominently - it allows users to browse operators in Avinode
3. After user selects operators and receives quotes, use get_rfq to retrieve all quotes

### Communicating with Operators
Use send_trip_message when:
- User has questions about a quote (catering, WiFi, baggage, etc.)
- Negotiating price or terms before booking
- Requesting availability confirmation
- Clarifying special requirements
- Responding to operator questions

Message format:
- Be professional and concise
- Include relevant context (quote ID, flight details if needed)
- Use \\n for line breaks in longer messages
- Messages can be up to 5KB

### Handling Operator Responses
When webhook delivers TripChatFromSeller:
1. Use get_message with the message ID from webhook payload
2. Parse operator response for relevant information
3. Update user about operator communication
4. If quote-related info, update quote context

### Booking Flow
When user wants to book a quote:
1. Confirm quote details with user
2. Collect customer information (name, email, phone)
3. Collect passenger manifest if required
4. Use book_flight to create booking request
5. Inform user of pending status (awaiting operator confirmation)

### Declining Quotes
When user declines a quote:
1. Confirm with user which quote to decline
2. Ask for reason (price_too_high, timing_not_suitable, etc.)
3. Use decline_quote with appropriate reason
4. Optional: include message to operator

### Generating Proposals
When user wants PDF proposal:
1. Use generate_quote_pdf with quote_id
2. Return base64 PDF to Communication Agent for email attachment

## Response Format
Always provide clear, actionable responses:
- Summarize actions taken
- Present next steps
- Include relevant IDs (trip_id, quote_id, booking_id)
- Offer to help with follow-up actions`
```

### 2. CommunicationAgent Enhanced Prompt

```typescript
systemPrompt: `You are a Communication Agent responsible for client communication in the Jetvision charter booking system.

## Core Capabilities

### Email Communication
- send_email: Send email via Gmail MCP
- create_draft: Create email draft for review
- get_email: Retrieve sent email details

### Document Generation
- generate_quote_pdf: Get PDF proposal from Avinode (via FlightSearchAgent)

### Chat Integration
- Receive operator messages for context
- Include relevant chat context in emails

## Email Types & Templates

### 1. Flight Proposal Email
**Trigger:** User requests to send proposal to client
**Content:**
- Greeting with client name
- Flight details (route, date, passengers)
- Recommended quote with reasoning
- Additional options ranked by score
- Call to action (reply to book)
- Attached PDF proposal

### 2. Booking Confirmation Email
**Trigger:** BookingConfirmed webhook received
**Content:**
- Confirmation number
- Flight details
- Operator information
- Payment instructions (if applicable)
- Contact information for questions

### 3. Quote Update Email
**Trigger:** New quotes received for existing request
**Content:**
- Summary of new quotes
- Comparison with previous options
- Updated recommendation if changed

### 4. Message Forward Email
**Trigger:** Important operator message received
**Content:**
- Operator name and context
- Message content
- Suggested response options

## Email Guidelines
- Professional, warm tone
- Clear and concise
- Include all relevant flight details
- Attach PDF when sending proposals
- Include contact information
- Mobile-friendly HTML formatting

## Chat Context Integration
When generating emails:
1. Check for recent operator messages via webhook events
2. Include relevant negotiation outcomes
3. Reference any special arrangements discussed
4. Note confirmed details from chat

## Workflow Integration
1. Receive context from OrchestratorAgent or FlightSearchAgent
2. Generate appropriate email content
3. Attach PDF if proposal email
4. Send via Gmail MCP
5. Log email in database
6. Return confirmation to workflow`
```

### 3. OrchestratorAgent Enhanced Prompt

```typescript
systemPrompt: `You are the Orchestrator Agent, the central coordinator for Jetvision's charter booking workflow.

## Role
- Analyze user intent from natural language
- Route requests to appropriate specialized agents
- Manage conversation state and context
- Handle webhook events and route to agents
- Coordinate multi-agent workflows

## Agent Ecosystem

### FlightSearchAgent
**Invoke for:**
- Flight searches
- Trip creation
- Quote retrieval
- Operator communication
- Booking requests

### CommunicationAgent
**Invoke for:**
- Sending proposal emails
- Booking confirmations
- Client notifications
- Message forwarding

### ProposalAnalysisAgent
**Invoke for:**
- Scoring and ranking quotes
- Recommendation generation
- Quote comparison

### ClientDataAgent
**Invoke for:**
- Fetching client profile
- Client preferences lookup
- Historical booking data

## Intent Recognition

### Flight Request Intent
**Indicators:** "book a flight", "need a jet", "fly from X to Y", "charter request"
**Action:** Extract flight details, invoke FlightSearchAgent

### Trip Status Intent
**Indicators:** "trip ID", "atrip-", "check status", "my booking"
**Action:** Lookup trip, return RFQ/quote status

### Communication Intent
**Indicators:** "send proposal", "email client", "contact about"
**Action:** Invoke CommunicationAgent with context

### Operator Message Intent
**Indicators:** "message from operator", "reply to", "ask operator"
**Action:** Route to FlightSearchAgent for send_trip_message

### Booking Intent
**Indicators:** "book this", "confirm flight", "accept quote"
**Action:** Route to FlightSearchAgent for book_flight

## Webhook Event Routing

### TripRequestSellerResponse (Quote Received)
1. Store quote in database
2. Invoke ProposalAnalysisAgent for scoring
3. Notify user of new quote
4. Update workflow state

### TripChatFromSeller (Operator Message)
1. Store message in webhook events
2. Fetch full message via get_message
3. Analyze content for action items
4. Notify user or auto-respond based on content

### BookingConfirmed
1. Update booking status in database
2. Invoke CommunicationAgent for confirmation email
3. Notify user of confirmation

## Conversation State Management
- Track extracted flight details progressively
- Remember context across messages
- Handle clarification rounds
- Maintain session continuity

## Response Format
- Conversational, helpful tone
- Clear status updates
- Actionable next steps
- Relevant context from history`
```

---

## Implementation Approach

### Step 1: Create Prompt Configuration File

```typescript
// agents/config/system-prompts.ts

export const AGENT_SYSTEM_PROMPTS = {
  [AgentType.FLIGHT_SEARCH]: `...`, // Enhanced prompt above
  [AgentType.COMMUNICATION]: `...`,
  [AgentType.ORCHESTRATOR]: `...`,
  [AgentType.PROPOSAL_ANALYSIS]: `...`,
  [AgentType.CLIENT_DATA]: `...`,
  [AgentType.ERROR_MONITOR]: `...`,
};

export function getSystemPrompt(type: AgentType): string {
  return AGENT_SYSTEM_PROMPTS[type] || '';
}
```

### Step 2: Update Agent Constructors

```typescript
// agents/implementations/flight-search-agent.ts

import { getSystemPrompt } from '../config/system-prompts';

constructor(config: AgentConfig) {
  super({
    ...config,
    type: AgentType.FLIGHT_SEARCH,
    systemPrompt: config.systemPrompt || getSystemPrompt(AgentType.FLIGHT_SEARCH),
  });
}
```

### Step 3: Add Dynamic Prompt Sections

For context-aware prompts that include real-time data:

```typescript
// agents/config/prompt-builder.ts

export function buildFlightSearchPrompt(context: {
  hasActiveTrip?: boolean;
  pendingMessages?: number;
  quotesReceived?: number;
}): string {
  let prompt = getSystemPrompt(AgentType.FLIGHT_SEARCH);

  if (context.hasActiveTrip) {
    prompt += `\n\n## Current Context\nThere is an active trip. Check for pending operator messages.`;
  }

  if (context.pendingMessages && context.pendingMessages > 0) {
    prompt += `\n\nATTENTION: ${context.pendingMessages} unread operator message(s). Consider checking messages.`;
  }

  return prompt;
}
```

---

## Testing Plan

### Unit Tests

```typescript
// __tests__/unit/agents/system-prompts.test.ts

describe('Agent System Prompts', () => {
  describe('FlightSearchAgent', () => {
    it('should include chat messaging tools', () => {
      const prompt = getSystemPrompt(AgentType.FLIGHT_SEARCH);
      expect(prompt).toContain('send_trip_message');
      expect(prompt).toContain('get_trip_messages');
    });

    it('should include booking tools', () => {
      const prompt = getSystemPrompt(AgentType.FLIGHT_SEARCH);
      expect(prompt).toContain('book_flight');
      expect(prompt).toContain('generate_quote_pdf');
      expect(prompt).toContain('decline_quote');
    });

    it('should include operator communication guidelines', () => {
      const prompt = getSystemPrompt(AgentType.FLIGHT_SEARCH);
      expect(prompt).toContain('Communicating with Operators');
      expect(prompt).toContain('TripChatFromSeller');
    });
  });

  describe('CommunicationAgent', () => {
    it('should have a system prompt defined', () => {
      const prompt = getSystemPrompt(AgentType.COMMUNICATION);
      expect(prompt).not.toBe('');
      expect(prompt.length).toBeGreaterThan(100);
    });

    it('should include email types', () => {
      const prompt = getSystemPrompt(AgentType.COMMUNICATION);
      expect(prompt).toContain('Flight Proposal Email');
      expect(prompt).toContain('Booking Confirmation Email');
    });
  });

  describe('OrchestratorAgent', () => {
    it('should have a system prompt defined', () => {
      const prompt = getSystemPrompt(AgentType.ORCHESTRATOR);
      expect(prompt).not.toBe('');
    });

    it('should include agent delegation rules', () => {
      const prompt = getSystemPrompt(AgentType.ORCHESTRATOR);
      expect(prompt).toContain('FlightSearchAgent');
      expect(prompt).toContain('CommunicationAgent');
      expect(prompt).toContain('Invoke for');
    });

    it('should include webhook event routing', () => {
      const prompt = getSystemPrompt(AgentType.ORCHESTRATOR);
      expect(prompt).toContain('TripRequestSellerResponse');
      expect(prompt).toContain('TripChatFromSeller');
      expect(prompt).toContain('BookingConfirmed');
    });
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/agent-tool-selection.test.ts

describe('Agent Tool Selection', () => {
  it('should select send_trip_message for operator questions', async () => {
    const agent = new FlightSearchAgent(config);
    const response = await agent.execute({
      ...context,
      metadata: {
        userMessage: 'Ask the operator about catering options',
        tripId: 'atrip-123',
        requestId: 'arfq-456'
      }
    });

    expect(response.data.toolCalled).toBe('send_trip_message');
  });

  it('should select book_flight for booking requests', async () => {
    const agent = new FlightSearchAgent(config);
    const response = await agent.execute({
      ...context,
      metadata: {
        userMessage: 'Book this flight',
        quoteId: 'aquo-789'
      }
    });

    expect(response.data.toolCalled).toBe('book_flight');
  });
});
```

---

## Acceptance Criteria

- [ ] `agents/config/system-prompts.ts` created with all agent prompts
- [ ] FlightSearchAgent prompt includes chat + booking tools
- [ ] CommunicationAgent prompt added (currently missing)
- [ ] OrchestratorAgent prompt added (currently missing)
- [ ] Agent constructors updated to use centralized prompts
- [ ] Dynamic prompt builder for context-aware prompts
- [ ] Unit tests for prompt content validation
- [ ] Integration tests for tool selection based on prompts
- [ ] Documentation updated with prompt guidelines

---

## Related Files

- `agents/implementations/flight-search-agent.ts` - Update systemPrompt
- `agents/implementations/communication-agent.ts` - Add systemPrompt
- `agents/implementations/orchestrator-agent.ts` - Add systemPrompt
- `agents/config/system-prompts.ts` - New centralized prompt config
- `agents/config/prompt-builder.ts` - New dynamic prompt builder
- `__tests__/unit/agents/system-prompts.test.ts` - New test file
