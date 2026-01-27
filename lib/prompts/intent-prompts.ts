/**
 * Intent-Specific Prompts
 *
 * Specialized instructions appended to the base system prompt
 * based on detected user intent.
 *
 * @module lib/prompts/intent-prompts
 */

/**
 * Intent-specific prompt additions
 * These are appended to the base system prompt when intent is detected
 */
export const INTENT_PROMPTS: Record<string, string> = {
  create_rfp: `## Current Task: Create Flight Request (RFQ)

**Priority**: Gather all required information before calling \`create_trip\`

### Required Information Checklist
- [ ] Departure airport (ICAO code)
- [ ] Arrival airport (ICAO code)
- [ ] Departure date (YYYY-MM-DD)
- [ ] Number of passengers

### Optional but Recommended
- [ ] Departure time (HH:MM, 24-hour) - ask if not provided
- [ ] Trip type (one-way or round-trip)

### Optional Information
- Return date and time (for round trips)
- Special requirements (pets, catering, medical, etc.)
- Preferred aircraft category
- Client reference (if known)

### Conversation Flow
1. If user provides partial info, acknowledge what you have
2. Ask ONLY for missing required fields (don't ask for optional unless user indicates interest)
3. If time is not provided, ask: "What time would you like to depart?"
4. If trip type is unclear, ask: "Is this a one-way flight or round trip?"
5. Validate airport codes before calling tool
6. After trip creation, provide ACTIONABLE GUIDANCE:
   - "Your trip has been created successfully. Please visit the Avinode Marketplace using the link above to review available flights, select your preferred aircraft, and submit RFQs to operators."
   - DO NOT list trip ID, route, date, passengers, or deep link (UI components display these)
   - Focus on next steps and what the user should do

### Multi-Turn Parameter Extraction
When user provides clarification (e.g., airport codes after you asked for them):
- **SCAN THE ENTIRE CONVERSATION** to build complete \`create_trip\` parameters
- Airports: From the clarification message (e.g., "KTEB to KMCI")
- Date: From earlier message (e.g., "May 3, 2026" → "2026-05-03")
- Time: From earlier message (e.g., "4:00pm EST" → "16:00", "morning" → "09:00")
- Passengers: From earlier message (e.g., "4 passengers" → 4)
- Trip type: From earlier message (e.g., "one way" → no return_date, "round trip" → ask for return_date)
- NEVER call \`create_trip\` with missing required params - extract them from history first

### Time Conversion
- "4:00pm" or "4pm" → "16:00"
- "10am" → "10:00"
- "morning" → "09:00" (confirm with user)
- "afternoon" → "14:00" (confirm with user)
- Ignore timezone mentions - Avinode uses local airport time

### Response Template (After Trip Creation)
"Your trip has been created successfully. Please visit the Avinode Marketplace using the link above to review available flights, select your preferred aircraft, and submit RFQs to operators.

Once you've selected operators and sent RFQs, I'll help you track responses and compare quotes."`,

  get_rfp_status: `## Current Task: Trip/Quote Status Lookup

**Priority**: Identify the trip and provide contextual status updates with insights

### ID Format Recognition
- **6-char code** (e.g., LPZ8VC): Legacy trip reference
- **atrip-*** format: Avinode trip ID
- **arfq-*** format: Avinode RFQ ID
- **aquote-*** format: Specific quote ID (use \`get_quote\` instead)

### Response Structure (Contextual, Not Redundant)
1. **Status Summary**: Number of responses vs. total operators, current workflow state
2. **Updates & Changes** (if any):
   - Price changes: "[Operator] updated from $X to $Y"
   - New quotes received
   - Operator messages and communications
3. **Insights**: Notable changes, trends, or important information
4. **Next Steps**: Actionable guidance based on current state

### CRITICAL: UI Awareness
- DO NOT repeat route, date, passengers (visible in TripSummaryCard)
- DO NOT list all quote details (visible in RFQQuoteDetailsCard)
- DO focus on: status changes, price updates, operator messages, actionable next steps

### Response Template
"[X] out of [Y] operators have responded to your RFQ.

**Updates**:
- **[Operator Name]** has updated their quote from $[OLD_PRICE] to $[NEW_PRICE]. [They mentioned: '[operator chat message]' if available]
- **[Operator Name]** submitted a new quote: $[PRICE] for [Aircraft Type]

**Status**: [X] operators have not yet responded. [Include any relevant operator messages or notes]

Would you like me to compare all quotes or reach out to any operators?"`,

  search_flights: `## Current Task: Flight Search

**Important**: Direct flight search without trip creation is NOT available via API

### Clarify User Intent
The user may want one of these:
1. **Create a trip to see available aircraft** → Guide to \`create_trip\`
2. **Search for empty legs (discounts)** → Use \`search_empty_legs\`
3. **Check existing trip quotes** → Use \`get_rfq\`

### Response Template
"To see available aircraft and pricing for your route, I can:
1. **Create a trip in Avinode** - You'll get a deep link to view all available operators
2. **Search for empty legs** - Discounted one-way flights (requires date flexibility)

Which would you prefer?"`,

  get_quotes: `## Current Task: Quote Analysis & Comparison

**Priority**: Help user evaluate quotes and make informed decision

### Quote Display Format
Present quotes in ranked order:
| Rank | Operator | Aircraft | Price | Valid Until | Rating |

### Analysis Criteria
1. **Price**: Total cost comparison
2. **Aircraft Category**: Light/Mid/Heavy/Ultra-long range
3. **Operator Rating**: Avinode safety rating
4. **Validity**: Quote expiration date
5. **Aircraft Age**: Newer = typically better amenities

### Recommendation Format
"Based on your requirements, I recommend **[Operator]**:
- Price: $XX,XXX
- Aircraft: [Type]
- Operator Rating: X.X/5

Shall I create a proposal with this quote?"`,

  empty_legs: `## Current Task: Empty Leg Search

**Priority**: Find discounted flights with date flexibility

### What Are Empty Legs
Empty legs are positioning flights offered at 25-50% discount.
- One-way only
- Dates are fixed by aircraft schedule
- Must match exact route

### Response Template
"I found [N] empty leg options for [route]:
| Date | Route | Aircraft | Est. Price | Flexibility |

**Note**: Empty legs require flexibility. The aircraft schedule determines exact timing."`,

  client_lookup: `## Current Task: Client Management

**Priority**: Find or create client profile for CRM

### Lookup Flow
1. Search by: Email, company name, or contact name
2. If found: Display client profile card
3. If not found: Offer to create new profile

### Client Profile Display
"**[Company Name]**
- Contact: [Name]
- Email: [Email]
- Phone: [Phone]
- Requests: [N]"`,

  generate_proposal: `## Current Task: Generate Proposal Document

**Priority**: Create professional proposal from selected quote

### Required Information
1. **Quote Selection**: Which quote to use (if multiple available)
2. **Request Context**: Trip details for proposal content
3. **Client Info**: Name and email for personalization (optional but recommended)

### Generation Flow
\`\`\`
START
  |
  v
Check: Has quote_id or request_id?
  |-- No --> Ask: "Which quote would you like to create a proposal for?"
  |-- Yes --> Validate quote exists and has pricing
               |
               v
             Check: Client info available?
               |-- No --> Ask for client email (optional)
               |-- Yes --> Include personalization
               |
               v
             Call: \`create_proposal\` with:
               - request_id (or resolve from trip_id)
               - quote_id
               - title (auto-generate or ask)
               - customer_email (for client resolution)
               |
               v
             Report: "Proposal created successfully"
             Next step: "Ready to send to client?"
\`\`\`

### Response Template
"I've created your proposal:
**Proposal**: [Number] - [Title]
- Based on: [Operator] quote for $[Amount]
- Route: [Departure] → [Arrival]
- Date: [Date]

Would you like me to send this to the client?"`,

  send_proposal: `## Current Task: Send Proposal to Client

**Priority**: Confirm all details before sending

### Pre-Send Checklist
1. Proposal exists and is ready
2. Recipient email is verified
3. Client name for personalization

### Confirmation Template
"I'm ready to send this proposal:
**Proposal**: [Title]
- Quote: [Operator] - [Aircraft]
- Price: $XX,XXX
**Recipient**: [Name] <[email]>

Reply **yes** to send, or tell me what to change."`,

  operator_message: `## Current Task: Operator Communication

**Priority**: Send clear message through Avinode

### Required Information
- Trip ID
- RFQ ID (specific operator thread)
- Message content

### Confirmation
"I'll send this message to [Operator]:
'[Message content]'

Reply **yes** to send."`,

  view_history: `## Current Task: View Request History

**Priority**: Show relevant historical data

### Available Filters
- Status: draft, pending, awaiting_quotes, completed, cancelled
- Client: Filter by specific client
- Limit: Number of results (default 20)

### Display Format
"**Your Recent Requests**
| ID | Route | Date | Client | Status | Quotes |

Showing [N] of [Total]. Want to see more or filter differently?"`,

  general_question: `## Current Task: General Question

**Priority**: Answer concisely, redirect to action when appropriate

### Response Guidelines
1. Answer the question directly (1-2 sentences)
2. If relevant, offer to take action
3. If out of scope, redirect to charter flight assistance`,
};

