/**
 * Response Templates
 *
 * Standardized response format templates for consistent output across
 * all scenarios. These are included in the system prompt to guide
 * response formatting.
 */

// =============================================================================
// QUOTE DISPLAY TEMPLATES
// =============================================================================

/**
 * Template for displaying quote tables
 */
export const QUOTE_TABLE_TEMPLATE = `### Quote Display Format
When showing quotes, use this table format:

| Operator | Aircraft | Price | Valid Until |
|----------|----------|-------|-------------|
| [Name] [Rating] | [Type] ([Tail]) | $[Amount] | [Date] |

Include operator rating if available. Highlight recommended option with "Recommended:" prefix.`;

// =============================================================================
// TRIP SUMMARY TEMPLATES
// =============================================================================

/**
 * Template for trip summary display
 */
export const TRIP_SUMMARY_TEMPLATE = `### Trip Summary Format
When displaying trip details:

**Trip [ID]**
- Route: [ICAO_DEP] ([City]) to [ICAO_ARR] ([City])
- Date: [Weekday], [Month] [Day], [Year] at [Time]
- Passengers: [Count]
- Status: [Status]

Always include the Avinode deep link when a trip is created:
[Open in Avinode](deep_link_url)`;

// =============================================================================
// PRICE BREAKDOWN TEMPLATE
// =============================================================================

/**
 * Template for price breakdown display
 */
export const PRICE_BREAKDOWN_TEMPLATE = `### Price Breakdown Format
When showing detailed pricing:

Base Charter: $[BASE]
Federal Excise Tax (7.5%): $[TAX]
Segment Fees: $[SEGMENT]
Airport Fees: $[AIRPORT]
---
**Total: $[TOTAL] USD**`;

// =============================================================================
// ERROR MESSAGE TEMPLATE
// =============================================================================

/**
 * Template for error messages
 */
export const ERROR_MESSAGE_TEMPLATE = `### Error Message Format
When something goes wrong:

**[Short Description]**

[Detailed explanation of what happened]

**What you can try:**
1. [First recovery option]
2. [Second recovery option]

Be helpful, not apologetic. Focus on solutions.`;

// =============================================================================
// CONFIRMATION PROMPT TEMPLATE
// =============================================================================

/**
 * Template for confirmation prompts
 */
export const CONFIRMATION_TEMPLATE = `### Confirmation Format
Before irreversible actions (sending emails, accepting quotes):

I'm about to [ACTION].

**Details:**
- [Key detail 1]
- [Key detail 2]

Reply "yes" to confirm, or let me know if you'd like changes.

IMPORTANT: Always wait for explicit confirmation before sending emails or making commitments.`;

// =============================================================================
// CLIENT PROFILE TEMPLATE
// =============================================================================

/**
 * Template for client profile display
 */
export const CLIENT_PROFILE_TEMPLATE = `### Client Profile Format

**Client Profile**
- Company: [NAME]
- Contact: [PERSON]
- Email: [EMAIL]
- Phone: [PHONE]
- Status: [VIP/Regular]
- Last Flight: [DATE]
- Total Flights: [COUNT]`;

// =============================================================================
// COMBINED RESPONSE TEMPLATES
// =============================================================================

/**
 * All response templates combined for system prompt
 */
export const RESPONSE_TEMPLATES = `## Response Formatting Guidelines

${QUOTE_TABLE_TEMPLATE}

${TRIP_SUMMARY_TEMPLATE}

${ERROR_MESSAGE_TEMPLATE}

${CONFIRMATION_TEMPLATE}

### General Guidelines
- Be concise and professional
- Use markdown formatting for clarity
- Include relevant IDs for reference
- Provide actionable next steps when appropriate`;
