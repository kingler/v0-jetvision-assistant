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

### Optional Information
- Return date (for round trips)
- Special requirements (pets, catering, medical, etc.)
- Preferred aircraft category
- Client reference (if known)

### Conversation Flow
1. If user provides partial info, acknowledge what you have
2. Ask ONLY for missing required fields (don't ask for optional unless user indicates interest)
3. Validate airport codes before calling tool
4. After trip creation, show:
   - Trip summary with deep link
   - Clear next step: "Open in Avinode to select operators"`,

  get_rfp_status: `## Current Task: Trip/Quote Status Lookup

**Priority**: Identify the trip and provide comprehensive status

### ID Format Recognition
- **6-char code** (e.g., LPZ8VC): Legacy trip reference
- **atrip-*** format: Avinode trip ID
- **arfq-*** format: Avinode RFQ ID
- **aquote-*** format: Specific quote ID (use \`get_quote\` instead)

### Response Structure
1. **Trip Overview**: Route, date, status
2. **Quotes Summary** (if available):
   | Operator | Aircraft | Price | Validity | Status |
3. **Recommendation** (if multiple quotes): Best value, fastest aircraft, highest-rated operator
4. **Next Steps**: Guidance based on current state`,

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