/**
 * Keywords and patterns for intent detection
 */
export const INTENT_PATTERNS: Record<string, RegExp[]> = {
  create_rfp: [
    /(?:create|new|book|request)\s+(?:a\s+)?(?:trip|flight|rfq|rfp)/i,
    /(?:i\s+)?need\s+(?:a\s+)?(?:flight|trip|charter)/i,
    /(?:fly|flying)\s+(?:from|to)/i,
    /(?:book|schedule)\s+(?:a\s+)?(?:jet|plane|aircraft)/i,
  ],
  get_rfp_status: [
    /(?:check|status|lookup|find|show|get)\s+(?:trip|rfq|quotes?)/i,
    /(?:atrip|arfq)-/i,
    /^[A-Z0-9]{6}$/i,
    /(?:what'?s?\s+)?(?:the\s+)?status\s+(?:of|on)/i,
  ],
  search_flights: [
    /(?:search|find|look\s+for)\s+(?:flights?|options?)/i,
    /(?:what'?s?\s+)?available\s+(?:for|from|to)/i,
    /(?:show|list)\s+(?:me\s+)?(?:aircraft|jets?|planes?)/i,
  ],
  get_quotes: [
    /(?:compare|analyze|show|list)\s+(?:the\s+)?quotes?/i,
    /(?:which|what)\s+(?:quote|option)\s+(?:is\s+)?(?:best|cheapest|recommended)/i,
    /(?:quote\s+)?comparison/i,
  ],
  empty_legs: [
    /empty\s*leg/i,
    /(?:discount|cheap|deal)\s+(?:flight|trip)/i,
    /positioning\s+flight/i,
    /one[- ]?way\s+(?:deal|discount)/i,
  ],
  client_lookup: [
    /(?:find|lookup|search|get|show)\s+(?:a\s+)?client/i,
    /(?:who\s+is|client\s+profile)/i,
    /(?:add|create|new)\s+(?:a\s+)?client/i,
  ],
  generate_proposal: [
    /(?:create|generate|make|build)\s+(?:a\s+)?proposal/i,
    /(?:prepare|draft)\s+(?:a\s+)?proposal/i,
    /proposal\s+(?:for|from)\s+(?:this|that|the)\s+quote/i,
    /(?:turn|convert)\s+(?:this|that|the)\s+quote\s+(?:into|to)\s+(?:a\s+)?proposal/i,
    /(?:i\s+)?(?:want|need)\s+(?:a\s+)?proposal/i,
  ],
  send_proposal: [
    /send\s+(?:the\s+)?(?:proposal|quote)/i,
    /email\s+(?:the\s+)?(?:client|proposal|quote)/i,
    /(?:send|email)\s+(?:this|that)\s+to/i,
  ],
  operator_message: [
    /(?:message|contact|reach)\s+(?:the\s+)?operator/i,
    /(?:send|write)\s+(?:a\s+)?message\s+to/i,
    /(?:ask|tell)\s+(?:the\s+)?operator/i,
  ],
  view_history: [
    /(?:show|list|view)\s+(?:my\s+)?(?:recent\s+)?(?:requests?|history)/i,
    /(?:past|previous)\s+(?:trips?|requests?|rfqs?)/i,
    /(?:what\s+)?(?:have\s+)?(?:i|we)\s+(?:done|requested)/i,
  ],
};

/**
 * Detect user intent from message
 * @param message User message
 * @returns Detected intent key or null
 */
export function detectIntent(message: string): string | null {
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        return intent;
      }
    }
  }
  return null;
}

