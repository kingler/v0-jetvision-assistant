/**
 * JetvisionAgent Tool Definitions
 *
 * OpenAI function calling definitions for all available tools.
 * Organized by category: Avinode, Database (CRM), Gmail
 */

import type { OpenAIToolDefinition } from './types';

// =============================================================================
// AVINODE TOOLS
// =============================================================================

export const AVINODE_TOOLS: OpenAIToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'create_trip',
      description: 'Create a new trip in Avinode and get a deep link for operator selection. Use this when the user provides complete flight details (airports, date, passengers).',
      parameters: {
        type: 'object',
        properties: {
          departure_airport: {
            type: 'string',
            description: 'ICAO code of departure airport (e.g., KTEB, KJFK)',
          },
          arrival_airport: {
            type: 'string',
            description: 'ICAO code of arrival airport (e.g., KVNY, KLAX)',
          },
          departure_date: {
            type: 'string',
            description: 'Departure date in YYYY-MM-DD format',
          },
          passengers: {
            type: 'number',
            description: 'Number of passengers',
          },
          departure_time: {
            type: 'string',
            description: 'Departure time in HH:MM format (24-hour). Convert user times: "4:00pm" → "16:00", "10am" → "10:00". Default to "10:00" if not specified.',
          },
          return_date: {
            type: 'string',
            description: 'Return date in YYYY-MM-DD format (optional, for round trips)',
          },
          return_time: {
            type: 'string',
            description: 'Return departure time in HH:MM format (optional, for round trips)',
          },
          special_requirements: {
            type: 'string',
            description: 'Any special requirements (pets, catering, etc.)',
          },
        },
        required: ['departure_airport', 'arrival_airport', 'departure_date', 'passengers'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_rfq',
      description: 'Get RFQ details and quotes for a trip. Accepts either an RFQ ID (arfq-*) or Trip ID (atrip-* or 6-char code like LPZ8VC).',
      parameters: {
        type: 'object',
        properties: {
          rfq_id: {
            type: 'string',
            description: 'RFQ ID (arfq-*) or Trip ID (atrip-* or 6-char code)',
          },
        },
        required: ['rfq_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_quote',
      description: 'Get detailed information about a specific quote.',
      parameters: {
        type: 'object',
        properties: {
          quote_id: {
            type: 'string',
            description: 'The quote ID (aquote-*)',
          },
        },
        required: ['quote_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_trip',
      description: 'Cancel an active trip in Avinode.',
      parameters: {
        type: 'object',
        properties: {
          trip_id: {
            type: 'string',
            description: 'The trip ID to cancel',
          },
          reason: {
            type: 'string',
            description: 'Reason for cancellation',
          },
        },
        required: ['trip_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_trip_message',
      description: 'Send a message to operators in an RFQ thread.',
      parameters: {
        type: 'object',
        properties: {
          trip_id: {
            type: 'string',
            description: 'The trip ID',
          },
          rfq_id: {
            type: 'string',
            description: 'The RFQ ID to send message to',
          },
          message: {
            type: 'string',
            description: 'Message content to send',
          },
        },
        required: ['trip_id', 'rfq_id', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_trip_messages',
      description: 'Get message history for a trip or request.',
      parameters: {
        type: 'object',
        properties: {
          trip_id: {
            type: 'string',
            description: 'The trip ID',
          },
          request_id: {
            type: 'string',
            description: 'The request ID (alternative to trip_id)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_airports',
      description: 'Search for airports by code or name.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (airport code, city, or name)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_empty_legs',
      description: 'Search for available empty leg flights (discounted one-way flights).',
      parameters: {
        type: 'object',
        properties: {
          departure_airport: {
            type: 'string',
            description: 'ICAO code of departure airport',
          },
          arrival_airport: {
            type: 'string',
            description: 'ICAO code of arrival airport',
          },
          date_from: {
            type: 'string',
            description: 'Start date for search (YYYY-MM-DD)',
          },
          date_to: {
            type: 'string',
            description: 'End date for search (YYYY-MM-DD)',
          },
        },
        required: [],
      },
    },
  },
];

// =============================================================================
// DATABASE (CRM) TOOLS
// =============================================================================

export const DATABASE_TOOLS: OpenAIToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_client',
      description: 'Look up a client profile by ID or email address.',
      parameters: {
        type: 'object',
        properties: {
          client_id: {
            type: 'string',
            description: 'Client profile UUID',
          },
          email: {
            type: 'string',
            description: 'Client email address',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_clients',
      description: 'List clients for the current ISO agent with optional search.',
      parameters: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description: 'Search by name, company, or email',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results (default 20)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_client',
      description: 'Create a new client profile in the CRM.',
      parameters: {
        type: 'object',
        properties: {
          company_name: {
            type: 'string',
            description: 'Company name',
          },
          contact_name: {
            type: 'string',
            description: 'Primary contact name',
          },
          email: {
            type: 'string',
            description: 'Contact email address',
          },
          phone: {
            type: 'string',
            description: 'Contact phone number',
          },
          notes: {
            type: 'string',
            description: 'Additional notes about the client',
          },
        },
        required: ['company_name', 'contact_name', 'email'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_client',
      description: 'Update an existing client profile.',
      parameters: {
        type: 'object',
        properties: {
          client_id: {
            type: 'string',
            description: 'Client profile UUID',
          },
          company_name: {
            type: 'string',
            description: 'Updated company name',
          },
          contact_name: {
            type: 'string',
            description: 'Updated contact name',
          },
          email: {
            type: 'string',
            description: 'Updated email',
          },
          phone: {
            type: 'string',
            description: 'Updated phone',
          },
          notes: {
            type: 'string',
            description: 'Updated notes',
          },
        },
        required: ['client_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_request',
      description: 'Get details of a flight request including linked quotes.',
      parameters: {
        type: 'object',
        properties: {
          request_id: {
            type: 'string',
            description: 'Request UUID',
          },
        },
        required: ['request_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_requests',
      description: 'List flight requests with optional filters.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filter by status (pending, awaiting_quotes, completed, etc.)',
            enum: ['draft', 'pending', 'awaiting_quotes', 'completed', 'cancelled'],
          },
          client_id: {
            type: 'string',
            description: 'Filter by client ID',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results (default 20)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_quotes',
      description: 'Get all quotes for a flight request.',
      parameters: {
        type: 'object',
        properties: {
          request_id: {
            type: 'string',
            description: 'Request UUID',
          },
        },
        required: ['request_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_quote_status',
      description: 'Update the status of a quote (accept, reject, etc.).',
      parameters: {
        type: 'object',
        properties: {
          quote_id: {
            type: 'string',
            description: 'Quote UUID',
          },
          status: {
            type: 'string',
            description: 'New status',
            enum: ['pending', 'received', 'analyzed', 'accepted', 'rejected', 'expired'],
          },
          notes: {
            type: 'string',
            description: 'Notes about the status change',
          },
        },
        required: ['quote_id', 'status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_operator',
      description: 'Get operator profile by ID.',
      parameters: {
        type: 'object',
        properties: {
          operator_id: {
            type: 'string',
            description: 'Operator profile UUID',
          },
          avinode_operator_id: {
            type: 'string',
            description: 'Avinode operator ID',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_preferred_operators',
      description: 'List preferred partner operators with optional filters.',
      parameters: {
        type: 'object',
        properties: {
          region: {
            type: 'string',
            description: 'Filter by region (e.g., North America, Europe)',
          },
          aircraft_type: {
            type: 'string',
            description: 'Filter by aircraft type capability',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_proposal',
      description: 'Create a proposal document from a quote.',
      parameters: {
        type: 'object',
        properties: {
          request_id: {
            type: 'string',
            description: 'Request UUID',
          },
          quote_id: {
            type: 'string',
            description: 'Quote UUID to base proposal on',
          },
          title: {
            type: 'string',
            description: 'Proposal title',
          },
          margin_applied: {
            type: 'number',
            description: 'Margin percentage to apply',
          },
        },
        required: ['request_id', 'quote_id', 'title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_proposal',
      description: 'Get proposal details.',
      parameters: {
        type: 'object',
        properties: {
          proposal_id: {
            type: 'string',
            description: 'Proposal UUID',
          },
        },
        required: ['proposal_id'],
      },
    },
  },
];

// =============================================================================
// GMAIL TOOLS
// =============================================================================

export const GMAIL_TOOLS: OpenAIToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Send a general email to a recipient.',
      parameters: {
        type: 'object',
        properties: {
          to: {
            type: 'string',
            description: 'Recipient email address',
          },
          subject: {
            type: 'string',
            description: 'Email subject line',
          },
          body: {
            type: 'string',
            description: 'Email body content',
          },
          cc: {
            type: 'string',
            description: 'CC recipients (comma-separated)',
          },
          is_html: {
            type: 'boolean',
            description: 'Whether body is HTML (default false)',
          },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_proposal_email',
      description: 'Send a proposal to a client via email.',
      parameters: {
        type: 'object',
        properties: {
          proposal_id: {
            type: 'string',
            description: 'Proposal UUID to send',
          },
          to_email: {
            type: 'string',
            description: 'Client email address',
          },
          to_name: {
            type: 'string',
            description: 'Client name for personalization',
          },
          custom_message: {
            type: 'string',
            description: 'Custom message to include in email',
          },
        },
        required: ['proposal_id', 'to_email', 'to_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_quote_email',
      description: 'Send quotes summary to a client.',
      parameters: {
        type: 'object',
        properties: {
          request_id: {
            type: 'string',
            description: 'Request UUID',
          },
          quote_ids: {
            type: 'string',
            description: 'Comma-separated quote UUIDs to include',
          },
          to_email: {
            type: 'string',
            description: 'Client email address',
          },
          to_name: {
            type: 'string',
            description: 'Client name',
          },
          custom_message: {
            type: 'string',
            description: 'Custom message',
          },
        },
        required: ['request_id', 'quote_ids', 'to_email', 'to_name'],
      },
    },
  },
];

// =============================================================================
// ALL TOOLS COMBINED
// =============================================================================

export const ALL_TOOLS: OpenAIToolDefinition[] = [
  ...AVINODE_TOOLS,
  ...DATABASE_TOOLS,
  ...GMAIL_TOOLS,
];

// Tool name to category mapping
export const TOOL_CATEGORIES: Record<string, 'avinode' | 'database' | 'gmail'> = {
  // Avinode tools
  create_trip: 'avinode',
  get_rfq: 'avinode',
  get_quote: 'avinode',
  cancel_trip: 'avinode',
  send_trip_message: 'avinode',
  get_trip_messages: 'avinode',
  search_airports: 'avinode',
  search_empty_legs: 'avinode',

  // Database tools
  get_client: 'database',
  list_clients: 'database',
  create_client: 'database',
  update_client: 'database',
  get_request: 'database',
  list_requests: 'database',
  get_quotes: 'database',
  update_quote_status: 'database',
  get_operator: 'database',
  list_preferred_operators: 'database',
  create_proposal: 'database',
  get_proposal: 'database',

  // Gmail tools
  send_email: 'gmail',
  send_proposal_email: 'gmail',
  send_quote_email: 'gmail',
};

// Get tools by category
export function getToolsByCategory(category: 'avinode' | 'database' | 'gmail'): OpenAIToolDefinition[] {
  switch (category) {
    case 'avinode':
      return AVINODE_TOOLS;
    case 'database':
      return DATABASE_TOOLS;
    case 'gmail':
      return GMAIL_TOOLS;
    default:
      return [];
  }
}

// Get tool category
export function getToolCategory(toolName: string): 'avinode' | 'database' | 'gmail' | undefined {
  return TOOL_CATEGORIES[toolName];
}
