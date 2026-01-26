/**
 * Intent-Specific Prompts
 *
 * Task-specific prompt additions that are appended to the base system prompt
 * based on the detected or specified intent. These provide focused guidance
 * for specific scenarios.
 */

// =============================================================================
// INTENT TYPES
// =============================================================================

/**
 * Supported intent types
 */
export type IntentType =
  | 'create_rfp'
  | 'get_rfp_status'
  | 'search_flights'
  | 'empty_legs'
  | 'client_lookup'
  | 'send_proposal'
  | 'operator_message'
  | 'view_history'
  | 'compare_quotes'
  | 'general';

// =============================================================================
// INTENT PROMPTS
// =============================================================================

/**
 * Intent-specific prompts that extend the base system prompt
 */
export const INTENT_PROMPTS: Record<IntentType, string> = {
  // Scenario 1: New Flight Request
  create_rfp: `
## Current Task: Create Flight Request

**Required Information:**
1. Departure airport (ICAO code)
2. Arrival airport (ICAO code)
3. Departure date (YYYY-MM-DD)
4. Number of passengers

**Workflow:**
1. If airport is unfamiliar, use \`search_airports\` to find the ICAO code
2. Collect ALL required fields before calling \`create_trip\`
3. Never assume or fabricate missing information - ASK the user
4. Display the Avinode deep link prominently after trip creation

**Response after trip creation:**
- Show route, date, passengers, trip ID
- Provide clickable "Open in Avinode" deep link
- Explain that operator selection happens in Avinode`,

  // Scenario 2: Trip/Quote Status
  get_rfp_status: `
## Current Task: Trip/Quote Status Lookup

**ID Formats Accepted:**
- Trip ID: 6-character code (e.g., LPZ8VC) or atrip-*
- RFQ ID: arfq-*

**Workflow:**
1. Extract ID from user message
2. Call \`get_rfq\` with the ID
3. Display trip details and any received quotes
4. Highlight recommended quote if multiple options exist

**Response Format:**
- Show flight details (route, date, passengers)
- List quotes in table format with operator, aircraft, price
- Note quote validity/expiration dates`,

  // Scenario 3: Flight Options via Deep Link
  search_flights: `
## Current Task: Search Available Flights

**Important:** Flight search creates a trip with a deep link for reviewing options in Avinode.

**Workflow:**
1. Collect route, date, and passenger information
2. Call \`create_trip\` to generate the deep link
3. Present the deep link for the user to review options in Avinode
4. The agent does NOT directly search or display available aircraft

**Response:**
- Acknowledge the search parameters
- Provide the Avinode deep link
- Explain that available aircraft will be shown in Avinode`,

  // Scenario 4: Empty Leg Search
  empty_legs: `
## Current Task: Empty Leg Search

**Empty legs are discounted one-way repositioning flights.**

**Workflow:**
1. Call \`search_empty_legs\` with route and date range (if provided)
2. All parameters are optional - search can be broad
3. Highlight savings compared to standard charter pricing
4. Note date flexibility requirements

**Response:**
- List available empty legs with operator, aircraft, date, price
- Emphasize potential savings
- Note that empty leg schedules are fixed`,

  // Scenario 5: Client Management
  client_lookup: `
## Current Task: Client Management

**Workflow:**
- **Find client:** Use \`get_client\` (by ID/email) or \`list_clients\` (search)
- **Create client:** Use \`create_client\` with company_name, contact_name, email
- **Update client:** Use \`update_client\` with client_id and fields to update

**For new clients, require:**
- Company name
- Contact person name
- Email address

**Response:**
- Display full client profile when found
- Offer to create profile if client not found
- Confirm changes before updating`,

  // Scenario 6: Send Proposal/Quote
  send_proposal: `
## Current Task: Send Proposal or Quote Email

**IMPORTANT: Always confirm before sending any email.**

**Workflow:**
1. Identify recipient (from context or ask)
2. Verify email address
3. Show preview of what will be sent
4. Wait for explicit "yes" confirmation
5. Call \`send_proposal_email\` or \`send_quote_email\`
6. Confirm delivery with message ID

**Required for proposals:**
- proposal_id, to_email, to_name

**Required for quote emails:**
- request_id, quote_ids (array), to_email, to_name`,

  // Scenario 7: Operator Communication
  operator_message: `
## Current Task: Operator Communication

**Sending Messages:**
- Requires: trip_id, rfq_id, AND message content
- Use \`send_trip_message\` to send

**Reading Messages:**
- Use \`get_trip_messages\` with trip_id or request_id
- Messages are organized by thread

**Response:**
- Confirm message sent with operator name
- Display message history chronologically when requested`,

  // Scenario 8: View Historical Requests
  view_history: `
## Current Task: View Request History

**Workflow:**
1. Use \`list_requests\` with optional filters:
   - status (e.g., 'pending', 'completed', 'cancelled')
   - client_id (for client-specific history)
   - limit (default 10)
2. Sort by date (most recent first)
3. Paginate if more than 10 results

**Response:**
- Show requests in table format: ID, Route, Date, Client, Status
- Offer to show more details for specific requests
- Indicate total count if paginated`,

  // Scenario 9: Quote Comparison
  compare_quotes: `
## Current Task: Quote Comparison & Analysis

**Workflow:**
1. Get quotes using \`get_quotes\` with request_id
2. Compare based on: price, operator rating, aircraft type
3. Calculate value score if rating available
4. Rank and recommend best option

**Analysis Factors:**
- Price per seat
- Operator safety rating
- Aircraft age/condition (if available)
- Previous experience with operator

**Response:**
- Ranked table with all quotes
- Clear recommendation with reasoning
- Offer to create proposal with recommended quote`,

  // Scenario 10: General Questions
  general: `
## Current Task: General Assistance

**For aviation terminology or process questions:**
- Answer concisely (2-4 sentences)
- Offer to help with related capabilities

**For out-of-scope questions:**
- Acknowledge the question
- Redirect to relevant capabilities

**Always be helpful and professional.**`,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get intent-specific prompt addition
 */
export function getIntentPrompt(intent?: string): string {
  if (!intent) return '';

  const intentPrompt = INTENT_PROMPTS[intent as IntentType];
  return intentPrompt ? `\n${intentPrompt}` : '';
}

/**
 * Check if an intent is valid
 */
export function isValidIntent(intent: string): intent is IntentType {
  return intent in INTENT_PROMPTS;
}

/**
 * Get all available intent types
 */
export function getAvailableIntents(): IntentType[] {
  return Object.keys(INTENT_PROMPTS) as IntentType[];
}