/**
 * Check if a message looks like an airport clarification response
 * (contains ICAO codes or airport names in a pattern suggesting a route)
 */
function isAirportClarificationResponse(message: string): boolean {
  // Pattern: Contains ICAO airport codes (K followed by 3 letters) with "to" or arrow
  const hasIcaoCodePair = /\bK[A-Z]{3}\b.*?(?:to|→|->|–)\s*\bK?[A-Z]{3,4}\b/i.test(message);

  // Pattern: Contains airport name with parenthetical code
  const hasAirportWithCode = /\([A-Z]{3,4}\).*?(?:to|→|->)\s*.*?\([A-Z]{3,4}\)/i.test(message);

  // Pattern: Simple ICAO code pair like "KTEB KMCI" or "KTEB to KMCI"
  const hasSimpleCodePair = /^[A-Z]{4}\s*(?:to|→|->|–|\s)\s*[A-Z]{4}/i.test(message.trim());

  return hasIcaoCodePair || hasAirportWithCode || hasSimpleCodePair;
}

/**
 * Check if assistant message is asking for clarification about airports or trip details
 */
function isAskingForTripClarification(content: string): boolean {
  const lower = content.toLowerCase();
  return (
    lower.includes('which airport') ||
    lower.includes('departure airport') ||
    lower.includes('arrival airport') ||
    lower.includes('i still need') ||
    lower.includes('icao') ||
    lower.includes('airport code') ||
    lower.includes('please tell me which') ||
    lower.includes('confirm the time') ||
    lower.includes('which one did you mean') ||
    (lower.includes('new jersey') && lower.includes('kansas city')) ||
    /kteb|kewr|kmmu|kcdw|kmci|kmkc/i.test(content)
  );
}

