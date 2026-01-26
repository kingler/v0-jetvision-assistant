/**
 * Prompt Constants
 *
 * Centralized constants for system prompts including tool references,
 * airport codes, and validation patterns.
 */

// =============================================================================
// AIRPORT CODES REFERENCE
// =============================================================================

/**
 * Common US airport ICAO codes for reference in system prompt
 */
export const COMMON_AIRPORT_CODES = `KTEB = Teterboro, KJFK = JFK, KLAX = Los Angeles, KORD = Chicago O'Hare,
KMIA = Miami, KDEN = Denver, KLAS = Las Vegas, KVNY = Van Nuys, KSFO = San Francisco,
KBOS = Boston, KDCA = Washington Reagan, KIAD = Dulles, KATL = Atlanta, KHOU = Houston Hobby`;

// =============================================================================
// TOOL CATEGORIES
// =============================================================================

/**
 * Avinode tool names for reference
 */
export const AVINODE_TOOLS = [
  'create_trip',
  'get_rfq',
  'get_quote',
  'cancel_trip',
  'send_trip_message',
  'get_trip_messages',
  'search_airports',
  'search_empty_legs',
] as const;

/**
 * Database (CRM) tool names for reference
 */
export const DATABASE_TOOLS = [
  'get_client',
  'list_clients',
  'create_client',
  'update_client',
  'get_request',
  'list_requests',
  'get_quotes',
  'update_quote_status',
  'get_operator',
  'list_preferred_operators',
  'create_proposal',
  'get_proposal',
] as const;

/**
 * Gmail tool names for reference
 */
export const GMAIL_TOOLS = [
  'send_email',
  'send_proposal_email',
  'send_quote_email',
] as const;

// =============================================================================
// TOOL DOCUMENTATION
// =============================================================================

/**
 * Tool reference documentation for the system prompt
 */
export const TOOL_REFERENCE = `## Available Tools

### Avinode Tools (Flight Operations)
| Tool | Purpose | Required Params |
|------|---------|-----------------|
| \`create_trip\` | Create trip + get deep link | departure_airport, arrival_airport, departure_date, passengers |
| \`get_rfq\` | Get trip/quotes | rfq_id (arfq-*, atrip-*, or 6-char code) |
| \`get_quote\` | Detailed quote info | quote_id (aquote-*) |
| \`cancel_trip\` | Cancel active trip | trip_id |
| \`send_trip_message\` | Message operators | trip_id, rfq_id, message |
| \`get_trip_messages\` | Message history | trip_id or request_id |
| \`search_airports\` | Find airports | query |
| \`search_empty_legs\` | Discounted flights | (optional: departure, arrival, date_from, date_to) |

### Database Tools (CRM)
| Tool | Purpose | Required Params |
|------|---------|-----------------|
| \`get_client\` | Get client by ID/email | client_id or email |
| \`list_clients\` | Search/list clients | (optional: search, limit) |
| \`create_client\` | Add client profile | company_name, contact_name, email |
| \`update_client\` | Modify client | client_id |
| \`get_request\` | Request details | request_id |
| \`list_requests\` | List/filter requests | (optional: status, client_id, limit) |
| \`get_quotes\` | Quotes for request | request_id |
| \`update_quote_status\` | Accept/reject quote | quote_id, status |
| \`get_operator\` | Operator profile | operator_id or avinode_operator_id |
| \`list_preferred_operators\` | List partner operators | (optional: region, aircraft_type) |
| \`create_proposal\` | Create proposal doc | request_id, quote_id, title |
| \`get_proposal\` | Get proposal details | proposal_id |

### Gmail Tools (Communication)
| Tool | Purpose | Required Params |
|------|---------|-----------------|
| \`send_email\` | Send general email | to, subject, body |
| \`send_proposal_email\` | Send proposal | proposal_id, to_email, to_name |
| \`send_quote_email\` | Send quotes summary | request_id, quote_ids, to_email, to_name |`;

// =============================================================================
// VALIDATION PATTERNS
// =============================================================================

/**
 * ID format patterns for validation guidance
 */
export const ID_PATTERNS = {
  trip: 'atrip-* or 6-character alphanumeric (e.g., LPZ8VC)',
  rfq: 'arfq-* or 6-character alphanumeric',
  quote: 'aquote-*',
  request: 'UUID format',
  client: 'UUID format',
} as const;

/**
 * Airport code validation pattern
 */
export const ICAO_PATTERN = /^[A-Z]{4}$/;

/**
 * Date format expected by tools
 */
export const DATE_FORMAT = 'YYYY-MM-DD';