/**
 * Detect intent from message WITH conversation history context.
 * This fixes the multi-turn conversation bug where clarification responses
 * don't match intent patterns and cause the agent to lose context.
 *
 * @param currentMessage Current user message
 * @param conversationHistory Previous conversation turns
 * @returns Detected intent key or null
 */
export function detectIntentWithHistory(
  currentMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): string | null {
  // First, try to detect intent from current message (existing behavior)
  const currentIntent = detectIntent(currentMessage);
  if (currentIntent) {
    return currentIntent;
  }

  // If no intent detected and message looks like airport clarification,
  // check if we're in the middle of a trip creation flow
  if (isAirportClarificationResponse(currentMessage)) {
    // Check if the last assistant message was asking for airport clarification
    const lastAssistantMsg = [...conversationHistory]
      .reverse()
      .find(m => m.role === 'assistant');

    if (lastAssistantMsg && isAskingForTripClarification(lastAssistantMsg.content)) {
      return 'create_rfp';
    }
  }

  // Scan conversation history for a previous create_rfp intent that we should maintain
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const msg = conversationHistory[i];
    if (msg.role === 'user') {
      const historicalIntent = detectIntent(msg.content);
      if (historicalIntent === 'create_rfp') {
        // Found a previous create_rfp intent - check if assistant was asking for clarification
        const nextMsg = conversationHistory[i + 1];
        if (nextMsg?.role === 'assistant' && isAskingForTripClarification(nextMsg.content)) {
          // User is responding to clarification, maintain the intent
          return 'create_rfp';
        }
      }
    }
  }

  return null;
}

/**
 * Get intent prompt by key
 * @param intent Intent key
 * @returns Intent-specific prompt or undefined
 */
export function getIntentPrompt(intent: string): string | undefined {
  return INTENT_PROMPTS[intent];
}

/**
 * List all available intents
 */
export function listIntents(): string[] {
  return Object.keys(INTENT_PROMPTS);
}

export default INTENT_PROMPTS;
